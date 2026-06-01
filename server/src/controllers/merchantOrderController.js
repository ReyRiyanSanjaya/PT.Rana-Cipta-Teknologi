const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');
const { emitToTenant, emitToOrder } = require('../socket');
const { getCategoryConfig, getStatusLabel } = require('../utils/merchantCategory');

// MERCHANT: Get Incoming Orders
const getIncomingOrders = async (req, res) => {
    try {
        const { storeId } = req.user;
        const orders = await prisma.transaction.findMany({
            where: {
                storeId: storeId,
                source: 'MARKET',
                // orderStatus: { in: ['PENDING', 'ACCEPTED', 'READY'] }
            },
            include: { transactionItems: { include: { product: true } } },
            orderBy: { occurredAt: 'desc' }
        });
        return successResponse(res, orders);
    } catch (error) {
        return errorResponse(res, "Fetch Error", 500);
    }
};

// MERCHANT: Update Status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await prisma.transaction.update({
            where: { id: orderId },
            data: { orderStatus: status },
            include: { store: { select: { name: true, location: true, latitude: true, longitude: true } } }
        });

        try {
            emitToTenant(order.tenantId, 'orders:updated', order);
            // Notify Buyer with category-aware status label
            const storeCategory = order.store?.category || 'Lainnya';
            const categoryConfig = getCategoryConfig(storeCategory);
            const statusLabel = getStatusLabel(storeCategory, status);
            emitToOrder(order.id, 'order_status', {
                ...order,
                statusLabel,
                categoryType: categoryConfig.type,
                categoryIcon: categoryConfig.icon,
                estimatedPrepTime: categoryConfig.estimatedPrepTime,
            });
        } catch (e) {
            console.error('Socket emit failed', e);
        }

        // If order is READY and fulfillment is DELIVERY, auto-dispatch a driver
        if (status === 'READY' && order.fulfillmentType === 'DELIVERY') {
            try {
                const { getIo } = require('../socket');
                const io = getIo();

                // Create a ServiceRequest for the driver
                const serviceRequest = await prisma.serviceRequest.create({
                    data: {
                        type: 'FOOD',
                        customerId: order.customerPhone || 'buyer',
                        originLat: order.store?.latitude || -6.2,
                        originLng: order.store?.longitude || 106.8,
                        originAddress: order.store?.name || 'Toko',
                        destLat: -6.2, // TODO: geocode deliveryAddress
                        destLng: 106.8,
                        destAddress: order.deliveryAddress || '-',
                        price: order.deliveryFee || 10000,
                        paymentMethod: 'CASH',
                        notes: `Market Order: ${order.id}`,
                        transactionId: order.id,
                    }
                });

                // Dispatch to drivers
                io.to('driver_zone').emit('new_order_driver', {
                    id: serviceRequest.id,
                    type: 'FOOD',
                    customerId: serviceRequest.customerId,
                    origin: serviceRequest.originAddress,
                    originAddress: serviceRequest.originAddress,
                    originLat: serviceRequest.originLat,
                    originLng: serviceRequest.originLng,
                    destination: serviceRequest.destAddress,
                    destAddress: serviceRequest.destAddress,
                    destLat: serviceRequest.destLat,
                    destLng: serviceRequest.destLng,
                    price: serviceRequest.price,
                    status: 'SEARCHING',
                    customer: order.customerName || 'Pelanggan',
                    rating: 4.8,
                    timeLeft: 30,
                });

                // Update order status to ON_DELIVERY
                await prisma.transaction.update({
                    where: { id: orderId },
                    data: { orderStatus: 'ON_DELIVERY' }
                });

                emitToOrder(order.id, 'order_status', { ...order, orderStatus: 'ON_DELIVERY', serviceRequestId: serviceRequest.id });
            } catch (e) {
                console.error('Driver dispatch failed:', e.message);
            }
        }

        return successResponse(res, order, `Order ${status}`);
    } catch (error) {
        return errorResponse(res, "Update Error", 500);
    }
};

// [NEW] Scan QR & Complete Order
const scanQrOrder = async (req, res) => {
    try {
        const { storeId } = req.user;
        const { pickupCode } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Find Order
            const order = await tx.transaction.findFirst({
                where: { pickupCode: pickupCode, storeId: storeId }
            });

            if (!order) throw new Error("Order Not Found or Invalid Code");
            if (order.orderStatus === 'COMPLETED') throw new Error("Order Already Completed");
            // if (order.paymentStatus !== 'PAID') throw new Error("Order Not Paid");

            // 2. Mark Completed
            const updatedOrder = await tx.transaction.update({
                where: { id: order.id },
                data: { orderStatus: 'COMPLETED' }
            });

            // 3. Credit Balance
            await tx.store.update({
                where: { id: storeId },
                data: { balance: { increment: order.totalAmount } }
            });
            
            try {
                // Notify Buyer of Completion
                const { emitToOrder } = require('../socket');
                emitToOrder(order.id, 'order_status', updatedOrder);
            } catch(e) {}

            return updatedOrder;
        });

        return successResponse(res, result, "Order Verified & Balance Credited");

    } catch (error) {
        console.error("Scan Error", error);
        return errorResponse(res, error.message || "Scan Failed", 400);
    }
};

module.exports = { getIncomingOrders, updateOrderStatus, scanQrOrder };
