const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { distributor: true } });
    return user?.distributor?.id;
};

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

/**
 * PROMO TYPES:
 * - PERCENTAGE: Diskon persentase (e.g. 10% off)
 * - FIXED: Diskon nominal (e.g. Rp 5000 off)
 * - BUY_X_GET_Y: Beli X gratis Y (e.g. beli 3 gratis 1)
 * - BUNDLE: Beli bundle produk dengan harga spesial
 * - MIN_QTY_DISCOUNT: Diskon jika beli minimal qty tertentu
 * - FREE_ITEM: Gratis produk tertentu jika order >= amount
 */

// ============================================================
// GET ALL PROMOTIONS (active + inactive)
// ============================================================
const getPromotions = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { status } = req.query; // 'active', 'expired', 'upcoming', 'all'
        const now = new Date();

        // Get from SystemSettings (extended promos)
        const promos = await getSettings(`DIST_PROMOS_${distributorId}`);

        // Also get existing WholesaleDiscount records
        const discounts = await prisma.wholesaleDiscount.findMany({
            where: { distributorId },
            include: { products: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // Merge both sources
        const allPromos = [
            // Convert existing discounts to unified format
            ...discounts.map(d => ({
                id: d.id,
                source: 'database',
                name: d.name,
                code: d.code,
                type: d.type, // PERCENTAGE or FIXED
                value: d.value,
                minOrderAmount: d.minOrderAmount || 0,
                startDate: d.startDate,
                endDate: d.endDate,
                isActive: d.isActive,
                products: d.products,
                createdAt: d.createdAt,
                // Computed status
                status: !d.isActive ? 'INACTIVE' : new Date(d.endDate) < now ? 'EXPIRED' : new Date(d.startDate) > now ? 'UPCOMING' : 'ACTIVE',
            })),
            // Extended promos from settings
            ...promos.map(p => ({
                ...p,
                source: 'extended',
                status: !p.isActive ? 'INACTIVE' : new Date(p.endDate) < now ? 'EXPIRED' : new Date(p.startDate) > now ? 'UPCOMING' : 'ACTIVE',
            })),
        ];

        // Filter by status
        let filtered = allPromos;
        if (status === 'active') filtered = allPromos.filter(p => p.status === 'ACTIVE');
        else if (status === 'expired') filtered = allPromos.filter(p => p.status === 'EXPIRED');
        else if (status === 'upcoming') filtered = allPromos.filter(p => p.status === 'UPCOMING');

        // Sort: active first, then by date
        filtered.sort((a, b) => {
            const order = { ACTIVE: 0, UPCOMING: 1, INACTIVE: 2, EXPIRED: 3 };
            return (order[a.status] || 9) - (order[b.status] || 9) || new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Summary
        const summary = {
            total: allPromos.length,
            active: allPromos.filter(p => p.status === 'ACTIVE').length,
            upcoming: allPromos.filter(p => p.status === 'UPCOMING').length,
            expired: allPromos.filter(p => p.status === 'EXPIRED').length,
        };

        return successResponse(res, { promotions: filtered, summary }, "Promotions retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch promotions", 500, error);
    }
};

// ============================================================
// CREATE PROMOTION (extended types: BUY_X_GET_Y, BUNDLE, etc.)
// ============================================================
const createPromotion = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const {
            name, code, type, value, minOrderAmount,
            startDate, endDate, productIds, description,
            // Extended fields for BUY_X_GET_Y
            buyQty, freeQty, freeProductId, freeProductName,
            // Bundle
            bundleItems, bundlePrice,
            // Min qty discount
            minQty, discountPerUnit,
            // Free item threshold
            freeItemThreshold, freeItemProductId, freeItemProductName,
            // Targeting
            targetMerchantIds, targetCategories,
            // Limits
            maxUsage, maxUsagePerMerchant,
        } = req.body;

        if (!name || !type || !startDate || !endDate) {
            return errorResponse(res, "name, type, startDate, endDate wajib diisi", 400);
        }

        // For basic PERCENTAGE/FIXED, use existing WholesaleDiscount table
        if (type === 'PERCENTAGE' || type === 'FIXED') {
            if (!value) return errorResponse(res, "value wajib diisi untuk diskon", 400);

            const discount = await prisma.wholesaleDiscount.create({
                data: {
                    distributorId,
                    name,
                    code: code || null,
                    type,
                    value: parseFloat(value),
                    minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    products: productIds && productIds.length > 0 ? {
                        connect: productIds.map(id => ({ id }))
                    } : undefined
                },
                include: { products: { select: { id: true, name: true } } }
            });

            return successResponse(res, { ...discount, source: 'database', type }, "Promotion created", 201);
        }

        // For extended types, store in SystemSettings
        const key = `DIST_PROMOS_${distributorId}`;
        const promos = await getSettings(key);

        const promo = {
            id: `PROMO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name,
            code: code || null,
            type, // BUY_X_GET_Y, BUNDLE, MIN_QTY_DISCOUNT, FREE_ITEM
            description: description || '',
            startDate,
            endDate,
            isActive: true,
            productIds: productIds || [],
            minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
            // Type-specific config
            config: {},
            // Targeting
            targetMerchantIds: targetMerchantIds || [],
            targetCategories: targetCategories || [],
            // Limits
            maxUsage: maxUsage || null,
            maxUsagePerMerchant: maxUsagePerMerchant || null,
            usageCount: 0,
            createdAt: new Date().toISOString(),
            createdBy: req.user.userId,
        };

        // Set type-specific config
        switch (type) {
            case 'BUY_X_GET_Y':
                if (!buyQty || !freeQty) return errorResponse(res, "buyQty dan freeQty wajib untuk BUY_X_GET_Y", 400);
                promo.config = { buyQty: parseInt(buyQty), freeQty: parseInt(freeQty), freeProductId, freeProductName: freeProductName || 'Same product' };
                promo.description = promo.description || `Beli ${buyQty} Gratis ${freeQty}`;
                break;
            case 'BUNDLE':
                if (!bundleItems || !bundlePrice) return errorResponse(res, "bundleItems dan bundlePrice wajib untuk BUNDLE", 400);
                promo.config = { bundleItems, bundlePrice: parseFloat(bundlePrice) };
                promo.description = promo.description || `Bundle ${bundleItems.length} produk`;
                break;
            case 'MIN_QTY_DISCOUNT':
                if (!minQty || !discountPerUnit) return errorResponse(res, "minQty dan discountPerUnit wajib", 400);
                promo.config = { minQty: parseInt(minQty), discountPerUnit: parseFloat(discountPerUnit) };
                promo.description = promo.description || `Beli min ${minQty}, diskon Rp ${discountPerUnit}/unit`;
                break;
            case 'FREE_ITEM':
                if (!freeItemThreshold) return errorResponse(res, "freeItemThreshold wajib", 400);
                promo.config = { threshold: parseFloat(freeItemThreshold), freeProductId: freeItemProductId, freeProductName: freeItemProductName || 'Bonus item' };
                promo.description = promo.description || `Gratis ${freeItemProductName || 'item'} untuk order >= Rp ${freeItemThreshold}`;
                break;
            default:
                return errorResponse(res, `Type '${type}' tidak valid. Gunakan: PERCENTAGE, FIXED, BUY_X_GET_Y, BUNDLE, MIN_QTY_DISCOUNT, FREE_ITEM`, 400);
        }

        promos.push(promo);
        await saveSettings(key, promos, 'Extended promotions');

        return successResponse(res, promo, "Promotion created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create promotion", 500, error);
    }
};

// ============================================================
// UPDATE PROMOTION
// ============================================================
const updatePromotion = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { isActive, name, endDate } = req.body;

        // Check if it's a database discount
        const dbDiscount = await prisma.wholesaleDiscount.findFirst({ where: { id, distributorId } });
        if (dbDiscount) {
            const updated = await prisma.wholesaleDiscount.update({
                where: { id },
                data: {
                    isActive: isActive !== undefined ? isActive : undefined,
                    name: name || undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                }
            });
            return successResponse(res, updated, "Promotion updated");
        }

        // Check extended promos
        const key = `DIST_PROMOS_${distributorId}`;
        const promos = await getSettings(key);
        const idx = promos.findIndex(p => p.id === id);
        if (idx < 0) return errorResponse(res, "Promotion not found", 404);

        if (isActive !== undefined) promos[idx].isActive = isActive;
        if (name) promos[idx].name = name;
        if (endDate) promos[idx].endDate = endDate;
        promos[idx].updatedAt = new Date().toISOString();

        await saveSettings(key, promos, 'Extended promotions');
        return successResponse(res, promos[idx], "Promotion updated");
    } catch (error) {
        return errorResponse(res, "Failed to update promotion", 500, error);
    }
};

// ============================================================
// DELETE PROMOTION
// ============================================================
const deletePromotion = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;

        // Try database first
        const dbDiscount = await prisma.wholesaleDiscount.findFirst({ where: { id, distributorId } });
        if (dbDiscount) {
            await prisma.wholesaleDiscount.delete({ where: { id } });
            return successResponse(res, null, "Promotion deleted");
        }

        // Try extended
        const key = `DIST_PROMOS_${distributorId}`;
        let promos = await getSettings(key);
        const before = promos.length;
        promos = promos.filter(p => p.id !== id);
        if (promos.length === before) return errorResponse(res, "Promotion not found", 404);

        await saveSettings(key, promos, 'Extended promotions');
        return successResponse(res, null, "Promotion deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete promotion", 500, error);
    }
};

// ============================================================
// GET ACTIVE PROMOS FOR MERCHANT (public - used by merchant app & marketplace)
// ============================================================
const getActivePromosForMerchant = async (req, res) => {
    try {
        const { distributorId } = req.params;
        if (!distributorId) return errorResponse(res, "distributorId required", 400);

        const now = new Date();

        // Database discounts
        const discounts = await prisma.wholesaleDiscount.findMany({
            where: {
                distributorId,
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: { products: { select: { id: true, name: true, pricingTiers: true } } },
        });

        // Extended promos
        const promos = await getSettings(`DIST_PROMOS_${distributorId}`);
        const activeExtended = promos.filter(p =>
            p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now
        );

        const allActive = [
            ...discounts.map(d => ({
                id: d.id,
                name: d.name,
                code: d.code,
                type: d.type,
                value: d.value,
                minOrderAmount: d.minOrderAmount,
                products: d.products,
                endDate: d.endDate,
                description: d.type === 'PERCENTAGE' ? `Diskon ${d.value}%` : `Potongan Rp ${d.value.toLocaleString('id-ID')}`,
            })),
            ...activeExtended.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code,
                type: p.type,
                value: p.config?.buyQty || p.config?.discountPerUnit || 0,
                minOrderAmount: p.minOrderAmount,
                products: [],
                endDate: p.endDate,
                description: p.description,
                config: p.config,
            })),
        ];

        return successResponse(res, allActive, "Active promotions retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch promotions", 500, error);
    }
};

// ============================================================
// APPLY PROMO TO ORDER (validation + calculation)
// ============================================================
const applyPromoToOrder = async (req, res) => {
    try {
        const { distributorId, promoCode, items, orderTotal } = req.body;
        if (!distributorId || !promoCode) return errorResponse(res, "distributorId and promoCode required", 400);

        const now = new Date();

        // Search in database discounts
        let promo = await prisma.wholesaleDiscount.findFirst({
            where: { distributorId, code: promoCode, isActive: true, startDate: { lte: now }, endDate: { gte: now } },
            include: { products: { select: { id: true } } }
        });

        let discount = 0;
        let freeItems = [];
        let promoType = '';
        let promoName = '';

        if (promo) {
            promoType = promo.type;
            promoName = promo.name;

            // Check min order
            if (promo.minOrderAmount && orderTotal < promo.minOrderAmount) {
                return errorResponse(res, `Minimum order Rp ${promo.minOrderAmount.toLocaleString('id-ID')} untuk promo ini`, 400);
            }

            if (promo.type === 'PERCENTAGE') {
                discount = Math.round(orderTotal * (promo.value / 100));
            } else if (promo.type === 'FIXED') {
                discount = promo.value;
            }
        } else {
            // Search in extended promos
            const promos = await getSettings(`DIST_PROMOS_${distributorId}`);
            const extPromo = promos.find(p =>
                p.code === promoCode && p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now
            );

            if (!extPromo) return errorResponse(res, "Kode promo tidak valid atau sudah expired", 404);

            // Check usage limits
            if (extPromo.maxUsage && extPromo.usageCount >= extPromo.maxUsage) {
                return errorResponse(res, "Promo sudah mencapai batas penggunaan", 400);
            }

            promoType = extPromo.type;
            promoName = extPromo.name;

            switch (extPromo.type) {
                case 'BUY_X_GET_Y': {
                    const { buyQty, freeQty, freeProductName } = extPromo.config;
                    // Check if any item meets buyQty
                    const qualifying = (items || []).find(i => i.quantity >= buyQty);
                    if (qualifying) {
                        freeItems.push({ productName: freeProductName || qualifying.productName || 'Bonus', quantity: freeQty, note: `Gratis dari promo ${extPromo.name}` });
                    } else {
                        return errorResponse(res, `Beli minimal ${buyQty} item untuk mendapatkan promo ini`, 400);
                    }
                    break;
                }
                case 'BUNDLE': {
                    const { bundlePrice } = extPromo.config;
                    discount = Math.max(0, orderTotal - bundlePrice);
                    break;
                }
                case 'MIN_QTY_DISCOUNT': {
                    const { minQty, discountPerUnit } = extPromo.config;
                    const totalQty = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
                    if (totalQty >= minQty) {
                        discount = totalQty * discountPerUnit;
                    } else {
                        return errorResponse(res, `Beli minimal ${minQty} unit untuk promo ini`, 400);
                    }
                    break;
                }
                case 'FREE_ITEM': {
                    const { threshold, freeProductName: fpName } = extPromo.config;
                    if (orderTotal >= threshold) {
                        freeItems.push({ productName: fpName || 'Bonus item', quantity: 1, note: `Gratis untuk order >= Rp ${threshold.toLocaleString('id-ID')}` });
                    } else {
                        return errorResponse(res, `Order minimal Rp ${threshold.toLocaleString('id-ID')} untuk promo ini`, 400);
                    }
                    break;
                }
            }

            // Increment usage
            const key = `DIST_PROMOS_${distributorId}`;
            const allPromos = await getSettings(key);
            const idx = allPromos.findIndex(p => p.id === extPromo.id);
            if (idx >= 0) {
                allPromos[idx].usageCount = (allPromos[idx].usageCount || 0) + 1;
                await saveSettings(key, allPromos, 'Extended promotions');
            }
        }

        return successResponse(res, {
            valid: true,
            promoCode,
            promoName,
            promoType,
            discount: Math.round(discount),
            freeItems,
            finalTotal: Math.max(0, orderTotal - discount),
        }, "Promo applied");
    } catch (error) {
        return errorResponse(res, "Failed to apply promo", 500, error);
    }
};

module.exports = {
    getPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getActivePromosForMerchant,
    applyPromoToOrder,
};
