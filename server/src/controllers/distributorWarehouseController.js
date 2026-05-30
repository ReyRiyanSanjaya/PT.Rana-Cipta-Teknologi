const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

// Helper
const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { distributor: true }
    });
    return user?.distributor?.id;
};

// =======================
// WAREHOUSE MANAGEMENT
// =======================

const getWarehouses = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const warehouses = await prisma.warehouse.findMany({
            where: { distributorId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
        });

        // Get product count per warehouse (using stock allocation concept)
        // Since products don't have warehouseId directly, we count total products
        const totalProducts = await prisma.wholesaleProduct.count({ where: { distributorId } });
        const totalStock = await prisma.wholesaleProduct.aggregate({
            where: { distributorId },
            _sum: { stockQuantity: true }
        });

        const formatted = warehouses.map((wh, idx) => ({
            ...wh,
            // Distribute stock info proportionally for display (primary gets all in simple model)
            productCount: idx === 0 ? totalProducts : 0,
            totalStock: idx === 0 ? (totalStock._sum.stockQuantity || 0) : 0,
        }));

        return successResponse(res, formatted, "Warehouses retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch warehouses", 500, error);
    }
};

const createWarehouse = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { name, address, isPrimary } = req.body;
        if (!name || !address) return errorResponse(res, "Name and address are required", 400);

        // If setting as primary, unset others
        if (isPrimary) {
            await prisma.warehouse.updateMany({
                where: { distributorId },
                data: { isPrimary: false }
            });
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                distributorId,
                name,
                address,
                isPrimary: isPrimary || false
            }
        });

        return successResponse(res, warehouse, "Warehouse created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create warehouse", 500, error);
    }
};

const updateWarehouse = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { name, address, isPrimary } = req.body;

        const existing = await prisma.warehouse.findFirst({ where: { id, distributorId } });
        if (!existing) return errorResponse(res, "Warehouse not found", 404);

        if (isPrimary) {
            await prisma.warehouse.updateMany({
                where: { distributorId, id: { not: id } },
                data: { isPrimary: false }
            });
        }

        const updated = await prisma.warehouse.update({
            where: { id },
            data: {
                name: name || undefined,
                address: address || undefined,
                isPrimary: isPrimary !== undefined ? isPrimary : undefined
            }
        });

        return successResponse(res, updated, "Warehouse updated");
    } catch (error) {
        return errorResponse(res, "Failed to update warehouse", 500, error);
    }
};

const deleteWarehouse = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;

        const existing = await prisma.warehouse.findFirst({ where: { id, distributorId } });
        if (!existing) return errorResponse(res, "Warehouse not found", 404);
        if (existing.isPrimary) return errorResponse(res, "Cannot delete primary warehouse", 400);

        await prisma.warehouse.delete({ where: { id } });
        return successResponse(res, null, "Warehouse deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete warehouse", 500, error);
    }
};

// =======================
// FORECASTING
// =======================

