const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');

// =======================
// PRODUCT MANAGEMENT
// =======================

// Get approved distributors for marketplace
const getDistributors = async (req, res) => {
    try {
        const distributors = await prisma.distributor.findMany({
            where: { approvalStatus: 'APPROVED' },
            select: {
                id: true,
                companyName: true,
                _count: {
                    select: { wholesaleProducts: { where: { isActive: true } } }
                }
            },
            orderBy: { companyName: 'asc' }
        });

        const result = distributors.map(d => ({
            id: d.id,
            companyName: d.companyName,
            productCount: d._count.wholesaleProducts,
        }));

        return successResponse(res, result, "Distributors retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch distributors", 500, error);
    }
};

// Get all active wholesale products (For Mobile App - Marketplace view)
const getProducts = async (req, res) => {
    try {
        const { category, search, distributorId } = req.query;

        const where = {
            isActive: true,
            wholesaleCategoryId: (category && category !== 'Semua') ? category : undefined,
            name: search ? { contains: search, mode: 'insensitive' } : undefined,
            // Only show products from APPROVED distributors
            distributor: { approvalStatus: 'APPROVED' },
            distributorId: distributorId || undefined,
        };

        const products = await prisma.wholesaleProduct.findMany({
            where,
            include: {
                wholesaleCategory: true,
                distributor: {
                    select: {
                        id: true,
                        companyName: true,
                        approvalStatus: true,
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Normalize for mobile: extract base price from pricingTiers[0]
        const normalized = products.map(p => {
            let tiers = [];
            try { tiers = Array.isArray(p.pricingTiers) ? p.pricingTiers : JSON.parse(p.pricingTiers || '[]'); } catch (_) {}
            const basePrice = tiers.length > 0 ? (tiers[tiers.length - 1].price || 0) : 0;
            const images = Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []);
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                imageUrl: images[0] || null,
                images,
                price: basePrice,
                wholesalePrice: basePrice,
                pricingTiers: tiers,
                moq: p.moq,
                stockQuantity: p.stockQuantity,
                unit: p.unit,
                category: p.wholesaleCategory?.name || null,
                categoryId: p.wholesaleCategoryId,
                distributorId: p.distributorId,
                supplierName: p.distributor?.companyName || null,
                distributor: p.distributor,
                isActive: p.isActive,
                createdAt: p.createdAt,
            };
        });

        return successResponse(res, normalized, "Wholesale products retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch wholesale products", 500, error);
    }
};

// =======================
// COUPON MANAGEMENT
// =======================

// Create Coupon (Admin)
const createCoupon = async (req, res) => {
    try {
        const { code, type, value, minOrder, maxDiscount, startDate, endDate, isActive } = req.body;

        // Check uniqueness
        const exist = await prisma.wholesaleCoupon.findUnique({ where: { code } });
        if (exist) return errorResponse(res, "Coupon code already exists", 400);

        const coupon = await prisma.wholesaleCoupon.create({
            data: {
                code, type,
                value: parseFloat(value),
                minOrder: parseFloat(minOrder || 0),
                maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive: isActive ?? true
            }
        });
        return successResponse(res, coupon, "Coupon created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create coupon", 500, error);
    }
};

// Get Coupons (Admin)
const getCoupons = async (req, res) => {
    try {
        const coupons = await prisma.wholesaleCoupon.findMany({ orderBy: { createdAt: 'desc' } });
        return successResponse(res, coupons, "Coupons retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch coupons", 500, error);
    }
};

// Toggle Coupon Status (Admin)
const toggleCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const coupon = await prisma.wholesaleCoupon.update({
            where: { id },
            data: { isActive }
        });
        return successResponse(res, coupon, "Coupon updated");
    } catch (error) {
        return errorResponse(res, "Failed update coupon", 500, error);
    }
};

// Delete Coupon (Admin)
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.wholesaleCoupon.delete({ where: { id } });
        return successResponse(res, null, "Coupon deleted");
    } catch (error) {
        return errorResponse(res, "Failed delete coupon", 500, error);
    }
}

