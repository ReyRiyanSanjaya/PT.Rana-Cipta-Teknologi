const prisma = require('../../config/database'); // [FIX] Singleton Prisma
const { emitChatMessage } = require('../../socket');

exports.listRooms = async (req, res) => {
    try {
        const rooms = await prisma.chatRoom.findMany({
            include: {
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                _count: { select: { members: true, messages: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const formatted = rooms.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            icon: r.icon,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            lastMessage: r.messages[0] || null,
            membersCount: r._count.members,
            messagesCount: r._count.messages
        }));
        res.json(formatted);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
};

exports.createRoom = async (req, res) => {
    try {
        const { name, type, icon, memberIds } = req.body;
        const room = await prisma.chatRoom.create({
            data: {
                name,
                type: type || 'public',
                icon: icon || null,
                members: memberIds && Array.isArray(memberIds) && memberIds.length > 0
                    ? { create: memberIds.map(id => ({ userId: id })) }
                    : undefined
            }
        });
        res.status(201).json(room);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create room' });
    }
};

exports.updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, icon } = req.body;
        const room = await prisma.chatRoom.update({
            where: { id },
            data: {
                name: name ?? undefined,
                type: type ?? undefined,
                icon: icon ?? undefined
            }
        });
        res.json(room);
    } catch (e) {
        res.status(500).json({ error: 'Failed to update room' });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.chatMessage.deleteMany({ where: { roomId: id } });
        await prisma.chatMember.deleteMany({ where: { roomId: id } });
        await prisma.chatRoom.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete room' });
    }
};

exports.getRoomMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const members = await prisma.chatMember.findMany({
            where: { roomId: id },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { joinedAt: 'asc' }
        });
        res.json(members.map(m => ({ id: m.id, userId: m.userId, name: m.user?.name || null, joinedAt: m.joinedAt })));
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const existing = await prisma.chatMember.findFirst({ where: { roomId: id, userId } });
        if (existing) return res.json(existing);
        const m = await prisma.chatMember.create({ data: { roomId: id, userId } });
        res.status(201).json(m);
    } catch (e) {
        res.status(500).json({ error: 'Failed to add member' });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { id, userId } = req.params;
        await prisma.chatMember.deleteMany({ where: { roomId: id, userId } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to remove member' });
    }
};

exports.getRoomMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const messages = await prisma.chatMessage.findMany({
            where: { roomId: id },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, name: true } } }
        });
        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const senderId = req.user?.id || 'ADMIN';
        const senderName = req.user?.name || 'Admin';
        const msg = await prisma.chatMessage.create({
            data: {
                roomId: id,
                userId: senderId,
                userName: senderName,
                content
            },
            include: { user: { select: { id: true, name: true } } }
        });
        emitChatMessage(id, msg);
        res.status(201).json(msg);
    } catch (e) {
        res.status(500).json({ error: 'Failed to send message' });
    }
};

exports.broadcastMessages = async (req, res) => {
    try {
        const { roomIds, content } = req.body;
        if (!Array.isArray(roomIds) || roomIds.length === 0) {
            return res.status(400).json({ error: 'roomIds required' });
        }
        const senderId = req.user?.id || 'ADMIN';
        const senderName = req.user?.name || 'Admin';
        const created = [];
        for (const roomId of roomIds) {
            const msg = await prisma.chatMessage.create({
                data: {
                    roomId,
                    userId: senderId,
                    userName: senderName,
                    content
                }
            });
            created.push(msg);
            emitChatMessage(roomId, msg);
        }
        res.status(201).json({ success: true, count: created.length });
    } catch (e) {
        res.status(500).json({ error: 'Failed to broadcast messages' });
    }
};
