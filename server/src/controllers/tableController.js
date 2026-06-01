const prisma = require('../config/database');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/response');
const { emitToTenant } = require('../socket');

// ==================== TABLE MANAGEMENT (Merchant) ====================

// Get all tables for a store
exports.getTables = async (req, res) => {
    try {
        const { storeId } = req.user;
        const tables = await prisma.dineTable.findMany({
            where: { storeId, isActive: true },
            orderBy: { number: 'asc' },
            include: {
                sessions: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                    include: { orders: { where: { status: { not: 'CANCELLED' } } } }
                }
            }
        });
        return successResponse(res, tables);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch tables', 500, error);
    }
};

// Create a new table
exports.createTable = async (req, res) => {
    try {
        const { storeId } = req.user;
        const { number, name, capacity } = req.body;

        if (!number) return errorResponse(res, 'Table number is required', 400);

        const qrCode = `TABLE_${storeId}_${number}_${crypto.randomBytes(4).toString('hex')}`;

        const table = await prisma.dineTable.create({
            data: {
                storeId,
                number: parseInt(number),
                name: name || null,
                capacity: parseInt(capacity) || 4,
                qrCode,
            }
        });

        return successResponse(res, table, 'Table created');
    } catch (error) {
        if (error.code === 'P2002') return errorResponse(res, 'Table number already exists', 400);
        return errorResponse(res, 'Failed to create table', 500, error);
    }
};

// Update table
exports.updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, status, isActive } = req.body;

        const table = await prisma.dineTable.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(capacity && { capacity: parseInt(capacity) }),
                ...(status && { status }),
                ...(isActive !== undefined && { isActive }),
            }
        });

        return successResponse(res, table, 'Table updated');
    } catch (error) {
        return errorResponse(res, 'Failed to update table', 500, error);
    }
};

// Delete table
exports.deleteTable = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.dineTable.update({ where: { id }, data: { isActive: false } });
        return successResponse(res, null, 'Table deleted');
    } catch (error) {
        return errorResponse(res, 'Failed to delete table', 500, error);
    }
};

// ==================== TABLE SESSION (Merchant) ====================

// Open a session (seat guests)
exports.openSession = async (req, res) => {
    try {
        const { storeId } = req.user;
        const { tableId, guestName, guestCount } = req.body;

        // Check table is available
        const table = await prisma.dineTable.findUnique({ where: { id: tableId } });
        if (!table) return errorResponse(res, 'Table not found', 404);
        if (table.status !== 'AVAILABLE') return errorResponse(res, 'Table is not available', 400);

        const session = await prisma.$transaction(async (tx) => {
            // Mark table as occupied
            await tx.dineTable.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });

            // Create session
            return tx.tableSession.create({
                data: {
                    tableId,
                    storeId,
                    guestName: guestName || null,
                    guestCount: parseInt(guestCount) || 1,
                }
            });
        });

        emitToTenant(req.user.tenantId, 'table:session_opened', { tableId, session });
        return successResponse(res, session, 'Session opened');
    } catch (error) {
        return errorResponse(res, 'Failed to open session', 500, error);
    }
};

// Close session (bill paid)
exports.closeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.tableSession.findUnique({
            where: { id: sessionId },
            include: { orders: { where: { status: { not: 'CANCELLED' } } } }
        });
        if (!session) return errorResponse(res, 'Session not found', 404);

        const totalAmount = session.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0);

        await prisma.$transaction(async (tx) => {
            await tx.tableSession.update({
                where: { id: sessionId },
                data: { status: 'CLOSED', closedAt: new Date(), totalAmount }
            });
            await tx.dineTable.update({ where: { id: session.tableId }, data: { status: 'AVAILABLE' } });
        });

        emitToTenant(req.user.tenantId, 'table:session_closed', { tableId: session.tableId, sessionId });
        return successResponse(res, { totalAmount }, 'Session closed');
    } catch (error) {
        return errorResponse(res, 'Failed to close session', 500, error);
    }
};

// Get active session for a table
exports.getActiveSession = async (req, res) => {
    try {
        const { tableId } = req.params;
        const session = await prisma.tableSession.findFirst({
            where: { tableId, status: { not: 'CLOSED' } },
            include: { orders: { orderBy: { orderedAt: 'desc' } } }
        });
        return successResponse(res, session);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch session', 500, error);
    }
};

// ==================== TABLE ORDER (Customer via QR) ====================

// Customer scans QR → get table info + menu
exports.getTableByQR = async (req, res) => {
    try {
        const { qrCode } = req.params;

        const table = await prisma.dineTable.findUnique({
            where: { qrCode },
            include: {
                store: { select: { id: true, name: true, category: true, imageUrl: true } },
                sessions: { where: { status: 'ACTIVE' }, take: 1 }
            }
        });

        if (!table) return errorResponse(res, 'Table not found', 404);
        if (!table.isActive) return errorResponse(res, 'Table is inactive', 400);

        // Get store products (menu)
        const products = await prisma.product.findMany({
            where: { storeId: table.storeId, isActive: true },
            include: { category: { select: { name: true } } },
            orderBy: { name: 'asc' }
        });

        return successResponse(res, {
            table: { id: table.id, number: table.number, name: table.name, status: table.status },
            store: table.store,
            session: table.sessions[0] || null,
            menu: products,
        });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch table', 500, error);
    }
};