// Validate Coupon (Mobile/API)
const validateCoupon = async (req, res) => {
    try {
        const { code, totalAmount } = req.body;
        const coupon = await prisma.wholesaleCoupon.findUnique({ where: { code } });

        if (!coupon) return errorResponse(res, "Invalid coupon code", 404);
        if (!coupon.isActive) return errorResponse(res, "Coupon is inactive", 400);

        const now = new Date();
        if (coupon.startDate && now < coupon.startDate) return errorResponse(res, "Coupon not yet started", 400);
        if (coupon.endDate && now > coupon.endDate) return errorResponse(res, "Coupon expired", 400);

        if (totalAmount < coupon.minOrder) return errorResponse(res, `Minimum order Rp ${coupon.minOrder.toLocaleString()}`, 400);

        // Calculate Discount
        let discount = 0;
        if (coupon.type === 'FIXED') {
            discount = coupon.value;
        } else if (coupon.type === 'PERCENTAGE') {
            discount = (totalAmount * coupon.value) / 100;
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else if (coupon.type === 'FREE_SHIPPING') {
            // For simplicity, we just return the coupon type. The exact shipping deduction happens in order creation or frontend logic.
            // But usually validate returns the potential discount value.
            discount = 0; // Handled as shipping deduction
        }

        return successResponse(res, { coupon, discount }, "Coupon is valid");
    } catch (error) {
        return errorResponse(res, "Validation failed", 500, error);
    }
};

// Create Product (Admin - assigns to a specific distributor)
const createProduct = async (req, res) => {
    try {
        const { name, categoryId, price, stock, supplierName, imageUrl, description, distributorId, pricingTiers, moq, unit } = req.body;

        if (!name) return errorResponse(res, "Product name is required", 400);
        if (!distributorId) return errorResponse(res, "distributorId is required", 400);

        // Build pricingTiers from simple price if not provided
        let tiers = pricingTiers;
        if (!tiers && price) {
            tiers = [{ minQty: 1, price: parseFloat(price) }];
        }
        if (!tiers) return errorResponse(res, "pricingTiers or price is required", 400);
        if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch(_) {} }

        const product = await prisma.wholesaleProduct.create({
            data: {
                distributorId,
                name,
                wholesaleCategoryId: categoryId || undefined,
                description,
                images: imageUrl ? [imageUrl] : [],
                pricingTiers: tiers,
                moq: moq ? parseInt(moq) : 1,
                stockQuantity: stock ? parseInt(stock) : 0,
                unit: unit || 'pcs',
                isActive: true,
            }
        });
        return successResponse(res, product, "Product created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create wholesale product", 500, error);
    }
};

// =======================
// ORDER MANAGEMENT
// =======================

