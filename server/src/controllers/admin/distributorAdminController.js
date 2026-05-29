const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');

// Get all distributors
const getDistributors = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.approvalStatus = status;
        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [distributors, total] = await prisma.$transaction([
            prisma.distributor.findMany({
                where, skip, take,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    _count: { select: { wholesaleProducts: true, wholesaleOrders: true, customers: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.distributor.count({ where })
        ]);
        return successResponse(res, { distributors, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        console.error('getDistributors error:', error);
        return errorResponse(res, 'Failed to fetch distributors', 500, error);
    }
};

// Get distributor stats
const getDistributorStats = async (req, res) => {
    try {
        const total = await prisma.distributor.count();
        const approved = await prisma.distributor.count({ where: { approvalStatus: 'APPROVED' } });
        const pending = await prisma.distributor.count({ where: { approvalStatus: 'PENDING' } });
        const rejected = await prisma.distributor.count({ where: { approvalStatus: 'REJECTED' } });

        const totalOrders = await prisma.wholesaleOrder.count();
        const completedOrders = await prisma.wholesaleOrder.count({ where: { status: 'DELIVERED' } });
        const totalProducts = await prisma.wholesaleProduct.count({ where: { isActive: true } });

        const revenueAgg = await prisma.wholesaleOrder.aggregate({
            where: { paymentStatus: 'PAID' },
            _sum: { totalAmount: true }
        });
        const totalRevenue = revenueAgg._sum.totalAmount || 0;

        return successResponse(res, {
            total, approved, pending, rejected,
            totalOrders, completedOrders, totalProducts, totalRevenue
        });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch distributor stats', 500, error);
    }
};

// Approve distributor
const approveDistributor = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.distributor.update({
            where: { id },
            data: { approvalStatus: 'APPROVED', approvedAt: new Date() }
        });
        return successResponse(res, updated, 'Distributor approved');
    } catch (error) {
        return errorResponse(res, 'Failed to approve distributor', 500, error);
    }
};

// Reject distributor
const rejectDistributor = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.distributor.update({
            where: { id },
            data: { approvalStatus: 'REJECTED' }
        });
        return successResponse(res, updated, 'Distributor rejected');
    } catch (error) {
        return errorResponse(res, 'Failed to reject distributor', 500, error);
    }
};

// Get distributor detail
const getDistributorDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const distributor = await prisma.distributor.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, createdAt: true } },
                warehouses: true,
                wholesaleProducts: { take: 10, orderBy: { createdAt: 'desc' } },
                wholesaleOrders: { take: 10, orderBy: { createdAt: 'desc' }, include: { tenant: { select: { name: true } } } },
                customers: { include: { tenant: { select: { name: true } } } }
            }
        });
        if (!distributor) return errorResponse(res, 'Distributor not found', 404);
        return successResponse(res, distributor);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch distributor detail', 500, error);
    }
};

// Get all wholesale orders for admin
const getWholesaleOrders = async (req, res) => {
    try {
        const { status, distributorId, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (distributorId) where.distributorId = distributorId;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [orders, total] = await prisma.$transaction([
            prisma.wholesaleOrder.findMany({
                where, skip, take,
                include: {
                    tenant: { select: { name: true } },
                    distributor: { select: { companyName: true } },
                    items: { include: { wholesaleProduct: { select: { name: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.wholesaleOrder.count({ where })
        ]);
        return successResponse(res, { orders, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch wholesale orders', 500, error);
    }
};

// Revenue analytics for distributors
const getDistributorRevenue = async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const revenueAgg = await prisma.wholesaleOrder.aggregate({
            where: { paymentStatus: 'PAID', createdAt: { gte: startDate } },
            _sum: { totalAmount: true },
            _count: { _all: true }
        });

        // Top distributors by revenue
        const topDistributors = await prisma.wholesaleOrder.groupBy({
            by: ['distributorId'],
            where: { paymentStatus: 'PAID', createdAt: { gte: startDate } },
            _sum: { totalAmount: true },
            _count: true,
            orderBy: { _sum: { totalAmount: 'desc' } },
            take: 10
        });
        const distIds = topDistributors.map(d => d.distributorId);
        const distDetails = await prisma.distributor.findMany({
            where: { id: { in: distIds } },
            select: { id: true, companyName: true }
        });
        const distMap = new Map(distDetails.map(d => [d.id, d]));

        const topList = topDistributors.map(d => ({
            ...(distMap.get(d.distributorId) || {}),
            revenue: d._sum.totalAmount || 0,
            orders: d._count
        }));

        // Monthly chart
        const chart = [];
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const mStart = new Date();
            mStart.setMonth(mStart.getMonth() - i); mStart.setDate(1); mStart.setHours(0,0,0,0);
            const mEnd = new Date(mStart); mEnd.setMonth(mEnd.getMonth() + 1); mEnd.setDate(0); mEnd.setHours(23,59,59,999);
            const mAgg = await prisma.wholesaleOrder.aggregate({
                where: { paymentStatus: 'PAID', createdAt: { gte: mStart, lte: mEnd } },
                _sum: { totalAmount: true }, _count: { _all: true }
            });
            chart.push({
                name: mStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                revenue: mAgg._sum.totalAmount || 0,
                orders: mAgg._count._all || 0
            });
        }

        return successResponse(res, {
            totalRevenue: revenueAgg._sum.totalAmount || 0,
            totalOrders: revenueAgg._count._all || 0,
            topDistributors: topList,
            revenueChart: chart
        });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch distributor revenue', 500, error);
    }
};

module.exports = {
    getDistributors,
    getDistributorStats,
    approveDistributor,
    rejectDistributor,
    getDistributorDetail,
    getWholesaleOrders,
    getDistributorRevenue
};
