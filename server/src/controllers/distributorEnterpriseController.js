const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { distributor: true } });
    return user?.distributor?.id;
};

// =======================
// 1. PIUTANG (ACCOUNTS RECEIVABLE)
// =======================

const getReceivables = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { status } = req.query; // 'overdue', 'pending', 'paid'

        // Get all orders with UNPAID/PARTIAL payment from customers
        const where = { distributorId };
        if (status === 'overdue') {
            where.paymentStatus = 'UNPAID';
            where.createdAt = { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; // > 30 days
        } else if (status === 'pending') {
            where.paymentStatus = { in: ['UNPAID', 'PARTIAL'] };
        } else if (status === 'paid') {
            where.paymentStatus = 'PAID';
        } else {
            where.paymentStatus = { in: ['UNPAID', 'PARTIAL'] };
        }

        const orders = await prisma.wholesaleOrder.findMany({
            where,
            include: {
                tenant: { select: { name: true, users: { select: { name: true, email: true }, take: 1 } } },
                items: { select: { quantity: true, subtotal: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Get customer credit data
        const customers = await prisma.distributorCustomer.findMany({
            where: { distributorId },
            include: { tenant: { select: { name: true } } }
        });
        const creditMap = new Map(customers.map(c => [c.tenantId, c]));

        const receivables = orders.map(o => {
            const credit = creditMap.get(o.tenantId);
            const daysSinceOrder = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const paymentTerm = credit?.paymentTerm || 30;
            const isOverdue = daysSinceOrder > paymentTerm;

            return {
                id: o.id,
                orderNumber: o.orderNumber,
                customerName: o.tenant?.name || 'Unknown',
                contactName: o.tenant?.users?.[0]?.name || '-',
                amount: o.totalAmount,
                paymentStatus: o.paymentStatus,
                paymentMethod: o.paymentMethod,
                orderDate: o.createdAt,
                daysSinceOrder,
                paymentTerm,
                isOverdue,
                daysOverdue: isOverdue ? daysSinceOrder - paymentTerm : 0,
                creditLimit: credit?.creditLimit || 0,
                creditUsed: credit?.creditUsed || 0,
            };
        });

        // Summary
        const totalReceivable = receivables.reduce((s, r) => s + r.amount, 0);
        const overdueAmount = receivables.filter(r => r.isOverdue).reduce((s, r) => s + r.amount, 0);
        const overdueCount = receivables.filter(r => r.isOverdue).length;

        return successResponse(res, {
            receivables,
            summary: { totalReceivable, overdueAmount, overdueCount, totalInvoices: receivables.length }
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch receivables", 500, error);
    }
};

const markAsPaid = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { orderId } = req.params;
        const { amount, paymentMethod, notes } = req.body;

        const order = await prisma.wholesaleOrder.findFirst({ where: { id: orderId, distributorId } });
        if (!order) return errorResponse(res, "Order not found", 404);

        await prisma.wholesaleOrder.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PAID',
                paymentDetails: { paidAt: new Date(), amount: amount || order.totalAmount, method: paymentMethod || 'TRANSFER', notes }
            }
        });

        // Update credit used
        const relation = await prisma.distributorCustomer.findFirst({
            where: { distributorId, tenantId: order.tenantId }
        });
        if (relation && relation.creditUsed > 0) {
            await prisma.distributorCustomer.update({
                where: { id: relation.id },
                data: { creditUsed: Math.max(0, relation.creditUsed - order.totalAmount) }
            });
        }

        return successResponse(res, null, "Payment recorded");
    } catch (error) {
        return errorResponse(res, "Failed to record payment", 500, error);
    }
};

// =======================
// 2. NOTIFICATIONS
// =======================

const getNotifications = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const notifications = await prisma.notification.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        const unreadCount = notifications.filter(n => !n.isRead).length;
        return successResponse(res, { notifications, unreadCount });
    } catch (error) {
        return errorResponse(res, "Failed to fetch notifications", 500, error);
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.notification.update({ where: { id }, data: { isRead: true } });
        return successResponse(res, null, "Marked as read");
    } catch (error) {
        return errorResponse(res, "Failed", 500, error);
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        const { tenantId } = req.user;
        await prisma.notification.updateMany({ where: { tenantId, isRead: false }, data: { isRead: true } });
        return successResponse(res, null, "All marked as read");
    } catch (error) {
        return errorResponse(res, "Failed", 500, error);
    }
};