// Create Order (Merchant buys items)
const createOrder = async (req, res) => {
    try {
        const { tenantId } = req.user; // [SECURE] Trust token
        const { items, paymentMethod, shippingAddress, shippingCost, couponCode } = req.body;
        // items: [{ productId, quantity }] (Price should be fetched from DB for security)

        if (!items || items.length === 0) return errorResponse(res, "No items provided", 400);

        // 1. Fetch Products to get Price and Distributor
        const productIds = items.map(i => i.productId);
        const products = await prisma.wholesaleProduct.findMany({
            where: { id: { in: productIds } }
        });

        if (products.length !== items.length) return errorResponse(res, "Some products not found", 400);

        // 2. Validate Distributor (Must be single distributor per order)
        const distributorId = products[0].distributorId;
        const isMixed = products.some(p => p.distributorId !== distributorId);
        if (isMixed) {
            return errorResponse(res, "Cannot checkout items from multiple distributors in one order. Please checkout separately.", 400);
        }

        // 3. Map items with real price
        const orderItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            // TODO: Implement Tier Pricing logic based on quantity
            // For now, use base price or first tier
            let price = product.price || 0; // Default fallback
            if (product.pricingTiers) {
                // Find matching tier
                // pricingTiers: [{minQty, price}]
                let tiers = [];
                try { tiers = typeof product.pricingTiers === 'string' ? JSON.parse(product.pricingTiers) : product.pricingTiers; } catch(_) {}
                if (Array.isArray(tiers)) {
                    // Sort descending by minQty
                    tiers.sort((a, b) => b.minQty - a.minQty);
                    const tier = tiers.find(t => item.quantity >= t.minQty);
                    if (tier) price = tier.price;
                }
            }
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: price
            };
        });

        // Calculate subtotal
        let subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let finalShippingCost = parseFloat(shippingCost || 0);
        let discountAmount = 0;

        // Apply Coupon if present
        if (couponCode) {
            const coupon = await prisma.wholesaleCoupon.findUnique({ where: { code: couponCode } });
            if (coupon && coupon.isActive) {
                // Basic validation again just in case
                if (subtotal >= coupon.minOrder) {
                    if (coupon.type === 'FIXED') {
                        discountAmount = coupon.value;
                    } else if (coupon.type === 'PERCENTAGE') {
                        discountAmount = (subtotal * coupon.value) / 100;
                        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) discountAmount = coupon.maxDiscount;
                    } else if (coupon.type === 'FREE_SHIPPING') {
                        discountAmount = finalShippingCost; // Discount covers shipping
                    }
                }
            }
        }

        // Get Service Fee
        const feeSetting = await prisma.systemSettings.findUnique({ where: { key: 'WHOLESALE_SERVICE_FEE' } });
        const feeTypeSetting = await prisma.systemSettings.findUnique({ where: { key: 'WHOLESALE_SERVICE_FEE_TYPE' } });
        const minCapSetting = await prisma.systemSettings.findUnique({ where: { key: 'WHOLESALE_FEE_CAP_MIN' } });
        const maxCapSetting = await prisma.systemSettings.findUnique({ where: { key: 'WHOLESALE_FEE_CAP_MAX' } });
        const feeVal = feeSetting ? parseFloat(feeSetting.value) : 0;
        const feeType = feeTypeSetting ? String(feeTypeSetting.value) : 'FLAT';
        let serviceFee = 0;
        if (feeType === 'PERCENT') {
            serviceFee = (subtotal * feeVal) / 100;
        } else {
            serviceFee = feeVal;
        }
        const minCap = minCapSetting ? parseFloat(minCapSetting.value) : undefined;
        const maxCap = maxCapSetting ? parseFloat(maxCapSetting.value) : undefined;
        if (minCap !== undefined && serviceFee < minCap) serviceFee = minCap;
        if (maxCap !== undefined && serviceFee > maxCap) serviceFee = maxCap;

        const totalAmount = subtotal + finalShippingCost + serviceFee - discountAmount;

        // Generate Order Number
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.wholesaleOrder.create({
                data: {
                    tenantId,
                    distributorId,
                    orderNumber,
                    totalAmount: totalAmount > 0 ? totalAmount : 0,
                    serviceFee,
                    shippingCost: finalShippingCost,
                    status: 'PENDING',
                    paymentMethod,
                    shippingAddress,
                    paymentDetails: {
                        discountAmount,
                        couponCode: couponCode || null,
                    },
                    items: {
                        create: orderItems.map(i => ({
                            wholesaleProductId: i.productId,
                            quantity: i.quantity,
                            unitPrice: i.price,
                            subtotal: i.price * i.quantity,
                        }))
                    }
                }
            });

            // Decrease Stock
            for (const item of orderItems) {
                await tx.wholesaleProduct.update({
                    where: { id: item.productId },
                    data: { stockQuantity: { decrement: item.quantity } }
                });
            }

            return order;
        });

        return successResponse(res, result, "Order created successfully", 201);
    } catch (error) {
        return errorResponse(res, "Failed to place order", 500, error);
    }
};

