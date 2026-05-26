const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');

// Helper to ensure distributorId exists (handling old tokens)
const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { distributor: true }
    });
    return user?.distributor?.id;
};

// =======================
// DISTRIBUTOR PROFILE
// =======================

const getProfile = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            include: {
                warehouses: true,
                user: { select: { email: true, name: true } }
            }
        });

        if (!distributor) return errorResponse(res, "Distributor profile not found", 404);

        return successResponse(res, distributor, "Profile retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch profile", 500, error);
    }
};

const updateProfile = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { companyName, npwp, kycDocuments } = req.body;

        const updated = await prisma.distributor.update({
            where: { id: distributorId },
            data: {
                companyName,
                npwp,
                kycDocuments: kycDocuments ? kycDocuments : undefined // Expecting array of URLs
            }
        });

        return successResponse(res, updated, "Profile updated");
    } catch (error) {
        return errorResponse(res, "Failed to update profile", 500, error);
    }
};

// =======================
// PRODUCT MANAGEMENT
// =======================

const getCategories = async (req, res) => {
    try {
        const categories = await prisma.wholesaleCategory.findMany({
            orderBy: { name: 'asc' }
        });
        return successResponse(res, categories, "Categories retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch categories", 500, error);
    }
};

const getProducts = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { search, categoryId } = req.query;

        const where = {
            distributorId,
            name: search ? { contains: search, mode: 'insensitive' } : undefined,
            wholesaleCategoryId: categoryId || undefined
        };

        const products = await prisma.wholesaleProduct.findMany({
            where,
            include: { wholesaleCategory: true },
            orderBy: { createdAt: 'desc' }
        });

        return successResponse(res, products, "Products retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch products", 500, error);
    }
};

const getProductById = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;

        const product = await prisma.wholesaleProduct.findFirst({
            where: { id, distributorId },
            include: { wholesaleCategory: true }
        });

        if (!product) return errorResponse(res, "Product not found", 404);

        return successResponse(res, product, "Product retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch product", 500, error);
    }
};

const createProduct = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Distributor account not found", 403);

        const { 
            name, 
            description, 
            categoryId, 
            images, 
            pricingTiers, // JSON: [{minQty: 1, price: 1000}, {minQty: 10, price: 900}]
            moq, 
            stockQuantity, 
            unit,
            isActive 
        } = req.body;

        if (!name || !pricingTiers || !unit) {
            return errorResponse(res, "Missing required fields", 400);
        }

        // Basic validation for pricingTiers
        let parsedTiers = pricingTiers;
        if (typeof pricingTiers === 'string') {
            try { parsedTiers = JSON.parse(pricingTiers); } catch(e) {}
        }
        if (!Array.isArray(parsedTiers) || parsedTiers.length === 0) {
            return errorResponse(res, "Invalid pricing tiers", 400);
        }

        const product = await prisma.wholesaleProduct.create({
            data: {
                distributorId,
                name,
                description,
                wholesaleCategoryId: categoryId,
                images: images || [],
                pricingTiers: parsedTiers,
                moq: moq ? parseInt(moq) : 1,
                stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
                unit,
                isActive: isActive ?? true
            }
        });

        return successResponse(res, product, "Product created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create product", 500, error);
    }
};

const updateProduct = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { 
            name, 
            description, 
            categoryId, 
            images, 
            pricingTiers, 
            moq, 
            stockQuantity, 
            unit,
            isActive 
        } = req.body;

        const product = await prisma.wholesaleProduct.findFirst({ where: { id, distributorId } });
        if (!product) return errorResponse(res, "Product not found", 404);

        let parsedTiers = pricingTiers;
        if (pricingTiers && typeof pricingTiers === 'string') {
            try { parsedTiers = JSON.parse(pricingTiers); } catch(e) {}
        }

        const updated = await prisma.wholesaleProduct.update({
            where: { id },
            data: {
                name,
                description,
                wholesaleCategoryId: categoryId,
                images: images !== undefined ? images : undefined,
                pricingTiers: parsedTiers !== undefined ? parsedTiers : undefined,
                moq: moq ? parseInt(moq) : undefined,
                stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
                unit,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });

        return successResponse(res, updated, "Product updated");
    } catch (error) {
        return errorResponse(res, "Failed to update product", 500, error);
    }
};

