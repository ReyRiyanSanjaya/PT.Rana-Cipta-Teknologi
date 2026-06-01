const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./config/database'); // [FIX] Singleton Prisma
const { JWT_SECRET } = require('./config/secrets'); // [FIX] Centralized secret
const { socketCorsOptions } = require('./config/cors'); // [FIX] CORS whitelist

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: socketCorsOptions // [FIX] Whitelist origins
    });

    io.engine.on("connection_error", (err) => {
        console.log("Socket Connection Error:", err.req.url, err.code, err.message, err.context);
    });

    io.use((socket, next) => {
        console.log("Socket Auth Attempt:", socket.id, "Token provided?", !!socket.handshake.auth.token);
        const token = socket.handshake.auth.token;
        if (!token) {
            // Allow guest connections for public real-time data
            console.log("Socket Auth: Guest Connected");
            socket.user = { role: 'GUEST', userId: 'guest_' + socket.id };
            return next();
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET); // [FIX] Use centralized secret
            socket.user = decoded;
            console.log("Socket Auth Success:", socket.user.role, socket.user.userId);
            next();
        } catch (e) {
            console.log("Socket Auth Failed: Invalid Token", e.message);
            // Optionally allow invalid token as guest too? No, better to fail if token is bad.
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.user.role, socket.user.userId);
        (async () => {
            try {
                if (socket.user && socket.user.userId) {
                    const u = await prisma.user.findUnique({
                        where: { id: socket.user.userId },
                        select: { 
                            name: true,
                            store: { select: { name: true } },
                            tenant: { select: { name: true } }
                        }
                    });
                    if (u) {
                        socket.data.userName = u.name;
                        socket.data.storeName = u.store?.name || u.tenant?.name;
                    }
                }
            } catch (_) {}
        })();
        
        if (socket.user.role === 'GUEST') {
            socket.join('public');
        } else {
            if (socket.user?.tenantId) socket.join(`tenant:${socket.user.tenantId}`);
            if (socket.user?.storeId) socket.join(`store:${socket.user.storeId}`);

            // If Admin, also join the System Admin Tenant room to receive system notifications
            if (socket.user.role === 'ADMIN' || socket.user.role === 'SUPER_ADMIN') {
                socket.join('tenant:rana_admin_tenant');
                socket.join('admin:super');
            }

            if (socket.user.role === 'DRIVER') {
                socket.join('driver_zone');
                console.log(`Driver ${socket.user.userId} joined driver_zone`);
            }
        }

        // Join Order Room (for Buyer Tracking)
        socket.on('join_order', (orderId) => {
             socket.join(`order:${orderId}`);
             console.log(`User ${socket.user.userId} joined order order:${orderId}`);
        });

        // Join Ticket Room
        socket.on('join_ticket', (ticketId) => {
            socket.join(ticketId);
            console.log(`User ${socket.user.userId} joined ticket ${ticketId}`);
        });

        // Driver Location Updates
        socket.on('driver_location_update', (data) => {
            // Data format: { lat, lng, bearing, orderId? }
            if (data.orderId) {
                // Emit to the specific buyer's order room so they see the driver moving
                io.to(`order:${data.orderId}`).emit('driver_moved', data);
            }
        });

        // ==================== WebRTC Voice Call Signaling ====================

        // Initiate a call to someone in the same order room
        socket.on('call:offer', (data) => {
            // data: { targetUserId, orderId, offer (SDP), callerName }
            const { targetUserId, orderId, offer, callerName } = data;
            const room = orderId ? `order:${orderId}` : null;
            // Send to specific user or broadcast to order room
            if (room) {
                socket.to(room).emit('call:offer', {
                    callerId: socket.user.userId,
                    callerName: callerName || 'Driver',
                    offer,
                    orderId,
                });
            }
        });

        // Answer a call
        socket.on('call:answer', (data) => {
            // data: { targetUserId, orderId, answer (SDP) }
            const { orderId, answer } = data;
            const room = orderId ? `order:${orderId}` : null;
            if (room) {
                socket.to(room).emit('call:answer', {
                    answererId: socket.user.userId,
                    answer,
                    orderId,
                });
            }
        });

        // ICE candidate exchange
        socket.on('call:ice-candidate', (data) => {
            // data: { orderId, candidate }
            const { orderId, candidate } = data;
            const room = orderId ? `order:${orderId}` : null;
            if (room) {
                socket.to(room).emit('call:ice-candidate', {
                    userId: socket.user.userId,
                    candidate,
                    orderId,
                });
            }
        });

        // End call
        socket.on('call:end', (data) => {
            const { orderId } = data;
            const room = orderId ? `order:${orderId}` : null;
            if (room) {
                socket.to(room).emit('call:end', {
                    userId: socket.user.userId,
                    orderId,
                });
            }
        });

        // Reject call
        socket.on('call:reject', (data) => {
            const { orderId } = data;
            const room = orderId ? `order:${orderId}` : null;
            if (room) {
                socket.to(room).emit('call:reject', {
                    userId: socket.user.userId,
                    orderId,
                });
            }
        });

        // ==================== End WebRTC ====================

        // Typing Indicators
        socket.on('typing', ({ ticketId, isTyping }) => {
            socket.to(ticketId).emit('typing', {
                userId: socket.user.userId,
                role: socket.user.role,
                isTyping
            });
        });

        socket.on('send_message', async ({ ticketId, message }) => {
            try {
                if (!ticketId || !message || typeof message !== 'string' || !message.trim()) {
                    return;
                }

                const where = { id: ticketId };
                if (socket.user.role !== 'ADMIN' && socket.user.tenantId) {
                    where.tenantId = socket.user.tenantId;
                }

                const ticket = await prisma.supportTicket.findFirst({ where });
                if (!ticket) return;

                const isAdmin = socket.user.role === 'ADMIN';
                const senderType = isAdmin ? 'ADMIN' : 'MERCHANT';

                const newMessage = await prisma.ticketMessage.create({
                    data: {
                        ticketId,
                        message: message.trim(),
                        senderId: socket.user.userId,
                        senderType,
                        isAdmin
                    }
                });

                if (!isAdmin && ticket.status === 'RESOLVED') {
                    await prisma.supportTicket.update({
                        where: { id: ticketId },
                        data: { status: 'OPEN' }
                    });
                }

                io.to(ticketId).emit('new_message', newMessage);
            } catch (e) {
                console.error('send_message error', e);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
    registerChatEvents();
};

// Chat rooms support
// Users can join a chat room and receive real-time events
// Room naming convention: chat:<roomId>
const registerChatEvents = () => {
    if (!io) return;
    io.on('connection', (socket) => {
        socket.on('join_chat_room', (roomId) => {
            if (!roomId) return;
            socket.join(`chat:${roomId}`);
            setJoin(socket, roomId);
        });
        socket.on('chat:typing', ({ roomId, isTyping }) => {
            if (!roomId) return;
            socket.to(`chat:${roomId}`).emit('chat:typing', {
                userId: socket.user.userId,
                isTyping: !!isTyping
            });
        });
        socket.on('leave_chat_room', (roomId) => {
            if (!roomId) return;
            socket.leave(`chat:${roomId}`);
            setLeave(socket, roomId);
        });
        socket.on('disconnect', () => {
            if (socket.data.chatRooms) {
                for (const roomId of socket.data.chatRooms) {
                    setLeave(socket, roomId);
                }
            }
        });
    });
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

const emitToTenant = (tenantId, event, payload) => {
    try {
        if (!io) return;
        io.to(`tenant:${tenantId}`).emit(event, payload);
    } catch (e) {
        console.error("emitToTenant failed", e);
    }
};

const emitToOrder = (orderId, event, data) => {
    if (io) {
        io.to(`order:${orderId}`).emit(event, data);
    }
};

const emitToAdmin = (event, data) => {
    if (io) {
        io.to('admin:super').emit(event, data);
    }
};

const emitPublic = (event, data) => {
    if (io) {
        io.to('public').emit(event, data);
    }
};

const emitChatMessage = (roomId, message) => {
    if (io && roomId) {
        io.to(`chat:${roomId}`).emit('chat:new_message', message);
    }
};
const chatPresence = new Map();
const chatMembers = new Map();
const getCount = (roomId) => {
    const set = chatPresence.get(roomId);
    return set ? set.size : 0;
};
const setJoin = (socket, roomId) => {
    let set = chatPresence.get(roomId);
    if (!set) {
        set = new Set();
        chatPresence.set(roomId, set);
    }
    set.add(socket.id);
    let members = chatMembers.get(roomId);
    if (!members) {
        members = new Map();
        chatMembers.set(roomId, members);
    }
    members.set(socket.id, {
        userId: socket.user.userId,
        role: socket.user.role,
        name: socket.data.userName || null,
        storeName: socket.data.storeName || null
    });
    socket.data.chatRooms = socket.data.chatRooms || new Set();
    socket.data.chatRooms.add(roomId);
    io.to(`chat:${roomId}`).emit('chat:online_count', { roomId, count: set.size });
    const list = Array.from(members.values());
    io.to(`chat:${roomId}`).emit('chat:online_members', { roomId, members: list, count: set.size });
};
const setLeave = (socket, roomId) => {
    const set = chatPresence.get(roomId);
    if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
            chatPresence.delete(roomId);
        }
        io.to(`chat:${roomId}`).emit('chat:online_count', { roomId, count: set.size });
    }
    const members = chatMembers.get(roomId);
    if (members) {
        members.delete(socket.id);
        if (members.size === 0) {
            chatMembers.delete(roomId);
        }
        const list = Array.from(members.values());
        io.to(`chat:${roomId}`).emit('chat:online_members', { roomId, members: list, count: set ? set.size : 0 });
    }
    if (socket.data.chatRooms) {
        socket.data.chatRooms.delete(roomId);
    }
};

const getRoomStats = (roomId) => {
    const set = chatPresence.get(roomId);
    return {
        count: set ? set.size : 0
    };
};

module.exports = { initSocket, getIo, emitToTenant, emitToOrder, emitToAdmin, emitPublic, emitChatMessage, getRoomStats };
