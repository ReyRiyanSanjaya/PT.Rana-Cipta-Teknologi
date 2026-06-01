const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

// Helper to get distributorId
const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { distributor: true }
    });
    return user?.distributor?.id;
};

// =======================
// SUBSCRIPTION & PLAN INFO
// =======================

// Plan tier definitions with limits
const PLAN_TIERS = {
    STARTER: {
        name: 'Starter',
        maxProducts: 50,
        maxOrders: 100,
        maxCustomers: 30,
        maxWarehouses: 1,
        features: ['Manajemen Produk Dasar', 'Pesanan Masuk', 'Laporan Sederhana', '1 Gudang'],
        price: 0,
    },
    PROFESSIONAL: {
        name: 'Professional',
        maxProducts: 500,
        maxOrders: 1000,
        maxCustomers: 200,
        maxWarehouses: 3,
        features: ['Semua fitur Starter', 'Diskon & Promosi', 'Manajemen Kredit', 'Peta Akuisisi', '3 Gudang', 'Export Data', 'Laporan Lengkap'],
        price: 299000,
    },
    ENTERPRISE: {
        name: 'Enterprise',
        maxProducts: -1, // unlimited
        maxOrders: -1,
        maxCustomers: -1,
        maxWarehouses: -1,
        features: ['Semua fitur Professional', 'Produk Unlimited', 'Pesanan Unlimited', 'Pelanggan Unlimited', 'Gudang Unlimited', 'API Access', 'Priority Support', 'Custom Branding', 'Multi-user Access'],
        price: 799000,
    }
};

// Determine distributor's current plan tier based on approval status
const getDistributorPlanTier = (distributor) => {
    // All approved distributors get ENTERPRISE for now (can be extended with actual plan field)
    if (distributor.approvalStatus === 'APPROVED') return 'ENTERPRISE';
    return 'STARTER';
};

/**
 * GET /distributor/subscription/plan
 * Returns current plan info, usage stats, and limits
 */
const getPlanInfo = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            include: {
                user: { select: { name: true, email: true, createdAt: true } },
                warehouses: true,
            }
        });

        if (!distributor) return errorResponse(res, "Distributor not found", 404);

        // Get current usage
        const [productsCount, ordersThisMonth, customersCount] = await Promise.all([
            prisma.wholesaleProduct.count({ where: { distributorId } }),
            prisma.wholesaleOrder.count({
                where: {
                    distributorId,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                }
            }),
            prisma.distributorCustomer.count({ where: { distributorId } })
        ]);

        const planTier = getDistributorPlanTier(distributor);
        const plan = PLAN_TIERS[planTier];

        // Calculate subscription dates
        const createdAt = distributor.createdAt;
        const approvedAt = distributor.approvedAt;

        // For enterprise, subscription doesn't expire (or set to 1 year from approval)
        let subscriptionEndsAt = null;
        if (approvedAt) {
            subscriptionEndsAt = new Date(approvedAt);
            subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
        }

        const daysRemaining = subscriptionEndsAt
            ? Math.max(0, Math.ceil((subscriptionEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;

        return successResponse(res, {
            plan: {
                tier: planTier,
                name: plan.name,
                price: plan.price,
                features: plan.features,
                limits: {
                    maxProducts: plan.maxProducts,
                    maxOrders: plan.maxOrders,
                    maxCustomers: plan.maxCustomers,
                    maxWarehouses: plan.maxWarehouses,
                }
            },
            usage: {
                products: productsCount,
                ordersThisMonth,
                customers: customersCount,
                warehouses: distributor.warehouses.length,
            },
            subscription: {
                status: distributor.approvalStatus === 'APPROVED' ? 'ACTIVE' : 'PENDING',
                startDate: approvedAt || createdAt,
                endDate: subscriptionEndsAt,
                daysRemaining,
            },
            distributor: {
                id: distributor.id,
                companyName: distributor.companyName,
                approvalStatus: distributor.approvalStatus,
                balance: distributor.balance,
            }
        }, "Plan info retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch plan info", 500, error);
    }
};

/**
 * GET /distributor/subscription/billing
 * Returns billing history (revenue from orders, platform fees, etc.)
 */
const getBillingHistory = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        // Get monthly revenue summary (last 6 months)
        const months = 6;
        const billingHistory = [];
        const now = new Date();

        for (let i = 0; i < months; i++) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            const [orderStats, paidOrders] = await Promise.all([
                prisma.wholesaleOrder.aggregate({
                    where: {
                        distributorId,
                        createdAt: { gte: monthStart, lte: monthEnd }
                    },
                    _sum: { totalAmount: true },
                    _count: { _all: true }
                }),
                prisma.wholesaleOrder.count({
                    where: {
                        distributorId,
                        paymentStatus: 'PAID',
                        createdAt: { gte: monthStart, lte: monthEnd }
                    }
                })
            ]);

            const revenue = orderStats._sum.totalAmount || 0;
            const platformFee = Math.round(revenue * 0.02); // 2% platform fee simulation

            billingHistory.push({
                month: monthStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                monthKey: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
                totalOrders: orderStats._count._all,
                paidOrders,
                revenue,
                platformFee,
                netRevenue: revenue - platformFee,
            });
        }

        // Get all-time totals
        const allTimeStats = await prisma.wholesaleOrder.aggregate({
            where: { distributorId, paymentStatus: 'PAID' },
            _sum: { totalAmount: true },
            _count: { _all: true }
        });

        return successResponse(res, {
            history: billingHistory,
            allTime: {
                totalRevenue: allTimeStats._sum.totalAmount || 0,
                totalOrders: allTimeStats._count._all,
                totalPlatformFees: Math.round((allTimeStats._sum.totalAmount || 0) * 0.02),
            }
        }, "Billing history retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch billing history", 500, error);
    }
};

