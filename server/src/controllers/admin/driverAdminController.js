const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');

// Get all drivers with filters
const getDrivers = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { vehiclePlate: { contains: search, mode: 'insensitive' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [drivers, total] = await prisma.$transaction([
            prisma.driver.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.driver.count({ where })
        ]);

        return successResponse(res, {
            drivers,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / take)
        });
    } catch (error) {
        console.error('getDrivers error:', error);
        return errorResponse(res, 'Failed to fetch drivers', 500, error);
    }
};

// Get single driver detail
const getDriverDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await prisma.driver.findUnique({
            where: { id },
            include: {
                serviceRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });
        if (!driver) return errorResponse(res, 'Driver not found', 404);
        return successResponse(res, driver);
    } catch (error) {
        console.error('getDriverDetail error:', error);
        return errorResponse(res, 'Failed to fetch driver detail', 500, error);
    }
};

// Get driver stats/analytics
const getDriverStats = async (req, res) => {
    try {
        const totalDrivers = await prisma.driver.count();
        const activeDrivers = await prisma.driver.count({ where: { isActive: true } });
        const onlineDrivers = await prisma.driver.count({ where: { status: 'ONLINE' } });
        const busyDrivers = await prisma.driver.count({ where: { status: 'BUSY' } });

        const totalOrders = await prisma.serviceRequest.count();
        const completedOrders = await prisma.serviceRequest.count({ where: { status: 'COMPLETED' } });
        const activeOrders = await prisma.serviceRequest.count({
            where: { status: { in: ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT'] } }
        });
        const cancelledOrders = await prisma.serviceRequest.count({ where: { status: 'CANCELLED' } });

        // Top drivers by completed orders
        const topDriversRaw = await prisma.serviceRequest.groupBy({
            by: ['driverId'],
            where: { status: 'COMPLETED', driverId: { not: null } },
            _count: true,
            orderBy: { _count: { driverId: 'desc' } },
            take: 10
        });

        const topDriverIds = topDriversRaw.map(d => d.driverId).filter(Boolean);
        const topDriverDetails = await prisma.driver.findMany({
            where: { id: { in: topDriverIds } },
            select: { id: true, name: true, rating: true, vehicleType: true }
        });
        const driverMap = new Map(topDriverDetails.map(d => [d.id, d]));

        const topDrivers = topDriversRaw.map(d => ({
            ...driverMap.get(d.driverId),
            completedOrders: d._count
        }));

        return successResponse(res, {
            totalDrivers,
            activeDrivers,
            onlineDrivers,
            busyDrivers,
            totalOrders,
            completedOrders,
            activeOrders,
            cancelledOrders,
            topDrivers
        });
    } catch (error) {
        console.error('getDriverStats error:', error);
        return errorResponse(res, 'Failed to fetch driver stats', 500, error);
    }
};

// Update driver (activate/deactivate/suspend)
const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, status, vehicleType, vehiclePlate, vehicleBrand } = req.body;

        const data = {};
        if (isActive !== undefined) data.isActive = !!isActive;
        if (status !== undefined) data.status = status;
        if (vehicleType !== undefined) data.vehicleType = vehicleType;
        if (vehiclePlate !== undefined) data.vehiclePlate = vehiclePlate;
        if (vehicleBrand !== undefined) data.vehicleBrand = vehicleBrand;

        const updated = await prisma.driver.update({ where: { id }, data });
        return successResponse(res, updated, 'Driver updated');
    } catch (error) {
        console.error('updateDriver error:', error);
        return errorResponse(res, 'Failed to update driver', 500, error);
    }
};

// Get driver orders/service requests
const getDriverOrders = async (req, res) => {
    try {
        const { driverId, status, page = 1, limit = 20 } = req.query;
        const where = {};
        if (driverId) where.driverId = driverId;
        if (status) where.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [orders, total] = await prisma.$transaction([
            prisma.serviceRequest.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    driver: { select: { id: true, name: true, vehiclePlate: true } }
                }
            }),
            prisma.serviceRequest.count({ where })
        ]);

        return successResponse(res, { orders, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        console.error('getDriverOrders error:', error);
        return errorResponse(res, 'Failed to fetch driver orders', 500, error);
    }
};