// Customer places order from table (no auth required — QR is the auth)
exports.placeTableOrder = async (req, res) => {
    try {
        const { qrCode } = req.params;
        const { items, guestName } = req.body;
        // items: [{ productId, productName, quantity, price, notes }]

        if (!items || items.length === 0) return errorResponse(res, 'No items', 400);

        const table = await prisma.dineTable.findUnique({ where: { qrCode } });
        if (!table) return errorResponse(res, 'Table not found', 404);

        // Get or create active session
        let session = await prisma.tableSession.findFirst({
            where: { tableId: table.id, status: 'ACTIVE' }
        });

        if (!session) {
            // Auto-create session when customer orders
            session = await prisma.tableSession.create({
                data: {
                    tableId: table.id,
                    storeId: table.storeId,
                    guestName: guestName || null,
                    guestCount: 1,
                }
            });
            // Mark table as occupied
            await prisma.dineTable.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
        }

        // Create orders
        const orders = await prisma.tableOrder.createMany({
            data: items.map(item => ({
                sessionId: session.id,
                storeId: table.storeId,
                productId: item.productId,
                productName: item.productName || item.name || 'Item',
                quantity: parseInt(item.quantity) || 1,
                price: parseFloat(item.price) || 0,
                notes: item.notes || null,
            }))
        });

        // Fetch created orders
        const createdOrders = await prisma.tableOrder.findMany({
            where: { sessionId: session.id, status: 'PENDING' },
            orderBy: { orderedAt: 'desc' },
            take: items.length,
        });

        // Get store's tenantId for socket emit
        const store = await prisma.store.findUnique({ where: { id: table.storeId }, select: { tenantId: true } });

        // Notify merchant in real-time
        if (store) {
            emitToTenant(store.tenantId, 'table:new_order', {
                tableId: table.id,
                tableNumber: table.number,
                tableName: table.name,
                sessionId: session.id,
                orders: createdOrders,
                guestName: session.guestName,
            });
        }

        return successResponse(res, { sessionId: session.id, orders: createdOrders }, 'Order placed');
    } catch (error) {
        return errorResponse(res, 'Failed to place order', 500, error);
    }
};

// ==================== KITCHEN DISPLAY (Merchant) ====================

// Get pending orders for kitchen
exports.getKitchenOrders = async (req, res) => {
    try {
        const { storeId } = req.user;

        const orders = await prisma.tableOrder.findMany({
            where: { storeId, status: { in: ['PENDING', 'PREPARING'] } },
            include: {
                session: {
                    include: { table: { select: { number: true, name: true } } }
                }
            },
            orderBy: { orderedAt: 'asc' }
        });

        return successResponse(res, orders);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch kitchen orders', 500, error);
    }
};

// Update order status (kitchen marks as preparing/served)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const data = { status };
        if (status === 'SERVED') data.preparedAt = new Date();

        const order = await prisma.tableOrder.update({
            where: { id: orderId },
            data,
            include: { session: { include: { table: { select: { number: true, name: true } } } } }
        });

        // Notify merchant UI
        const store = await prisma.store.findFirst({ where: { id: order.storeId }, select: { tenantId: true } });
        if (store) {
            emitToTenant(store.tenantId, 'table:order_updated', {
                orderId: order.id,
                status: order.status,
                tableNumber: order.session.table.number,
            });
        }

        return successResponse(res, order, `Order ${status}`);
    } catch (error) {
        return errorResponse(res, 'Failed to update order', 500, error);
    }
};

// Request bill (customer)
exports.requestBill = async (req, res) => {
    try {
        const { qrCode } = req.params;

        const table = await prisma.dineTable.findUnique({ where: { qrCode } });
        if (!table) return errorResponse(res, 'Table not found', 404);

        const session = await prisma.tableSession.findFirst({
            where: { tableId: table.id, status: 'ACTIVE' }
        });
        if (!session) return errorResponse(res, 'No active session', 400);

        await prisma.tableSession.update({
            where: { id: session.id },
            data: { status: 'REQUESTING_BILL' }
        });

        const store = await prisma.store.findUnique({ where: { id: table.storeId }, select: { tenantId: true } });
        if (store) {
            emitToTenant(store.tenantId, 'table:bill_requested', {
                tableId: table.id,
                tableNumber: table.number,
                sessionId: session.id,
            });
        }

        return successResponse(res, null, 'Bill requested');
    } catch (error) {
        return errorResponse(res, 'Failed to request bill', 500, error);
    }
};


// ==================== PAYMENT MANAGEMENT ====================