const sendNotificationToMerchant = async (req, res) => {
    try {
        const { tenantId, title, body } = req.body;
        if (!tenantId || !title || !body) return errorResponse(res, "tenantId, title, body required", 400);

        const notification = await prisma.notification.create({
            data: { tenantId, title, body }
        });
        return successResponse(res, notification, "Notification sent", 201);
    } catch (error) {
        return errorResponse(res, "Failed to send notification", 500, error);
    }
};

// =======================
// 3. KATALOG / STOREFRONT
// =======================

const getStorefront = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { companyName: true, npwp: true }
        });

        const products = await prisma.wholesaleProduct.findMany({
            where: { distributorId, isActive: true },
            include: { wholesaleCategory: { select: { name: true } } },
            orderBy: { name: 'asc' }
        });

        const categories = await prisma.wholesaleCategory.findMany({ orderBy: { name: 'asc' } });

        // Stats
        const totalProducts = products.length;
        const totalCategories = new Set(products.map(p => p.wholesaleCategoryId).filter(Boolean)).size;
        const inStock = products.filter(p => p.stockQuantity > 0).length;

        return successResponse(res, {
            store: { name: distributor?.companyName, distributorId },
            products,
            categories,
            stats: { totalProducts, totalCategories, inStock, outOfStock: totalProducts - inStock }
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch storefront", 500, error);
    }
};

// =======================
// 4. RETUR & KLAIM
// =======================