// Get online drivers for live tracking
const getOnlineDrivers = async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({
            where: { status: { in: ['ONLINE', 'BUSY'] }, latitude: { not: null }, longitude: { not: null } },
            select: {
                id: true, name: true, status: true,
                latitude: true, longitude: true,
                vehicleType: true, vehiclePlate: true, rating: true
            }
        });
        return successResponse(res, drivers);
    } catch (error) {
        console.error('getOnlineDrivers error:', error);
        return errorResponse(res, 'Failed to fetch online drivers', 500, error);
    }
};

// Revenue analytics
const getDriverRevenue = async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));
        startDate.setHours(0, 0, 0, 0);

        // Get platform commission settings
        const feeSettings = await prisma.systemSettings.findMany({
            where: { key: { in: ['DRIVER_PLATFORM_FEE_PERCENT', 'DRIVER_PLATFORM_FEE_FLAT'] } }
        });
        const feeMap = {};
        feeSettings.forEach(s => { feeMap[s.key] = s.value; });
        const feePercent = parseFloat(feeMap.DRIVER_PLATFORM_FEE_PERCENT || '20');
        const feeFlat = parseFloat(feeMap.DRIVER_PLATFORM_FEE_FLAT || '0');

        const revenueAgg = await prisma.serviceRequest.aggregate({
            where: { status: 'COMPLETED', createdAt: { gte: startDate } },
            _sum: { price: true },
            _count: { _all: true }
        });
        const totalRevenue = revenueAgg._sum.price || 0;
        const totalCompleted = revenueAgg._count._all || 0;

        // Platform commission calculation
        const platformCommission = feeFlat > 0
            ? totalCompleted * feeFlat
            : (totalRevenue * feePercent) / 100;
        const driverEarnings = totalRevenue - platformCommission;

        const revenueByDriver = await prisma.serviceRequest.groupBy({
            by: ['driverId'],
            where: { status: 'COMPLETED', driverId: { not: null }, createdAt: { gte: startDate } },
            _sum: { price: true },
            _count: true,
            orderBy: { _sum: { price: 'desc' } },
            take: 10
        });
        const driverIds = revenueByDriver.map(r => r.driverId).filter(Boolean);
        const driverDetails = await prisma.driver.findMany({
            where: { id: { in: driverIds } },
            select: { id: true, name: true, vehicleType: true, rating: true }
        });
        const dMap = new Map(driverDetails.map(d => [d.id, d]));
        const topEarners = revenueByDriver.map(r => ({
            ...(dMap.get(r.driverId) || {}),
            revenue: r._sum.price || 0,
            trips: r._count,
            commission: feeFlat > 0 ? r._count * feeFlat : ((r._sum.price || 0) * feePercent) / 100
        }));

        const revenueChart = [];
        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const mStart = new Date();
            mStart.setMonth(mStart.getMonth() - i);
            mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
            const mEnd = new Date(mStart);
            mEnd.setMonth(mEnd.getMonth() + 1); mEnd.setDate(0); mEnd.setHours(23, 59, 59, 999);
            const mAgg = await prisma.serviceRequest.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: mStart, lte: mEnd } },
                _sum: { price: true }, _count: { _all: true }
            });
            const mRevenue = mAgg._sum.price || 0;
            const mOrders = mAgg._count._all || 0;
            const mCommission = feeFlat > 0 ? mOrders * feeFlat : (mRevenue * feePercent) / 100;
            revenueChart.push({
                name: mStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                revenue: mRevenue,
                commission: Math.round(mCommission),
                orders: mOrders
            });
        }

        const byType = await prisma.serviceRequest.groupBy({
            by: ['type'],
            where: { status: 'COMPLETED', createdAt: { gte: startDate } },
            _sum: { price: true }, _count: true
        });
        const revenueByType = byType.map(t => ({ type: t.type, revenue: t._sum.price || 0, count: t._count }));

        return successResponse(res, {
            totalRevenue, totalCompleted,
            avgOrderValue: totalCompleted > 0 ? Math.round(totalRevenue / totalCompleted) : 0,
            platformCommission: Math.round(platformCommission),
            driverEarnings: Math.round(driverEarnings),
            feePercent, feeFlat,
            topEarners, revenueChart, revenueByType
        });
    } catch (error) {
        console.error('getDriverRevenue error:', error);
        return errorResponse(res, 'Failed to fetch driver revenue', 500, error);
    }
};