const deleteProduct = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;

        const product = await prisma.wholesaleProduct.findFirst({ where: { id, distributorId } });
        if (!product) return errorResponse(res, "Product not found", 404);

        await prisma.wholesaleProduct.delete({ where: { id } });

        return successResponse(res, null, "Product deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete product", 500, error);
    }
};

// =======================
// ORDER MANAGEMENT
// =======================

const getOrders = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { status, search } = req.query;

        const where = {
            distributorId,
            status: status || undefined,
            orderNumber: search ? { contains: search, mode: 'insensitive' } : undefined
        };

        const orders = await prisma.wholesaleOrder.findMany({
            where,
            include: {
                tenant: { select: { name: true, users: { select: { email: true, name: true }, take: 1 } } }, // Buyer info
                items: { include: { wholesaleProduct: { include: { wholesaleCategory: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return successResponse(res, orders, "Orders retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch orders", 500, error);
    }
};

const getShipments = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);

        const shipments = await prisma.wholesaleOrder.findMany({
            where: {
                distributorId,
                status: { in: ['SHIPPED', 'DELIVERED'] }
            },
            include: {
                tenant: { 
                    select: { 
                        name: true, 
                        users: { select: { email: true, name: true }, take: 1 },
                        stores: { select: { name: true, location: true, waNumber: true }, take: 1 }
                    } 
                },
                items: { include: { wholesaleProduct: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return successResponse(res, shipments, "Shipments retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch shipments", 500, error);
    }
};

// =======================
// CUSTOMER MANAGEMENT
// =======================

const getCustomers = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { type } = req.query; // 'active' (default) or 'leads' (never ordered)

        // Base Filter: Only fetch Tenants that are Merchants (have OWNER/CASHIER/MANAGER) 
        // and Exclude System Admins or Distributors
        let whereClause = {
            users: {
                some: {
                    role: { in: ['OWNER', 'STORE_MANAGER', 'CASHIER'] }
                },
                none: {
                    role: { in: ['ADMIN', 'SUPER_ADMIN', 'DISTRIBUTOR'] }
                }
            }
        };

        if (type === 'leads') {
            // Find tenants who have NEVER ordered from this distributor
            whereClause.wholesaleOrders = {
                none: { distributorId }
            };
        } else {
            // Find tenants who have ordered OR are in distributor list
            whereClause.OR = [
                { wholesaleOrders: { some: { distributorId } } },
                { distributorRelations: { some: { distributorId } } }
            ];
        }

        const customers = await prisma.tenant.findMany({
            where: whereClause,
            include: {
                users: { 
                    select: { name: true, email: true }, 
                    take: 1 
                },
                stores: { 
                    select: { name: true, location: true, waNumber: true }, 
                    take: 1 
                },
                _count: {
                    select: { wholesaleOrders: { where: { distributorId } } }
                },
                // Include relation data if exists
                distributorRelations: {
                    where: { distributorId }
                }
            },
            take: type === 'leads' ? 100 : undefined, // Limit leads to avoid huge data
            orderBy: { createdAt: 'desc' }
        });

        // Format for frontend
        const formatted = customers.map(c => {
            const relation = c.distributorRelations?.[0] || {};
            return {
                id: c.id,
                name: c.users[0]?.name || c.name || 'Unknown',
                email: c.users[0]?.email,
                phone: c.stores[0]?.waNumber || '-',
                storeName: c.stores[0]?.name || '-',
                address: c.stores[0]?.location || '-',
                location: c.stores[0]?.location || '-',
                totalOrders: c._count.wholesaleOrders,
                joinDate: c.createdAt,
                // Credit Data
                creditLimit: relation.creditLimit || 0,
                creditUsed: relation.creditUsed || 0,
                paymentTerm: relation.paymentTerm || 0,
                relationId: relation.id
            };
        });

        return successResponse(res, formatted, type === 'leads' ? "Potential customers retrieved" : "Active customers retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch customers", 500, error);
    }
};

const updateCustomerCredit = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params; // tenantId
        const { creditLimit, paymentTerm } = req.body;

        // Check if relation exists, if not create one
        const relation = await prisma.distributorCustomer.upsert({
            where: {
                distributorId_tenantId: {
                    distributorId,
                    tenantId: id
                }
            },
            update: {
                creditLimit: parseFloat(creditLimit || 0),
                paymentTerm: parseInt(paymentTerm || 0)
            },
            create: {
                distributorId,
                tenantId: id,
                creditLimit: parseFloat(creditLimit || 0),
                paymentTerm: parseInt(paymentTerm || 0)
            }
        });

        return successResponse(res, relation, "Customer credit updated");
    } catch (error) {
        return errorResponse(res, "Failed to update customer credit", 500, error);
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const order = await prisma.wholesaleOrder.findFirst({
            where: { id, distributorId }
        });
        if (!order) return errorResponse(res, "Order not found", 404);

        const updated = await prisma.wholesaleOrder.update({
            where: { id },
            data: {
                status: status || undefined,
                paymentStatus: paymentStatus || undefined
            }
        });

        // TODO: Notification to Buyer

        return successResponse(res, updated, "Order status updated");
    } catch (error) {
        return errorResponse(res, "Failed to update order", 500, error);
    }
};

const getOrderById = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;

        const order = await prisma.wholesaleOrder.findFirst({
            where: { id, distributorId },
            include: {
                tenant: { select: { name: true, users: { select: { email: true, name: true }, take: 1 } } },
                items: { include: { wholesaleProduct: true } }
            }
        });

        if (!order) return errorResponse(res, "Order not found", 404);

        return successResponse(res, order, "Order retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch order", 500, error);
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);

        // 1. Total Revenue (PAID or DELIVERED orders)
        const revenueResult = await prisma.wholesaleOrder.aggregate({
            _sum: { totalAmount: true },
            where: {
                distributorId,
                status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] }
            }
        });
        const totalRevenue = revenueResult._sum.totalAmount || 0;

        // 2. Active Orders (PENDING, PROCESSING, SHIPPED)
        const activeOrders = await prisma.wholesaleOrder.count({
            where: {
                distributorId,
                status: { in: ['PENDING', 'PROCESSING', 'SHIPPED'] }
            }
        });

        // 3. Products in Stock (Count of products)
        const productsCount = await prisma.wholesaleProduct.count({
            where: {
                distributorId,
                isActive: true
            }
        });
        
        // 4. Low Stock Alerts
        const lowStockCount = await prisma.wholesaleProduct.count({
            where: {
                distributorId,
                isActive: true,
                stockQuantity: { lte: 10 } // Threshold 10
            }
        });

        return successResponse(res, {
            totalRevenue,
            activeOrders,
            productsCount,
            lowStockCount
        }, "Dashboard stats retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch dashboard stats", 500, error);
    }
};

