const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { distributor: true } });
    return user?.distributor?.id;
};

// Helper: get/save JSON settings
const getSettings = async (key) => {
    const s = await prisma.systemSettings.findUnique({ where: { key } });
    try { return s?.value ? JSON.parse(s.value) : []; } catch (e) { return []; }
};
const saveSettings = async (key, data, desc) => {
    await prisma.systemSettings.upsert({
        where: { key },
        update: { value: JSON.stringify(data) },
        create: { key, value: JSON.stringify(data), description: desc || key }
    });
};

// ============================================================
// UNIFIED SALES ANALYTICS
// ============================================================

/**
 * GET /distributor/sales/analytics
 * Comprehensive sales analytics combining ecosystem + external + visit orders
 */
const getSalesAnalytics = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { period = '30' } = req.query;
        const days = parseInt(period);
        const now = new Date();
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Current period orders
        const currentOrders = await prisma.wholesaleOrder.findMany({
            where: { distributorId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
            include: {
                items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } },
                tenant: { select: { id: true, name: true, stores: { select: { name: true, category: true }, take: 1 } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Previous period for comparison
        const prevOrders = await prisma.wholesaleOrder.findMany({
            where: { distributorId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd }, status: { not: 'CANCELLED' } },
            select: { totalAmount: true, paymentStatus: true }
        });

        // Segment: ecosystem vs external
        const ecosystemOrders = currentOrders.filter(o => o.paymentMethod !== 'EXTERNAL');
        const externalOrders = currentOrders.filter(o => o.paymentMethod === 'EXTERNAL');

        // Revenue calculations
        const totalRevenue = currentOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + Number(o.totalAmount), 0);
        const ecosystemRevenue = ecosystemOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + Number(o.totalAmount), 0);
        const externalRevenue = externalOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + Number(o.totalAmount), 0);
        const prevRevenue = prevOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + Number(o.totalAmount), 0);

        // Daily revenue chart (last N days)
        const dailyRevenue = [];
        for (let i = Math.min(days, 30) - 1; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayOrders = currentOrders.filter(o => o.createdAt.toISOString().split('T')[0] === dateStr && o.paymentStatus === 'PAID');
            dailyRevenue.push({
                date: dateStr,
                label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                revenue: dayOrders.reduce((s, o) => s + Number(o.totalAmount), 0),
                orders: dayOrders.length,
                ecosystem: dayOrders.filter(o => o.paymentMethod !== 'EXTERNAL').reduce((s, o) => s + Number(o.totalAmount), 0),
                external: dayOrders.filter(o => o.paymentMethod === 'EXTERNAL').reduce((s, o) => s + Number(o.totalAmount), 0),
            });
        }

        // Top merchants by revenue
        const merchantRevenue = {};
        ecosystemOrders.filter(o => o.paymentStatus === 'PAID').forEach(o => {
            const key = o.tenantId;
            if (!merchantRevenue[key]) {
                merchantRevenue[key] = {
                    tenantId: key,
                    name: o.tenant?.stores?.[0]?.name || o.tenant?.name || 'Unknown',
                    category: o.tenant?.stores?.[0]?.category || '-',
                    revenue: 0, orders: 0
                };
            }
            merchantRevenue[key].revenue += Number(o.totalAmount);
            merchantRevenue[key].orders += 1;
        });
        const topMerchants = Object.values(merchantRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Top products by quantity sold
        const productSales = {};
        currentOrders.forEach(o => {
            o.items.forEach(item => {
                const name = item.wholesaleProduct?.name || 'Unknown';
                if (!productSales[name]) productSales[name] = { name, unit: item.wholesaleProduct?.unit || '-', qty: 0, revenue: 0 };
                productSales[name].qty += item.quantity;
                productSales[name].revenue += Number(item.subtotal);
            });
        });
        const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Order status breakdown
        const statusBreakdown = {
            pending: currentOrders.filter(o => o.status === 'PENDING').length,
            paid: currentOrders.filter(o => o.status === 'PAID').length,
            processing: currentOrders.filter(o => o.status === 'PROCESSING').length,
            shipped: currentOrders.filter(o => o.status === 'SHIPPED').length,
            delivered: currentOrders.filter(o => o.status === 'DELIVERED').length,
        };

        // Growth
        const revenueGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

        // SFA visit data for correlation
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const periodVisits = visits.filter(v => v.date >= since.toISOString().split('T')[0]);
        const completedVisits = periodVisits.filter(v => v.status === 'COMPLETED');
        const effectiveVisits = completedVisits.filter(v => v.orderCreated);

        return successResponse(res, {
            summary: {
                totalRevenue,
                ecosystemRevenue,
                externalRevenue,
                totalOrders: currentOrders.length,
                ecosystemOrders: ecosystemOrders.length,
                externalOrders: externalOrders.length,
                avgOrderValue: currentOrders.length > 0 ? Math.round(totalRevenue / currentOrders.length) : 0,
                revenueGrowth,
                uniqueCustomers: new Set(ecosystemOrders.map(o => o.tenantId)).size,
            },
            dailyRevenue,
            topMerchants,
            topProducts,
            statusBreakdown,
            visitCorrelation: {
                totalVisits: periodVisits.length,
                completed: completedVisits.length,
                effective: effectiveVisits.length,
                ecr: completedVisits.length > 0 ? Math.round((effectiveVisits.length / completedVisits.length) * 100) : 0,
                visitOrderValue: effectiveVisits.reduce((s, v) => s + (v.orderAmount || 0), 0),
            },
            period: { days, from: since.toISOString(), to: now.toISOString() }
        }, "Sales analytics retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch sales analytics", 500, error);
    }
};