// Map data for territory/acquisition
const getDriverMap = async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({
            where: { latitude: { not: null }, longitude: { not: null } },
            select: {
                id: true, name: true, status: true,
                latitude: true, longitude: true,
                vehicleType: true, vehiclePlate: true,
                rating: true, isActive: true, createdAt: true
            }
        });
        const recentOrders = await prisma.serviceRequest.findMany({
            where: { status: 'COMPLETED' },
            select: { originLat: true, originLng: true, type: true, price: true },
            orderBy: { createdAt: 'desc' }, take: 200
        });
        return successResponse(res, {
            drivers,
            orderHotspots: recentOrders,
            stats: {
                totalWithCoords: drivers.length,
                onlineDrivers: drivers.filter(d => d.status === 'ONLINE').length,
                busyDrivers: drivers.filter(d => d.status === 'BUSY').length
            }
        });
    } catch (error) {
        console.error('getDriverMap error:', error);
        return errorResponse(res, 'Failed to fetch driver map data', 500, error);
    }
};

// Approve driver
const approveDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.driver.update({ where: { id }, data: { isActive: true } });
        return successResponse(res, updated, 'Driver approved');
    } catch (error) {
        return errorResponse(res, 'Failed to approve driver', 500, error);
    }
};

// Suspend driver
const suspendDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.driver.update({ where: { id }, data: { isActive: false, status: 'OFFLINE' } });
        return successResponse(res, updated, 'Driver suspended');
    } catch (error) {
        return errorResponse(res, 'Failed to suspend driver', 500, error);
    }
};

// Get driver fee settings
const getDriverFeeSettings = async (req, res) => {
    try {
        const keys = [
            'DRIVER_PLATFORM_FEE_PERCENT', 'DRIVER_PLATFORM_FEE_FLAT',
            'DRIVER_MINIMUM_FARE', 'DRIVER_BASE_FARE',
            'DRIVER_PER_KM_RATE', 'DRIVER_PER_MIN_RATE',
            'DRIVER_SURGE_MULTIPLIER', 'DRIVER_CANCELLATION_FEE'
        ];
        const settings = await prisma.systemSettings.findMany({ where: { key: { in: keys } } });
        const map = {};
        settings.forEach(s => { map[s.key] = s.value; });
        return successResponse(res, map);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch driver fee settings', 500, error);
    }
};

// Save driver fee settings
const saveDriverFeeSettings = async (req, res) => {
    try {
        const entries = Object.entries(req.body);
        for (const [key, value] of entries) {
            await prisma.systemSettings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
        }
        return successResponse(res, null, 'Driver fee settings saved');
    } catch (error) {
        return errorResponse(res, 'Failed to save driver fee settings', 500, error);
    }
};

// Get pending driver registrations (inactive drivers)
const getPendingDrivers = async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({
            where: { isActive: false },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, drivers);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch pending drivers', 500, error);
    }
};

// Broadcast notification to all drivers
const broadcastToDrivers = async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) return errorResponse(res, 'Title and message required', 400);

        // Get all drivers count
        const driverCount = await prisma.driver.count({ where: { isActive: true } });

        // Try to create notification (may fail if tenant doesn't exist, that's ok)
        try {
            const tenant = await prisma.tenant.findFirst({ where: { id: 'rana_market_driver_tenant' } });
            if (tenant) {
                await prisma.notification.create({
                    data: { tenantId: tenant.id, title, body: message }
                });
            }
        } catch (e) {
            console.warn('Notification create skipped:', e.message);
        }

        // Emit socket event to driver zone
        try {
            const { getIo } = require('../../socket');
            getIo().to('driver_zone').emit('notification', { title, body: message, type: 'BROADCAST' });
        } catch (e) {
            console.warn('Socket broadcast failed:', e.message);
        }

        // Send FCM push notification to all drivers topic
        try {
            const { sendToTopic } = require('../../utils/pushNotification');
            await sendToTopic('drivers', { title, body: message }, { type: 'broadcast' });
        } catch (e) {
            console.warn('FCM broadcast failed:', e.message);
        }

        return successResponse(res, { driversNotified: driverCount }, 'Broadcast sent to drivers');
    } catch (error) {
        return errorResponse(res, 'Failed to broadcast', 500, error);
    }
};

module.exports = {
    getDrivers,
    getDriverDetail,
    getDriverStats,
    updateDriver,
    getDriverOrders,
    getOnlineDrivers,
    getDriverRevenue,
    getDriverMap,
    approveDriver,
    suspendDriver,
    getDriverFeeSettings,
    saveDriverFeeSettings,
    getPendingDrivers,
    broadcastToDrivers
};
