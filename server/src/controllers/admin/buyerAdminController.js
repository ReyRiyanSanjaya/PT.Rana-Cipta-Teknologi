const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');

const BUYER_TENANT_ID = 'rana_market_buyer_tenant';

// Get all buyers
const getBuyers = async (req, res) => {
    try {
        const { search, page = 1, limit = 20, isActive } = req.query;
        const where = { tenantId: BUYER_TENANT_ID };

        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [buyers, total] = await prisma.$transaction([
            prisma.user.findMany({
                where, skip, take,
                select: {
                    id: true, name: true, email: true,
                    isActive: true, createdAt: true, avatarUrl: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        return successResponse(res, {
            buyers, total,
            page: parseInt(page),
            totalPages: Math.ceil(total / take)
        });
    } catch (error) {
        console.error('getBuyers error:', error);
        return errorResponse(res, 'Failed to fetch buyers', 500, error);
    }
};

// Get buyer stats
const getBuyerStats = async (req, res) => {
    try {
        const total = await prisma.user.count({ where: { tenantId: BUYER_TENANT_ID } });
        const active = await prisma.user.count({ where: { tenantId: BUYER_TENANT_ID, isActive: true } });
        const inactive = total - active;

        // New buyers this month
        const monthStart = new Date();
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const newThisMonth = await prisma.user.count({
            where: { tenantId: BUYER_TENANT_ID, createdAt: { gte: monthStart } }
        });

        // Growth chart (last 6 months)
        const growthChart = [];
        for (let i = 5; i >= 0; i--) {
            const mStart = new Date();
            mStart.setMonth(mStart.getMonth() - i); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
            const mEnd = new Date(mStart);
            mEnd.setMonth(mEnd.getMonth() + 1); mEnd.setDate(0); mEnd.setHours(23, 59, 59, 999);
            const count = await prisma.user.count({
                where: { tenantId: BUYER_TENANT_ID, createdAt: { gte: mStart, lte: mEnd } }
            });
            growthChart.push({
                name: mStart.toLocaleDateString('id-ID', { month: 'short' }),
                count
            });
        }

        return successResponse(res, { total, active, inactive, newThisMonth, growthChart });
    } catch (error) {
        console.error('getBuyerStats error:', error);
        return errorResponse(res, 'Failed to fetch buyer stats', 500, error);
    }
};

// Update buyer (activate/deactivate)
const updateBuyer = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const updated = await prisma.user.update({
            where: { id },
            data: { isActive: !!isActive }
        });
        return successResponse(res, { id: updated.id, isActive: updated.isActive }, 'Buyer updated');
    } catch (error) {
        return errorResponse(res, 'Failed to update buyer', 500, error);
    }
};

// Get buyer detail
const getBuyerDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true, name: true, email: true, avatarUrl: true,
                isActive: true, createdAt: true, tenantId: true
            }
        });
        if (!user || user.tenantId !== BUYER_TENANT_ID) {
            return errorResponse(res, 'Buyer not found', 404);
        }

        // Get login history
        const loginHistory = await prisma.loginHistory.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return successResponse(res, { ...user, loginHistory });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch buyer detail', 500, error);
    }
};

// Get buyer revenue/order analytics
const getBuyerRevenue = async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));
        startDate.setHours(0, 0, 0, 0);

        // All transactions with customerName set (market orders have customerName)
        const revenueAgg = await prisma.transaction.aggregate({
            where: { customerName: { not: null }, paymentStatus: 'PAID', createdAt: { gte: startDate } },
            _sum: { totalAmount: true },
            _count: { _all: true }
        });
        const totalGMV = revenueAgg._sum.totalAmount || 0;
        const totalOrders = revenueAgg._count._all || 0;

        // Estimate platform fee (from settings)
        const feeSetting = await prisma.systemSettings.findUnique({ where: { key: 'BUYER_SERVICE_FEE' } });
        const feeTypeSetting = await prisma.systemSettings.findUnique({ where: { key: 'BUYER_SERVICE_FEE_TYPE' } });
        const feeVal = feeSetting ? parseFloat(feeSetting.value) : 0;
        const feeType = feeTypeSetting ? String(feeTypeSetting.value) : 'FLAT';
        let totalPlatformFee = 0;
        if (feeType === 'PERCENT') totalPlatformFee = (totalGMV * feeVal) / 100;
        else totalPlatformFee = totalOrders * feeVal;

        // Monthly chart
        const revenueChart = [];
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const mStart = new Date();
            mStart.setMonth(mStart.getMonth() - i); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
            const mEnd = new Date(mStart); mEnd.setMonth(mEnd.getMonth() + 1); mEnd.setDate(0); mEnd.setHours(23, 59, 59, 999);
            const mAgg = await prisma.transaction.aggregate({
                where: { customerName: { not: null }, paymentStatus: 'PAID', createdAt: { gte: mStart, lte: mEnd } },
                _sum: { totalAmount: true },
                _count: { _all: true }
            });
            const mGMV = mAgg._sum.totalAmount || 0;
            const mOrders = mAgg._count._all || 0;
            const mFee = feeType === 'PERCENT' ? (mGMV * feeVal) / 100 : mOrders * feeVal;
            revenueChart.push({
                name: mStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                gmv: mGMV,
                commission: Math.round(mFee),
                orders: mOrders
            });
        }

        // Order status breakdown
        const statusBreakdown = await prisma.transaction.groupBy({
            by: ['orderStatus'],
            where: { customerName: { not: null }, createdAt: { gte: startDate } },
            _count: true
        });
        const ordersByStatus = statusBreakdown.map(s => ({ status: s.orderStatus, count: s._count }));

        return successResponse(res, {
            totalGMV, totalPlatformFee: Math.round(totalPlatformFee), totalOrders,
            avgOrderValue: totalOrders > 0 ? Math.round(totalGMV / totalOrders) : 0,
            revenueChart, ordersByStatus
        });
    } catch (error) {
        console.error('getBuyerRevenue error:', error);
        return errorResponse(res, 'Failed to fetch buyer revenue', 500, error);
    }
};

// Get buyer orders (market transactions)
const getBuyerOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        const where = { customerName: { not: null } };
        if (status) where.orderStatus = status;
        if (search) {
            where.OR = [
                { customerName: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [orders, total] = await prisma.$transaction([
            prisma.transaction.findMany({
                where, skip, take,
                select: {
                    id: true, customerName: true,
                    totalAmount: true, orderStatus: true,
                    paymentStatus: true, paymentMethod: true, createdAt: true,
                    store: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.transaction.count({ where })
        ]);

        return successResponse(res, { orders, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        console.error('getBuyerOrders error:', error);
        return errorResponse(res, 'Failed to fetch buyer orders', 500, error);
    }
};

module.exports = { getBuyers, getBuyerStats, updateBuyer, getBuyerDetail, getBuyerRevenue, getBuyerOrders };