// Get Orders (Admin or Merchant)
const getOrders = async (req, res) => {
    try {
        const { role, tenantId: userTenantId } = req.user;
        const { status, tenantId } = req.query;

        const where = {
            status: status || undefined
        };

        // [SECURE] If not Admin, force own tenant
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            where.tenantId = userTenantId;
        } else if (tenantId) {
            where.tenantId = tenantId;
        }

        const orders = await prisma.wholesaleOrder.findMany({
            where,
            include: {
                items: {
                    include: {
                        wholesaleProduct: {
                            select: { id: true, name: true, unit: true, images: true }
                        }
                    }
                },
                tenant: { select: { name: true } },
                distributor: { select: { id: true, companyName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Normalize items.productName for mobile
        const normalized = orders.map(o => ({
            ...o,
            items: o.items.map(item => ({
                ...item,
                productName: item.wholesaleProduct?.name || 'Produk',
            }))
        }));

        return successResponse(res, normalized, "Orders retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch orders", 500, error);
    }
};

// Update Order Status (Admin)
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, pickupCode } = req.body;

        // Validate status against enum
        const validStatuses = ['PENDING', 'PAID', 'PROCESSED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return errorResponse(res, `Invalid status. Allowed: ${validStatuses.join(', ')}`, 400);
        }

        const order = await prisma.wholesaleOrder.update({
            where: { id },
            data: { status, pickupCode: pickupCode !== undefined ? pickupCode : undefined }
        });

        if (status === 'PAID' && order.serviceFee && order.serviceFee > 0) {
            try {
                await prisma.platformRevenue.create({
                    data: {
                        amount: order.serviceFee,
                        source: 'OTHER',
                        description: `Wholesale Service Fee - ${order.id}`,
                        referenceId: order.id
                    }
                });
            } catch (revenueErr) {
                console.warn('PlatformRevenue log skipped:', revenueErr.message);
            }
        }

        // TODO: Notification logic here

        return successResponse(res, order, "Order status updated");
    } catch (error) {
        return errorResponse(res, "Failed to update order", 500, error);
    }
};

const getCategories = async (req, res) => {
    try {
        const cats = await prisma.wholesaleCategory.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        return successResponse(res, cats, "Categories retrieved");
    } catch (error) {
        return errorResponse(res, "Failed fetch categories", 500, error);
    }
};

// Admin: Create Category
const createCategory = async (req, res) => {
    try {
        const { name, slug } = req.body;
        if (!name) return errorResponse(res, "Category name is required", 400);
        // Auto-generate slug if not provided
        const finalSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const cat = await prisma.wholesaleCategory.create({
            data: {
                name,
                slug: finalSlug,
                isActive: true
            }
        });
        return successResponse(res, cat, "Category created", 201);
    } catch (error) {
        return errorResponse(res, "Failed create category", 500, error);
    }
}

// Update Product (Admin)
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, categoryId, price, stock, imageUrl, description, isActive, pricingTiers, moq, unit } = req.body;

        let tiers = pricingTiers;
        if (!tiers && price !== undefined) {
            tiers = [{ minQty: 1, price: parseFloat(price) }];
        }
        if (tiers && typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch(_) {} }

        const product = await prisma.wholesaleProduct.update({
            where: { id },
            data: {
                name,
                wholesaleCategoryId: categoryId !== undefined ? (categoryId || null) : undefined,
                images: imageUrl ? [imageUrl] : undefined,
                description,
                pricingTiers: tiers !== undefined ? tiers : undefined,
                moq: moq ? parseInt(moq) : undefined,
                stockQuantity: stock !== undefined ? parseInt(stock) : undefined,
                unit,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });
        return successResponse(res, product, "Product updated");
    } catch (error) {
        return errorResponse(res, "Failed to update wholesale product", 500, error);
    }
};

// Limit Product Deletion (Admin)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.wholesaleProduct.delete({ where: { id } });
        return successResponse(res, null, "Product deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete wholesale product", 500, error);
    }
};

// Update Category (Admin)
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;
        const cat = await prisma.wholesaleCategory.update({
            where: { id },
            data: {
                name,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });
        return successResponse(res, cat, "Category updated");
    } catch (error) {
        return errorResponse(res, "Failed to update category", 500, error);
    }
};

// Delete Category (Admin)
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if has products
        const count = await prisma.wholesaleProduct.count({ where: { categoryId: id } });
        if (count > 0) {
            return errorResponse(res, "Cannot delete category with existing products", 400);
        }

        await prisma.wholesaleCategory.delete({ where: { id } });
        return successResponse(res, null, "Category deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete category", 500, error);
    }
};

// Upload Proof
const uploadProof = async (req, res) => {
    try {
        if (!req.file) return errorResponse(res, "No file uploaded", 400);
        const url = `/uploads/proofs/${req.file.filename}`;
        const { orderId } = req.body || {};
        if (orderId) {
            try {
                await prisma.wholesaleOrder.update({
                    where: { id: orderId },
                    data: { proofUrl: url }
                });
            } catch (_) {}
        }
        return successResponse(res, { url }, "Proof uploaded");
    } catch (error) {
        return errorResponse(res, "Upload failed", 500, error);
    }
};