const getReturns = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        // Returns are tracked as CANCELLED orders or orders with REFUNDED payment
        const returns = await prisma.wholesaleOrder.findMany({
            where: {
                distributorId,
                OR: [
                    { status: 'CANCELLED', paymentStatus: 'PAID' }, // Paid then cancelled = refund needed
                    { paymentStatus: 'REFUNDED' }
                ]
            },
            include: {
                tenant: { select: { name: true } },
                items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const formatted = returns.map(r => ({
            id: r.id,
            orderNumber: r.orderNumber,
            customerName: r.tenant?.name || 'Unknown',
            amount: r.totalAmount,
            status: r.paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING_REFUND',
            items: r.items.map(i => ({ name: i.wholesaleProduct?.name, qty: i.quantity, unit: i.wholesaleProduct?.unit })),
            date: r.updatedAt
        }));

        const totalRefunded = formatted.filter(r => r.status === 'REFUNDED').reduce((s, r) => s + r.amount, 0);
        const pendingRefund = formatted.filter(r => r.status === 'PENDING_REFUND').reduce((s, r) => s + r.amount, 0);

        return successResponse(res, {
            returns: formatted,
            summary: { total: formatted.length, totalRefunded, pendingRefund }
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch returns", 500, error);
    }
};

const processReturn = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { orderId } = req.params;
        const { action } = req.body; // 'refund' or 'restock'

        const order = await prisma.wholesaleOrder.findFirst({
            where: { id: orderId, distributorId },
            include: { items: true }
        });
        if (!order) return errorResponse(res, "Order not found", 404);

        if (action === 'refund') {
            await prisma.wholesaleOrder.update({
                where: { id: orderId },
                data: { paymentStatus: 'REFUNDED' }
            });
        }

        // Restock items
        if (action === 'restock' || action === 'refund') {
            for (const item of order.items) {
                await prisma.wholesaleProduct.update({
                    where: { id: item.wholesaleProductId },
                    data: { stockQuantity: { increment: item.quantity } }
                });
            }
        }

        return successResponse(res, null, `Return processed: ${action}`);
    } catch (error) {
        return errorResponse(res, "Failed to process return", 500, error);
    }
};

// =======================
// 5. TARGET & KPI SALES
// =======================

const getSalesKPI = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // This month metrics
        const [thisMonthOrders, thisMonthRevenue, newCustomers, repeatCustomers] = await Promise.all([
            prisma.wholesaleOrder.count({ where: { distributorId, createdAt: { gte: thisMonthStart }, status: { not: 'CANCELLED' } } }),
            prisma.wholesaleOrder.aggregate({ where: { distributorId, createdAt: { gte: thisMonthStart }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
            prisma.distributorCustomer.count({ where: { distributorId, createdAt: { gte: thisMonthStart } } }),
            prisma.wholesaleOrder.groupBy({ by: ['tenantId'], where: { distributorId, createdAt: { gte: thisMonthStart }, status: { not: 'CANCELLED' } }, _count: true }).then(r => r.filter(g => g._count > 1).length)
        ]);

        // Last month for comparison
        const [lastMonthOrderCount, lastMonthRevenueAgg] = await Promise.all([
            prisma.wholesaleOrder.count({ where: { distributorId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: 'CANCELLED' } } }),
            prisma.wholesaleOrder.aggregate({ where: { distributorId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } })
        ]);

        const revenue = thisMonthRevenue._sum.totalAmount || 0;
        const lastRevenue = lastMonthRevenueAgg._sum.totalAmount || 0;

        // Targets (configurable - using reasonable defaults)
        const targets = {
            monthlyRevenue: 50000000, // 50M target
            monthlyOrders: 50,
            newCustomers: 5,
            conversionRate: 70, // 70% target
        };

        // Conversion: orders delivered / total orders
        const deliveredThisMonth = await prisma.wholesaleOrder.count({
            where: { distributorId, createdAt: { gte: thisMonthStart }, status: 'DELIVERED' }
        });
        const conversionRate = thisMonthOrders > 0 ? Math.round((deliveredThisMonth / thisMonthOrders) * 100) : 0;

        // Top performing products
        const topProducts = await prisma.wholesaleOrder.findMany({
            where: { distributorId, createdAt: { gte: thisMonthStart }, status: { not: 'CANCELLED' } },
            include: { items: { include: { wholesaleProduct: { select: { name: true } } } } }
        });

        const productSales = {};
        topProducts.forEach(o => {
            o.items.forEach(i => {
                const name = i.wholesaleProduct?.name || 'Unknown';
                if (!productSales[name]) productSales[name] = { name, revenue: 0, qty: 0 };
                productSales[name].revenue += i.subtotal;
                productSales[name].qty += i.quantity;
            });
        });
        const topProductsList = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        return successResponse(res, {
            current: {
                revenue,
                orders: thisMonthOrders,
                newCustomers,
                repeatCustomers,
                conversionRate,
                avgOrderValue: thisMonthOrders > 0 ? Math.round(revenue / thisMonthOrders) : 0
            },
            targets,
            progress: {
                revenue: Math.min(100, Math.round((revenue / targets.monthlyRevenue) * 100)),
                orders: Math.min(100, Math.round((thisMonthOrders / targets.monthlyOrders) * 100)),
                newCustomers: Math.min(100, Math.round((newCustomers / targets.newCustomers) * 100)),
                conversionRate: Math.min(100, Math.round((conversionRate / targets.conversionRate) * 100)),
            },
            growth: {
                revenue: lastRevenue > 0 ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100) : 0,
                orders: lastMonthOrderCount > 0 ? Math.round(((thisMonthOrders - lastMonthOrderCount) / lastMonthOrderCount) * 100) : 0,
            },
            topProducts: topProductsList
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch KPI", 500, error);
    }
};

// =======================
// 6. LOYALTY PROGRAM
// =======================

const getLoyaltyProgram = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        // Calculate loyalty tiers based on order history
        const customers = await prisma.distributorCustomer.findMany({
            where: { distributorId },
            include: {
                tenant: {
                    select: {
                        name: true,
                        wholesaleOrders: {
                            where: { distributorId, paymentStatus: 'PAID' },
                            select: { totalAmount: true, createdAt: true }
                        }
                    }
                }
            }
        });

        const loyaltyData = customers.map(c => {
            const orders = c.tenant.wholesaleOrders || [];
            const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);
            const orderCount = orders.length;
            const lastOrder = orders.length > 0 ? orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt : null;

            // Tier calculation
            let tier = 'BRONZE';
            let points = Math.floor(totalSpent / 10000); // 1 point per 10K spent
            if (totalSpent >= 50000000) tier = 'PLATINUM';
            else if (totalSpent >= 20000000) tier = 'GOLD';
            else if (totalSpent >= 5000000) tier = 'SILVER';

            return {
                id: c.id,
                tenantId: c.tenantId,
                customerName: c.tenant.name,
                tier,
                points,
                totalSpent,
                orderCount,
                lastOrder,
                creditLimit: c.creditLimit,
            };
        });

        // Sort by total spent
        loyaltyData.sort((a, b) => b.totalSpent - a.totalSpent);

        const tierCounts = {
            PLATINUM: loyaltyData.filter(l => l.tier === 'PLATINUM').length,
            GOLD: loyaltyData.filter(l => l.tier === 'GOLD').length,
            SILVER: loyaltyData.filter(l => l.tier === 'SILVER').length,
            BRONZE: loyaltyData.filter(l => l.tier === 'BRONZE').length,
        };

        return successResponse(res, { customers: loyaltyData, tierCounts });
    } catch (error) {
        return errorResponse(res, "Failed to fetch loyalty data", 500, error);
    }
};