// =======================
// DISCOUNT MANAGEMENT
// =======================

const getDiscounts = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const discounts = await prisma.wholesaleDiscount.findMany({
            where: { distributorId },
            include: { products: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, discounts, "Discounts retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch discounts", 500, error);
    }
};

const createDiscount = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { name, code, type, value, minOrderAmount, startDate, endDate, productIds } = req.body;

        const discount = await prisma.wholesaleDiscount.create({
            data: {
                distributorId,
                name,
                code,
                type: type || 'PERCENTAGE',
                value: parseFloat(value),
                minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                products: productIds && productIds.length > 0 ? {
                    connect: productIds.map(id => ({ id }))
                } : undefined
            },
            include: { products: true }
        });

        return successResponse(res, discount, "Discount created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create discount", 500, error);
    }
};

const updateDiscount = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { name, code, type, value, minOrderAmount, startDate, endDate, isActive, productIds } = req.body;

        const existing = await prisma.wholesaleDiscount.findFirst({ where: { id, distributorId } });
        if (!existing) return errorResponse(res, "Discount not found", 404);

        const discount = await prisma.wholesaleDiscount.update({
            where: { id },
            data: {
                name,
                code,
                type,
                value: value ? parseFloat(value) : undefined,
                minOrderAmount: minOrderAmount !== undefined ? parseFloat(minOrderAmount) : undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                products: productIds ? {
                    set: productIds.map(pid => ({ id: pid }))
                } : undefined
            },
            include: { products: true }
        });

        return successResponse(res, discount, "Discount updated");
    } catch (error) {
        return errorResponse(res, "Failed to update discount", 500, error);
    }
};

const deleteDiscount = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;

        const existing = await prisma.wholesaleDiscount.findFirst({ where: { id, distributorId } });
        if (!existing) return errorResponse(res, "Discount not found", 404);

        await prisma.wholesaleDiscount.delete({ where: { id } });
        return successResponse(res, null, "Discount deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete discount", 500, error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getCategories,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getOrders,
    getOrderById,
    updateOrderStatus,
    getCustomers,
    getShipments,
    getDashboardStats,
    getDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    updateCustomerCredit
};