/**
 * POST /distributor/sales/visit-order
 * Create a wholesale order during a sales visit (links visit → order)
 */
const createVisitOrder = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { visitId, merchantId, items, paymentMethod, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return errorResponse(res, "Items are required", 400);
        }

        // Resolve merchant tenant
        let tenantId = null;
        if (merchantId) {
            // merchantId could be a tenantId or a store name
            const customer = await prisma.distributorCustomer.findFirst({
                where: { distributorId, tenantId: merchantId }
            });
            if (customer) tenantId = customer.tenantId;
        }

        // If no tenantId found, use distributor's own tenant (for non-ecosystem merchants)
        if (!tenantId) {
            const distUser = await prisma.user.findFirst({ where: { id: req.user.userId } });
            tenantId = distUser.tenantId;
        }

        // Validate items and calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            if (!item.productId || !item.quantity || !item.unitPrice) {
                return errorResponse(res, "Each item needs productId, quantity, and unitPrice", 400);
            }

            const product = await prisma.wholesaleProduct.findFirst({
                where: { id: item.productId, distributorId }
            });
            if (!product) return errorResponse(res, `Product ${item.productId} not found`, 404);

            if (product.stockQuantity < item.quantity) {
                return errorResponse(res, `Stok ${product.name} tidak cukup (tersedia: ${product.stockQuantity})`, 400);
            }

            const subtotal = item.quantity * item.unitPrice;
            totalAmount += subtotal;

            orderItems.push({
                wholesaleProductId: item.productId,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                subtotal
            });

            // Deduct stock
            await prisma.wholesaleProduct.update({
                where: { id: item.productId },
                data: { stockQuantity: { decrement: parseInt(item.quantity) } }
            });
        }

        const orderNumber = `SV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = await prisma.wholesaleOrder.create({
            data: {
                distributorId,
                tenantId,
                orderNumber,
                totalAmount,
                status: 'PROCESSING',
                paymentStatus: paymentMethod === 'COD' ? 'PAID' : 'UNPAID',
                paymentMethod: paymentMethod || 'VISIT_ORDER',
                shippingAddress: { type: 'VISIT_ORDER', visitId: visitId || null, notes: notes || '' },
                items: { create: orderItems }
            },
            include: {
                items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } }
            }
        });

        // Update visit record if visitId provided
        if (visitId) {
            const key = `DIST_VISITS_${distributorId}`;
            const visits = await getSettings(key);
            const idx = visits.findIndex(v => v.id === visitId);
            if (idx >= 0) {
                visits[idx].orderCreated = true;
                visits[idx].orderAmount = totalAmount;
                visits[idx].orderId = order.id;
                await saveSettings(key, visits, 'Sales visits');
            }
        }

        // Notify merchant if ecosystem order
        if (tenantId && merchantId) {
            try {
                await prisma.notification.create({
                    data: {
                        tenantId,
                        title: 'Pesanan Baru dari Sales',
                        body: `Sales rep membuat pesanan senilai Rp ${totalAmount.toLocaleString('id-ID')} untuk toko Anda`
                    }
                });
            } catch (e) { /* ignore notification errors */ }
        }

        return successResponse(res, order, "Visit order created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create visit order", 500, error);
    }
};

/**
 * GET /distributor/sales/all-orders
 * Unified order list with filters (ecosystem + external + visit)
 */
const getAllOrders = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { page = 1, limit = 20, type, status, search, dateFrom, dateTo } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { distributorId };

        // Filter by type
        if (type === 'ecosystem') where.paymentMethod = { notIn: ['EXTERNAL', 'VISIT_ORDER'] };
        else if (type === 'external') where.paymentMethod = 'EXTERNAL';
        else if (type === 'visit') where.paymentMethod = 'VISIT_ORDER';

        if (status) where.status = status;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
        }
        if (search) {
            where.OR = [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { tenant: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [orders, total] = await Promise.all([
            prisma.wholesaleOrder.findMany({
                where,
                include: {
                    items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } },
                    tenant: { select: { name: true, stores: { select: { name: true }, take: 1 } } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.wholesaleOrder.count({ where })
        ]);

        const formatted = orders.map(o => ({
            ...o,
            customerName: o.paymentMethod === 'EXTERNAL'
                ? (typeof o.shippingAddress === 'object' ? o.shippingAddress.customerName : 'External')
                : (o.tenant?.stores?.[0]?.name || o.tenant?.name || 'Unknown'),
            orderType: o.paymentMethod === 'EXTERNAL' ? 'external' : o.paymentMethod === 'VISIT_ORDER' ? 'visit' : 'ecosystem',
        }));

        return successResponse(res, {
            orders: formatted,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        }, "Orders retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch orders", 500, error);
    }
};

/**
 * GET /distributor/sales/merchant-performance
 * Per-merchant sales performance for sales reps
 */
const getMerchantPerformance = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const customers = await prisma.distributorCustomer.findMany({
            where: { distributorId, isActive: true },
            include: {
                tenant: {
                    select: {
                        id: true, name: true,
                        stores: { select: { name: true, location: true, category: true, waNumber: true }, take: 1 }
                    }
                }
            }
        });

        // Get orders per merchant this month
        const monthOrders = await prisma.wholesaleOrder.findMany({
            where: { distributorId, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' }, paymentMethod: { not: 'EXTERNAL' } },
            select: { tenantId: true, totalAmount: true, paymentStatus: true, createdAt: true }
        });

        // Get visits per merchant
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const monthVisits = visits.filter(v => v.date >= monthStart.toISOString().split('T')[0]);

        const performance = customers.map(c => {
            const orders = monthOrders.filter(o => o.tenantId === c.tenantId);
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
            const revenue = paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
            const merchantVisits = monthVisits.filter(v =>
                v.merchantName && c.tenant?.stores?.[0]?.name &&
                v.merchantName.toLowerCase().includes(c.tenant.stores[0].name.toLowerCase().substring(0, 5))
            );

            const lastOrder = orders.length > 0 ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : null;
            const daysSinceLastOrder = lastOrder ? Math.floor((now - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24)) : 999;

            return {
                tenantId: c.tenantId,
                storeName: c.tenant?.stores?.[0]?.name || c.tenant?.name || 'Unknown',
                location: c.tenant?.stores?.[0]?.location || '-',
                category: c.tenant?.stores?.[0]?.category || '-',
                waNumber: c.tenant?.stores?.[0]?.waNumber || null,
                creditLimit: c.creditLimit,
                creditUsed: c.creditUsed,
                monthRevenue: revenue,
                monthOrders: orders.length,
                monthVisits: merchantVisits.length,
                daysSinceLastOrder,
                status: daysSinceLastOrder <= 7 ? 'ACTIVE' : daysSinceLastOrder <= 30 ? 'WARM' : 'COLD',
            };
        });

        performance.sort((a, b) => b.monthRevenue - a.monthRevenue);

        const summary = {
            totalMerchants: performance.length,
            active: performance.filter(p => p.status === 'ACTIVE').length,
            warm: performance.filter(p => p.status === 'WARM').length,
            cold: performance.filter(p => p.status === 'COLD').length,
            totalRevenue: performance.reduce((s, p) => s + p.monthRevenue, 0),
        };

        return successResponse(res, { merchants: performance, summary }, "Merchant performance retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch merchant performance", 500, error);
    }
};

/**
 * GET /distributor/sales/rep-info/:tenantId
 * Get assigned sales rep info for a merchant (used by merchant app)
 */
const getSalesRepForMerchant = async (req, res) => {
    try {
        const { tenantId } = req.params;

        // Find which distributor this merchant is a customer of
        const customer = await prisma.distributorCustomer.findFirst({
            where: { tenantId, isActive: true },
            include: {
                distributor: {
                    select: {
                        id: true, companyName: true,
                        user: { select: { id: true, name: true, email: true, tenantId: true } }
                    }
                }
            }
        });

        if (!customer) {
            return successResponse(res, null, "No distributor assigned");
        }

        const distributorId = customer.distributorId;

        // Get visits to find assigned sales rep
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const store = await prisma.store.findFirst({ where: { tenantId }, select: { name: true } });
        const storeName = store?.name || '';

        // Find most recent visit to this merchant
        const merchantVisits = visits.filter(v =>
            v.merchantName && storeName &&
            v.merchantName.toLowerCase().includes(storeName.toLowerCase().substring(0, 5))
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        let salesRep = null;
        if (merchantVisits.length > 0) {
            const lastVisit = merchantVisits[0];
            if (lastVisit.salesId) {
                const user = await prisma.user.findUnique({
                    where: { id: lastVisit.salesId },
                    select: { id: true, name: true, email: true }
                });
                if (user) {
                    salesRep = { id: user.id, name: user.name, email: user.email, lastVisit: lastVisit.date };
                }
            }
        }

        // Get route plan info
        const routes = await getSettings(`DIST_ROUTES_${distributorId}`);
        const assignedRoute = routes.find(r =>
            r.merchants?.some(m => m.merchantName.toLowerCase().includes(storeName.toLowerCase().substring(0, 5)))
        );

        return successResponse(res, {
            distributor: { id: distributorId, name: customer.distributor.companyName },
            salesRep,
            routePlan: assignedRoute ? { name: assignedRoute.name, day: assignedRoute.dayOfWeek } : null,
            creditLimit: customer.creditLimit,
            creditUsed: customer.creditUsed,
            totalVisits: merchantVisits.length,
            lastVisitDate: merchantVisits[0]?.date || null,
        }, "Sales rep info retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch sales rep info", 500, error);
    }
};

module.exports = {
    getSalesAnalytics,
    createVisitOrder,
    getAllOrders,
    getMerchantPerformance,
    getSalesRepForMerchant,
};