const getForecasting = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();

        // Get last 3 months of order data for forecasting
        const months = [];
        for (let i = 2; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            const orders = await prisma.wholesaleOrder.findMany({
                where: {
                    distributorId,
                    createdAt: { gte: monthStart, lte: monthEnd },
                    status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
                },
                include: {
                    items: { include: { wholesaleProduct: { select: { id: true, name: true, unit: true } } } }
                }
            });

            const revenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
            const orderCount = orders.length;

            // Aggregate product demand
            const productDemand = {};
            orders.forEach(o => {
                o.items.forEach(item => {
                    const pid = item.wholesaleProduct?.id;
                    if (!pid) return;
                    if (!productDemand[pid]) {
                        productDemand[pid] = {
                            id: pid,
                            name: item.wholesaleProduct.name,
                            unit: item.wholesaleProduct.unit,
                            totalQty: 0,
                            orderFrequency: 0
                        };
                    }
                    productDemand[pid].totalQty += item.quantity;
                    productDemand[pid].orderFrequency += 1;
                });
            });

            months.push({
                month: monthStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
                monthKey: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
                revenue,
                orderCount,
                productDemand: Object.values(productDemand)
            });
        }

        // Simple linear forecast for next month
        const revenueValues = months.map(m => m.revenue);
        const orderValues = months.map(m => m.orderCount);

        const avgRevenue = revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length;
        const avgOrders = orderValues.reduce((a, b) => a + b, 0) / orderValues.length;

        // Trend: compare last month to average
        const lastMonthRevenue = revenueValues[revenueValues.length - 1] || 0;
        const trendFactor = avgRevenue > 0 ? lastMonthRevenue / avgRevenue : 1;
        const forecastRevenue = Math.round(avgRevenue * trendFactor * 1.05); // 5% growth assumption
        const forecastOrders = Math.round(avgOrders * trendFactor * 1.05);

        // Top products forecast (aggregate across months)
        const allProductDemand = {};
        months.forEach(m => {
            m.productDemand.forEach(p => {
                if (!allProductDemand[p.id]) {
                    allProductDemand[p.id] = { ...p, totalQty: 0, orderFrequency: 0 };
                }
                allProductDemand[p.id].totalQty += p.totalQty;
                allProductDemand[p.id].orderFrequency += p.orderFrequency;
            });
        });

        // Get current stock for reorder suggestions
        const topProducts = Object.values(allProductDemand)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 10);

        const productIds = topProducts.map(p => p.id);
        const currentStocks = await prisma.wholesaleProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, stockQuantity: true, moq: true }
        });
        const stockMap = new Map(currentStocks.map(s => [s.id, s]));

        const productForecasts = topProducts.map(p => {
            const stock = stockMap.get(p.id);
            const avgMonthlyDemand = Math.round(p.totalQty / 3);
            const currentStock = stock?.stockQuantity || 0;
            const daysOfStock = avgMonthlyDemand > 0 ? Math.round((currentStock / avgMonthlyDemand) * 30) : 999;
            const reorderQty = Math.max(0, avgMonthlyDemand * 2 - currentStock); // 2 months buffer

            return {
                ...p,
                avgMonthlyDemand,
                currentStock,
                daysOfStock,
                reorderQty,
                status: daysOfStock <= 7 ? 'CRITICAL' : daysOfStock <= 14 ? 'LOW' : daysOfStock <= 30 ? 'MODERATE' : 'HEALTHY'
            };
        });

        // Low stock alerts
        const lowStockProducts = await prisma.wholesaleProduct.findMany({
            where: { distributorId, isActive: true, stockQuantity: { lte: 10 } },
            select: { id: true, name: true, stockQuantity: true, unit: true, moq: true },
            orderBy: { stockQuantity: 'asc' },
            take: 10
        });

        return successResponse(res, {
            historical: months.map(m => ({
                month: m.month,
                monthKey: m.monthKey,
                revenue: m.revenue,
                orderCount: m.orderCount
            })),
            forecast: {
                nextMonth: {
                    revenue: forecastRevenue,
                    orders: forecastOrders,
                    confidence: 0.75 // 75% confidence for simple model
                },
                trend: trendFactor > 1 ? 'UP' : trendFactor < 1 ? 'DOWN' : 'STABLE',
                trendPercent: Math.round((trendFactor - 1) * 100)
            },
            productForecasts,
            lowStockAlerts: lowStockProducts,
        }, "Forecasting data retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch forecasting data", 500, error);
    }
};

// =======================
// EXTERNAL SALES
// =======================

const getExternalSales = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // External sales are orders with tenantId = null or a special marker
        // We'll use orders where tenant name starts with "EXT-" or use a flag
        // For simplicity, let's query orders that have shippingAddress containing "EXTERNAL"
        // Better approach: use paymentMethod = 'EXTERNAL' as marker
        const [sales, total] = await Promise.all([
            prisma.wholesaleOrder.findMany({
                where: { distributorId, paymentMethod: 'EXTERNAL' },
                include: {
                    items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.wholesaleOrder.count({
                where: { distributorId, paymentMethod: 'EXTERNAL' }
            })
        ]);

        // Also get ecosystem sales count for comparison
        const ecosystemCount = await prisma.wholesaleOrder.count({
            where: { distributorId, paymentMethod: { not: 'EXTERNAL' } }
        });

        return successResponse(res, {
            sales,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            comparison: {
                external: total,
                ecosystem: ecosystemCount
            }
        }, "External sales retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch external sales", 500, error);
    }
};

const createExternalSale = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { customerName, customerPhone, items, notes } = req.body;

        if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
            return errorResponse(res, "Customer name and items are required", 400);
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

        // Create the external sale as a WholesaleOrder with special markers
        // We need a tenantId - use the distributor's own tenant
        const distUser = await prisma.user.findFirst({ where: { id: req.user.userId } });

        const orderNumber = `EXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = await prisma.wholesaleOrder.create({
            data: {
                distributorId,
                tenantId: distUser.tenantId, // Self-reference for external
                orderNumber,
                totalAmount,
                status: 'DELIVERED', // External sales are immediately completed
                paymentStatus: 'PAID',
                paymentMethod: 'EXTERNAL', // Marker for external sales
                shippingAddress: { customerName, customerPhone, notes: notes || '', type: 'EXTERNAL' },
                items: {
                    create: orderItems
                }
            },
            include: {
                items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } }
            }
        });

        return successResponse(res, order, "External sale recorded", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create external sale", 500, error);
    }
};

module.exports = {
    getWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getForecasting,
    getExternalSales,
    createExternalSale
};