// =======================
// 7. INVOICE GENERATOR
// =======================

const generateInvoice = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { orderId } = req.params;

        const order = await prisma.wholesaleOrder.findFirst({
            where: { id: orderId, distributorId },
            include: {
                tenant: { select: { name: true, users: { select: { name: true, email: true }, take: 1 } } },
                items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } },
                distributor: { select: { companyName: true, npwp: true, warehouses: { where: { isPrimary: true }, take: 1 } } }
            }
        });

        if (!order) return errorResponse(res, "Order not found", 404);

        const invoice = {
            invoiceNumber: `INV-${order.orderNumber}`,
            date: order.createdAt,
            dueDate: new Date(new Date(order.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000),
            seller: {
                name: order.distributor.companyName,
                npwp: order.distributor.npwp || '-',
                address: order.distributor.warehouses?.[0]?.address || '-'
            },
            buyer: {
                name: order.tenant?.name || '-',
                contact: order.tenant?.users?.[0]?.name || '-',
                email: order.tenant?.users?.[0]?.email || '-',
            },
            items: order.items.map((item, idx) => ({
                no: idx + 1,
                name: item.wholesaleProduct?.name || '-',
                unit: item.wholesaleProduct?.unit || '-',
                qty: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal
            })),
            subtotal: order.totalAmount,
            tax: 0, // PPN 0% for now
            total: order.totalAmount,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            notes: typeof order.shippingAddress === 'object' ? order.shippingAddress.notes || '' : ''
        };

        return successResponse(res, invoice, "Invoice generated");
    } catch (error) {
        return errorResponse(res, "Failed to generate invoice", 500, error);
    }
};

module.exports = {
    getReceivables,
    markAsPaid,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    sendNotificationToMerchant,
    getStorefront,
    getReturns,
    processReturn,
    getSalesKPI,
    getLoyaltyProgram,
    generateInvoice
};