// Scan Order (Merchant receives goods)
const scanOrder = async (req, res) => {
    try {
        const { pickupCode } = req.body;
        const order = await prisma.wholesaleOrder.findFirst({
            where: {
                OR: [
                    { id: pickupCode },
                    { pickupCode: pickupCode }
                ]
            }
        });

        if (!order) return errorResponse(res, "Order not found", 404);
        if (order.status !== 'SHIPPED') {
            return errorResponse(res, `Order cannot be received. Status: ${order.status}`, 400);
        }

        const updated = await prisma.wholesaleOrder.update({
            where: { id: order.id },
            data: { status: 'DELIVERED' }
        });

        return successResponse(res, updated, "Order received successfully");
    } catch (error) {
        return errorResponse(res, "Scan failed", 500, error);
    }
};

module.exports = {
    uploadProof,
    scanOrder, // [NEW]
    getDistributors,
    getProducts,
    createProduct,
    createOrder,
    getOrders,
    updateOrderStatus,
    getCategories,
    createCategory,
    updateProduct,
    deleteProduct,
    updateCategory,
    deleteCategory,
    createCoupon,
    getCoupons,
    toggleCoupon,
    deleteCoupon,
    validateCoupon,

    createBanner: async (req, res) => {
        try {
            const { title, imageUrl, description, isActive, actionType, actionTarget } = req.body;
            const banner = await prisma.banner.create({
                data: {
                    title,
                    imageUrl,
                    description,
                    isActive: isActive ?? true,
                    actionType: actionType || "NONE",
                    actionTarget,
                },
            });
            return successResponse(res, banner, "Banner created", 201);
        } catch (error) {
            return errorResponse(res, "Failed to create banner", 500, error);
        }
    },

    getBanners: async (req, res) => {
        try {
            const banners = await prisma.banner.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            return successResponse(res, banners, "Banners retrieved");
        } catch (error) {
            return errorResponse(res, "Failed to fetch banners", 500, error);
        }
    },

    getAllBanners: async (req, res) => {
        try {
            const banners = await prisma.banner.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return successResponse(res, banners, "Banners retrieved");
        } catch (error) {
            return errorResponse(res, "Failed to fetch banners", 500, error);
        }
    },

    uploadBannerImage: async (req, res) => {
        try {
            if (!req.file) {
                return errorResponse(res, "No file uploaded", 400);
            }

            const host = req.get('host');
            const protocol = req.protocol;
            const imageUrl = `${protocol}://${host}/uploads/banners/${req.file.filename}`;

            return successResponse(res, { imageUrl }, "Banner uploaded", 201);
        } catch (error) {
            return errorResponse(res, "Failed to upload banner", 500, error);
        }
    },

    deleteBanner: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.banner.delete({ where: { id } });
            return successResponse(res, null, "Banner deleted");
        } catch (error) {
            return errorResponse(res, "Failed to delete banner", 500, error);
        }
    },

    updateBanner: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, imageUrl, description, isActive, actionType, actionTarget } = req.body;
            const banner = await prisma.banner.update({
                where: { id },
                data: {
                    title,
                    imageUrl,
                    description,
                    isActive: isActive !== undefined ? isActive : undefined,
                    actionType,
                    actionTarget,
                }
            });
            return successResponse(res, banner, "Banner updated");
        } catch (error) {
            return errorResponse(res, "Failed to update banner", 500, error);
        }
    },

    // [NEW] Update Coupon
    updateCoupon: async (req, res) => {
        try {
            const { id } = req.params;
            const { code, type, value, minOrder, maxDiscount, startDate, endDate, isActive } = req.body;

            const coupon = await prisma.wholesaleCoupon.update({
                where: { id },
                data: {
                    code, type,
                    value: value ? parseFloat(value) : undefined,
                    minOrder: minOrder !== undefined ? parseFloat(minOrder) : undefined,
                    maxDiscount: maxDiscount !== undefined ? parseFloat(maxDiscount) : undefined,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                    isActive: isActive !== undefined ? isActive : undefined
                }
            });
            return successResponse(res, coupon, "Coupon updated");
        } catch (error) {
            return errorResponse(res, "Failed to update coupon", 500, error);
        }
    }
};