/**
 * GET /distributor/subscription/usage
 * Returns detailed usage analytics
 */
const getUsageAnalytics = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // This month stats
        const [thisMonthOrders, thisMonthRevenue, newCustomersThisMonth] = await Promise.all([
            prisma.wholesaleOrder.count({
                where: { distributorId, createdAt: { gte: thisMonthStart } }
            }),
            prisma.wholesaleOrder.aggregate({
                where: { distributorId, paymentStatus: 'PAID', createdAt: { gte: thisMonthStart } },
                _sum: { totalAmount: true }
            }),
            prisma.distributorCustomer.count({
                where: { distributorId, createdAt: { gte: thisMonthStart } }
            })
        ]);

        // Last month stats (for comparison)
        const [lastMonthOrders, lastMonthRevenue] = await Promise.all([
            prisma.wholesaleOrder.count({
                where: { distributorId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
            prisma.wholesaleOrder.aggregate({
                where: { distributorId, paymentStatus: 'PAID', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
                _sum: { totalAmount: true }
            })
        ]);

        // API calls simulation (based on orders + product views)
        const apiCallsThisMonth = thisMonthOrders * 5 + newCustomersThisMonth * 3;

        // Storage usage (based on products with images)
        const productsWithImages = await prisma.wholesaleProduct.count({
            where: { distributorId, images: { not: null } }
        });
        const storageUsedMB = productsWithImages * 2.5; // ~2.5MB per product with images

        return successResponse(res, {
            thisMonth: {
                orders: thisMonthOrders,
                revenue: thisMonthRevenue._sum.totalAmount || 0,
                newCustomers: newCustomersThisMonth,
                apiCalls: apiCallsThisMonth,
                storageUsedMB: Math.round(storageUsedMB),
            },
            lastMonth: {
                orders: lastMonthOrders,
                revenue: lastMonthRevenue._sum.totalAmount || 0,
            },
            growth: {
                orders: lastMonthOrders > 0 ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100) : 0,
                revenue: (lastMonthRevenue._sum.totalAmount || 0) > 0
                    ? Math.round((((thisMonthRevenue._sum.totalAmount || 0) - (lastMonthRevenue._sum.totalAmount || 0)) / (lastMonthRevenue._sum.totalAmount || 1)) * 100)
                    : 0,
            },
            limits: {
                storageMaxMB: 5000, // 5GB
                apiCallsMax: 10000,
            }
        }, "Usage analytics retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch usage analytics", 500, error);
    }
};

/**
 * GET /distributor/subscription/plans
 * Returns available plan tiers for upgrade comparison
 */
const getAvailablePlans = async (req, res) => {
    try {
        const plans = Object.entries(PLAN_TIERS).map(([key, plan]) => ({
            tier: key,
            ...plan,
        }));

        return successResponse(res, plans, "Available plans retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch plans", 500, error);
    }
};

module.exports = {
    getPlanInfo,
    getBillingHistory,
    getUsageAnalytics,
    getAvailablePlans,
};
