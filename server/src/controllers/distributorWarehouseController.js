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

// =======================
// WAREHOUSE STOCK MANAGEMENT
// =======================

/**
 * GET /distributor/warehouses/stock
 * Full inventory list with stock levels, value, and movement history
 */
const getWarehouseStock = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { search, category, stockStatus, sort = 'name' } = req.query;

        const where = { distributorId, isActive: true };
        if (search) where.name = { contains: search, mode: 'insensitive' };
        if (category) where.wholesaleCategoryId = category;

        let products = await prisma.wholesaleProduct.findMany({
            where,
            include: { wholesaleCategory: { select: { name: true } } },
            orderBy: sort === 'stock_asc' ? { stockQuantity: 'asc' } : sort === 'stock_desc' ? { stockQuantity: 'desc' } : { name: 'asc' }
        });

        // Filter by stock status
        if (stockStatus === 'low') products = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10);
        else if (stockStatus === 'out') products = products.filter(p => p.stockQuantity <= 0);
        else if (stockStatus === 'healthy') products = products.filter(p => p.stockQuantity > 10);

        // Calculate stock value
        const stockData = products.map(p => {
            const basePrice = Array.isArray(p.pricingTiers) && p.pricingTiers.length > 0 ? p.pricingTiers[0].price : 0;
            return {
                id: p.id,
                name: p.name,
                unit: p.unit,
                category: p.wholesaleCategory?.name || 'Uncategorized',
                stockQuantity: p.stockQuantity,
                moq: p.moq,
                basePrice,
                stockValue: p.stockQuantity * basePrice,
                status: p.stockQuantity <= 0 ? 'OUT_OF_STOCK' : p.stockQuantity <= 10 ? 'LOW' : 'HEALTHY',
                updatedAt: p.updatedAt
            };
        });

        // Summary stats
        const totalItems = stockData.length;
        const totalUnits = stockData.reduce((s, p) => s + p.stockQuantity, 0);
        const totalValue = stockData.reduce((s, p) => s + p.stockValue, 0);
        const outOfStock = stockData.filter(p => p.status === 'OUT_OF_STOCK').length;
        const lowStock = stockData.filter(p => p.status === 'LOW').length;

        return successResponse(res, {
            products: stockData,
            summary: { totalItems, totalUnits, totalValue, outOfStock, lowStock }
        }, "Warehouse stock retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch warehouse stock", 500, error);
    }
};

/**
 * POST /distributor/warehouses/stock/adjust
 * Adjust stock: IN (restock), OUT (manual deduction), CORRECTION
 */
const adjustStock = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { productId, type, quantity, reason } = req.body;
        // type: 'IN' (restock), 'OUT' (deduction), 'CORRECTION' (set exact)

        if (!productId || !type || quantity === undefined) {
            return errorResponse(res, "productId, type, and quantity are required", 400);
        }

        const product = await prisma.wholesaleProduct.findFirst({ where: { id: productId, distributorId } });
        if (!product) return errorResponse(res, "Product not found", 404);

        let newStock = product.stockQuantity;
        if (type === 'IN') newStock += parseInt(quantity);
        else if (type === 'OUT') {
            newStock -= parseInt(quantity);
            if (newStock < 0) return errorResponse(res, "Insufficient stock", 400);
        }
        else if (type === 'CORRECTION') newStock = parseInt(quantity);
        else return errorResponse(res, "Invalid type. Use IN, OUT, or CORRECTION", 400);

        const updated = await prisma.wholesaleProduct.update({
            where: { id: productId },
            data: { stockQuantity: newStock }
        });

        return successResponse(res, {
            productId,
            productName: product.name,
            previousStock: product.stockQuantity,
            adjustment: type === 'CORRECTION' ? `Set to ${quantity}` : `${type} ${quantity}`,
            newStock,
            reason: reason || null,
            timestamp: new Date()
        }, "Stock adjusted successfully");
    } catch (error) {
        return errorResponse(res, "Failed to adjust stock", 500, error);
    }
};

/**
 * POST /distributor/warehouses/stock/bulk-adjust
 * Bulk stock adjustment for multiple products
 */
const bulkAdjustStock = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { adjustments } = req.body;
        // adjustments: [{ productId, type, quantity, reason }]

        if (!Array.isArray(adjustments) || adjustments.length === 0) {
            return errorResponse(res, "adjustments array is required", 400);
        }

        const results = [];
        for (const adj of adjustments) {
            const product = await prisma.wholesaleProduct.findFirst({ where: { id: adj.productId, distributorId } });
            if (!product) {
                results.push({ productId: adj.productId, success: false, error: 'Not found' });
                continue;
            }

            let newStock = product.stockQuantity;
            if (adj.type === 'IN') newStock += parseInt(adj.quantity);
            else if (adj.type === 'OUT') newStock = Math.max(0, newStock - parseInt(adj.quantity));
            else if (adj.type === 'CORRECTION') newStock = parseInt(adj.quantity);

            await prisma.wholesaleProduct.update({
                where: { id: adj.productId },
                data: { stockQuantity: newStock }
            });

            results.push({
                productId: adj.productId,
                productName: product.name,
                success: true,
                previousStock: product.stockQuantity,
                newStock
            });
        }

        return successResponse(res, results, `${results.filter(r => r.success).length}/${adjustments.length} adjustments applied`);
    } catch (error) {
        return errorResponse(res, "Failed to bulk adjust stock", 500, error);
    }
};

/**
 * GET /distributor/warehouses/stock/movements
 * Stock movement history (based on orders in/out)
 */
const getStockMovements = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));

        // Get recent orders (outgoing stock)
        const outgoingOrders = await prisma.wholesaleOrder.findMany({
            where: {
                distributorId,
                createdAt: { gte: since },
                status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
            },
            include: {
                items: { include: { wholesaleProduct: { select: { name: true, unit: true } } } },
                tenant: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Format as movements
        const movements = [];
        outgoingOrders.forEach(order => {
            order.items.forEach(item => {
                movements.push({
                    id: `${order.id}-${item.id}`,
                    date: order.createdAt,
                    type: order.paymentMethod === 'EXTERNAL' ? 'SALE_EXTERNAL' : 'SALE_ECOSYSTEM',
                    productName: item.wholesaleProduct?.name || 'Unknown',
                    unit: item.wholesaleProduct?.unit || '-',
                    quantity: item.quantity,
                    reference: order.orderNumber,
                    customer: order.paymentMethod === 'EXTERNAL'
                        ? (typeof order.shippingAddress === 'object' ? order.shippingAddress.customerName : 'External')
                        : (order.tenant?.name || 'Merchant'),
                    amount: item.subtotal
                });
            });
        });

        // Sort by date desc
        movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Summary
        const totalOut = movements.reduce((s, m) => s + m.quantity, 0);
        const totalValue = movements.reduce((s, m) => s + m.amount, 0);
        const ecosystemSales = movements.filter(m => m.type === 'SALE_ECOSYSTEM').length;
        const externalSales = movements.filter(m => m.type === 'SALE_EXTERNAL').length;

        return successResponse(res, {
            movements: movements.slice(0, 50),
            summary: { totalOut, totalValue, ecosystemSales, externalSales, period: `${days} days` }
        }, "Stock movements retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch stock movements", 500, error);
    }
};

module.exports = {
    getWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getForecasting,
    getExternalSales,
    createExternalSale,
    getWarehouseStock,
    adjustStock,
    bulkAdjustStock,
    getStockMovements
};