// Merchant/Admin: Process payment for a session
exports.processPayment = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { paymentMethod, paidAmount } = req.body;

        const session = await prisma.tableSession.findUnique({
            where: { id: sessionId },
            include: {
                orders: { where: { status: { not: 'CANCELLED' } } },
                table: { include: { store: true } }
            }
        });
        if (!session) return errorResponse(res, 'Session not found', 404);

        const totalAmount = session.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
        const paid = parseFloat(paidAmount) || totalAmount;
        const store = session.table.store;

        // Transaction: update session + create Transaction record + free table
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update session
            const updated = await tx.tableSession.update({
                where: { id: sessionId },
                data: {
                    paymentStatus: 'PAID',
                    paymentMethod: paymentMethod || 'CASH',
                    paidAmount: paid,
                    totalAmount,
                    status: 'CLOSED',
                    closedAt: new Date(),
                }
            });

            // 2. Free the table
            await tx.dineTable.update({ where: { id: session.tableId }, data: { status: 'AVAILABLE' } });

            // 3. Credit store balance
            await tx.store.update({ where: { id: store.id }, data: { balance: { increment: totalAmount } } });

            // 4. Create Transaction record (so it appears in merchant's order history & reports)
            const transaction = await tx.transaction.create({
                data: {
                    tenantId: store.tenantId,
                    storeId: store.id,
                    totalAmount,
                    amountPaid: paid,
                    change: paid - totalAmount > 0 ? paid - totalAmount : 0,
                    paymentMethod: paymentMethod || 'CASH',
                    orderStatus: 'COMPLETED',
                    paymentStatus: 'PAID',
                    source: 'DINE_IN',
                    customerName: session.guestName || `Meja ${session.table.number}`,
                    notes: `Dine-in Meja ${session.table.number}${session.table.name ? ' (' + session.table.name + ')' : ''}`,
                    occurredAt: new Date(),
                    transactionItems: {
                        create: session.orders.map(o => ({
                            productId: o.productId,
                            quantity: o.quantity,
                            price: o.price,
                            productName: o.productName,
                        }))
                    }
                }
            });

            return { updated, transaction };
        });

        // Notify merchant
        emitToTenant(store.tenantId, 'table:payment_completed', {
            sessionId,
            tableId: session.tableId,
            tableNumber: session.table.number,
            totalAmount,
            paymentMethod,
            transactionId: result.transaction.id,
        });

        // Also emit as regular transaction so it shows in order list
        emitToTenant(store.tenantId, 'transactions:created', result.transaction);

        return successResponse(res, result.updated, 'Payment processed');
    } catch (error) {
        console.error('Process Payment Error:', error);
        return errorResponse(res, 'Failed to process payment', 500, error);
    }
};

// Merchant/Admin: Get all unpaid sessions
exports.getUnpaidSessions = async (req, res) => {
    try {
        const { storeId } = req.user;
        const sessions = await prisma.tableSession.findMany({
            where: { storeId, paymentStatus: { in: ['UNPAID', 'PENDING_VERIFICATION'] }, status: { not: 'CLOSED' } },
            include: {
                table: { select: { number: true, name: true } },
                orders: { where: { status: { not: 'CANCELLED' } } }
            },
            orderBy: { startedAt: 'desc' }
        });

        // Calculate totals
        const result = sessions.map(s => ({
            ...s,
            calculatedTotal: s.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0),
        }));

        return successResponse(res, result);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch unpaid sessions', 500, error);
    }
};

// Customer: Mark payment as pending (e.g., after QRIS/transfer)
exports.markPaymentPending = async (req, res) => {
    try {
        const { qrCode } = req.params;
        const { paymentMethod } = req.body;

        const table = await prisma.dineTable.findUnique({ where: { qrCode } });
        if (!table) return errorResponse(res, 'Table not found', 404);

        const session = await prisma.tableSession.findFirst({
            where: { tableId: table.id, status: { not: 'CLOSED' } }
        });
        if (!session) return errorResponse(res, 'No active session', 400);

        await prisma.tableSession.update({
            where: { id: session.id },
            data: { paymentStatus: 'PENDING_VERIFICATION', paymentMethod: paymentMethod || 'QRIS' }
        });

        // Notify merchant
        const store = await prisma.store.findUnique({ where: { id: table.storeId }, select: { tenantId: true } });
        if (store) {
            emitToTenant(store.tenantId, 'table:payment_pending', {
                tableId: table.id,
                tableNumber: table.number,
                sessionId: session.id,
                paymentMethod: paymentMethod || 'QRIS',
            });
        }

        return successResponse(res, null, 'Payment marked as pending verification');
    } catch (error) {
        return errorResponse(res, 'Failed to mark payment', 500, error);
    }
};

// Admin: Get all table sessions with payment info (for admin panel)
exports.getAllSessions = async (req, res) => {
    try {
        const { storeId, status, paymentStatus, page = 1, limit = 20 } = req.query;
        const where = {};
        if (storeId) where.storeId = storeId;
        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [sessions, total] = await Promise.all([
            prisma.tableSession.findMany({
                where,
                include: {
                    table: { select: { number: true, name: true, store: { select: { name: true } } } },
                    orders: true,
                },
                orderBy: { startedAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.tableSession.count({ where })
        ]);

        return successResponse(res, { sessions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch sessions', 500, error);
    }
};
