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

// Position levels for hierarchy
const POSITION_LEVELS = [
    { level: 1, code: 'DIRECTOR', title: 'Direktur Distribusi' },
    { level: 2, code: 'NSM', title: 'National Sales Manager' },
    { level: 3, code: 'RSM', title: 'Regional Sales Manager' },
    { level: 4, code: 'ASM', title: 'Area Sales Manager' },
    { level: 5, code: 'SPV', title: 'Supervisor' },
    { level: 6, code: 'SALES', title: 'Sales Representative' },
];

// ============================================================
// HIERARCHY CRUD - Full Organization Structure
// ============================================================

const getHierarchy = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { userId: true, companyName: true, user: { select: { tenantId: true, name: true, email: true } } }
        });

        // Get all team members
        const users = await prisma.user.findMany({
            where: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR', isActive: true },
            select: { id: true, name: true, email: true }
        });

        // Get hierarchy data (nodes with parent-child relationships)
        const nodes = await getSettings(`DIST_ORG_${distributorId}`);

        // Build tree structure
        const nodeMap = new Map(nodes.map(n => [n.userId, n]));
        const tree = nodes.map(n => {
            const user = users.find(u => u.id === n.userId);
            const subordinates = nodes.filter(s => s.reportTo === n.userId);
            return {
                ...n,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || '',
                subordinateCount: subordinates.length,
                subordinates: subordinates.map(s => ({
                    userId: s.userId,
                    name: users.find(u => u.id === s.userId)?.name || 'Unknown',
                    position: s.position
                }))
            };
        });

        return successResponse(res, {
            companyName: distributor.companyName,
            owner: { id: distributor.userId, name: distributor.user.name, email: distributor.user.email },
            positions: POSITION_LEVELS,
            nodes: tree,
            teamMembers: users
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch hierarchy", 500, error);
    }
};

const addToHierarchy = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { userId, position, reportTo, territory } = req.body;
        if (!userId || !position) return errorResponse(res, "userId and position required", 400);

        const validPos = POSITION_LEVELS.find(p => p.code === position);
        if (!validPos) return errorResponse(res, "Invalid position code", 400);

        const key = `DIST_ORG_${distributorId}`;
        const nodes = await getSettings(key);

        // Check if user already in hierarchy
        const existing = nodes.findIndex(n => n.userId === userId);
        if (existing >= 0) {
            nodes[existing] = { ...nodes[existing], position, reportTo: reportTo || null, territory: territory || null, updatedAt: new Date().toISOString() };
        } else {
            nodes.push({ userId, position, level: validPos.level, reportTo: reportTo || null, territory: territory || null, createdAt: new Date().toISOString() });
        }

        await saveSettings(key, nodes, 'Organization hierarchy');
        return successResponse(res, nodes, existing >= 0 ? "Position updated" : "Added to hierarchy");
    } catch (error) {
        return errorResponse(res, "Failed to update hierarchy", 500, error);
    }
};

const removeFromHierarchy = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { userId } = req.params;

        const key = `DIST_ORG_${distributorId}`;
        let nodes = await getSettings(key);

        // Remove user and reassign their subordinates to their manager
        const removed = nodes.find(n => n.userId === userId);
        if (!removed) return errorResponse(res, "User not in hierarchy", 404);

        // Reassign subordinates to removed user's manager
        nodes = nodes.map(n => {
            if (n.reportTo === userId) return { ...n, reportTo: removed.reportTo || null };
            return n;
        });
        nodes = nodes.filter(n => n.userId !== userId);

        await saveSettings(key, nodes, 'Organization hierarchy');
        return successResponse(res, null, "Removed from hierarchy");
    } catch (error) {
        return errorResponse(res, "Failed to remove from hierarchy", 500, error);
    }
};

// ============================================================
// TERRITORY MANAGEMENT
// ============================================================

const getTerritories = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const territories = await getSettings(`DIST_TERRITORIES_${distributorId}`);

        // Enrich with real merchant data
        const customers = await prisma.distributorCustomer.findMany({
            where: { distributorId },
            include: { tenant: { include: { stores: { select: { location: true, name: true }, take: 1 } } } }
        });

        // Get team for assignment info
        const distributor = await prisma.distributor.findUnique({ where: { id: distributorId }, select: { user: { select: { tenantId: true } } } });
        const users = await prisma.user.findMany({ where: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR', isActive: true }, select: { id: true, name: true } });
        const userMap = new Map(users.map(u => [u.id, u.name]));

        const enriched = territories.map(t => {
            const merchantsInArea = customers.filter(c => {
                const loc = (c.tenant?.stores?.[0]?.location || '').toLowerCase();
                return t.areas.some(a => loc.includes(a.toLowerCase()));
            });
            return {
                ...t,
                assignedName: userMap.get(t.assignedTo) || 'Belum ditugaskan',
                merchantCount: merchantsInArea.length,
                merchants: merchantsInArea.slice(0, 5).map(c => ({ name: c.tenant?.stores?.[0]?.name || c.tenant?.name, location: c.tenant?.stores?.[0]?.location })),
                totalCredit: merchantsInArea.reduce((s, c) => s + (c.creditLimit || 0), 0),
            };
        });

        return successResponse(res, enriched);
    } catch (error) {
        return errorResponse(res, "Failed to fetch territories", 500, error);
    }
};

const createTerritory = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { name, areas, assignedTo, revenueTarget } = req.body;
        if (!name || !areas || !Array.isArray(areas)) return errorResponse(res, "name and areas[] required", 400);

        const key = `DIST_TERRITORIES_${distributorId}`;
        const territories = await getSettings(key);
        territories.push({ id: `T-${Date.now()}`, name, areas, assignedTo: assignedTo || null, revenueTarget: revenueTarget || 0, createdAt: new Date().toISOString() });
        await saveSettings(key, territories, 'Sales territories');

        return successResponse(res, territories[territories.length - 1], "Territory created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create territory", 500, error);
    }
};

const updateTerritory = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { name, areas, assignedTo, revenueTarget } = req.body;

        const key = `DIST_TERRITORIES_${distributorId}`;
        const territories = await getSettings(key);
        const idx = territories.findIndex(t => t.id === id);
        if (idx < 0) return errorResponse(res, "Territory not found", 404);

        if (name) territories[idx].name = name;
        if (areas) territories[idx].areas = areas;
        if (assignedTo !== undefined) territories[idx].assignedTo = assignedTo;
        if (revenueTarget !== undefined) territories[idx].revenueTarget = revenueTarget;

        await saveSettings(key, territories, 'Sales territories');
        return successResponse(res, territories[idx], "Territory updated");
    } catch (error) {
        return errorResponse(res, "Failed to update territory", 500, error);
    }
};

const deleteTerritory = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const key = `DIST_TERRITORIES_${distributorId}`;
        let territories = await getSettings(key);
        territories = territories.filter(t => t.id !== id);
        await saveSettings(key, territories, 'Sales territories');
        return successResponse(res, null, "Territory deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete territory", 500, error);
    }
};

// ============================================================
// SFA - SALES FORCE AUTOMATION (Real Data)
// ============================================================

const getSfaDashboard = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Visits from settings
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const todayVisits = visits.filter(v => v.date === today);
        const monthVisits = visits.filter(v => v.date >= monthStart.toISOString().split('T')[0]);
        const completedMonth = monthVisits.filter(v => v.status === 'COMPLETED');
        const effectiveCalls = completedMonth.filter(v => v.orderCreated);

        // Real order data
        const [pendingOrders, processingOrders, shippedOrders, monthRevenue, newCustomers, totalCustomers] = await Promise.all([
            prisma.wholesaleOrder.count({ where: { distributorId, status: 'PENDING' } }),
            prisma.wholesaleOrder.count({ where: { distributorId, status: 'PROCESSING' } }),
            prisma.wholesaleOrder.count({ where: { distributorId, status: 'SHIPPED' } }),
            prisma.wholesaleOrder.aggregate({ where: { distributorId, createdAt: { gte: monthStart }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
            prisma.distributorCustomer.count({ where: { distributorId, createdAt: { gte: monthStart } } }),
            prisma.distributorCustomer.count({ where: { distributorId } }),
        ]);

        // Products low stock
        const lowStock = await prisma.wholesaleProduct.count({ where: { distributorId, isActive: true, stockQuantity: { lte: 10 } } });

        return successResponse(res, {
            today: { planned: todayVisits.length, completed: todayVisits.filter(v => v.status === 'COMPLETED').length, inProgress: todayVisits.filter(v => v.status === 'IN_PROGRESS').length },
            pipeline: { pending: pendingOrders, processing: processingOrders, shipped: shippedOrders, total: pendingOrders + processingOrders + shippedOrders },
            month: {
                revenue: monthRevenue._sum.totalAmount || 0,
                visits: monthVisits.length,
                completedVisits: completedMonth.length,
                effectiveCalls: effectiveCalls.length,
                ecr: completedMonth.length > 0 ? Math.round((effectiveCalls.length / completedMonth.length) * 100) : 0,
                newCustomers,
                totalCustomers,
                lowStock
            }
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch SFA dashboard", 500, error);
    }
};

// --- VISITS ---

const getVisits = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);
        const { status, salesId, dateFrom, dateTo } = req.query;

        let visits = await getSettings(`DIST_VISITS_${distributorId}`);

        if (status) visits = visits.filter(v => v.status === status);
        if (salesId) visits = visits.filter(v => v.salesId === salesId);
        if (dateFrom) visits = visits.filter(v => v.date >= dateFrom);
        if (dateTo) visits = visits.filter(v => v.date <= dateTo);

        visits.sort((a, b) => new Date(b.date + 'T' + (b.createdAt || '00:00')).getTime() - new Date(a.date + 'T' + (a.createdAt || '00:00')).getTime());

        return successResponse(res, { visits: visits.slice(0, 100), total: visits.length });
    } catch (error) {
        return errorResponse(res, "Failed to fetch visits", 500, error);
    }
};

const createVisit = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { merchantId, merchantName, salesId, salesName, date, objective, notes } = req.body;
        if (!merchantName || !date) return errorResponse(res, "merchantName and date required", 400);

        // Resolve sales name from team
        let resolvedSalesName = salesName || '';
        if (salesId && !salesName) {
            const u = await prisma.user.findUnique({ where: { id: salesId }, select: { name: true } });
            resolvedSalesName = u?.name || '';
        }
        if (!resolvedSalesName) {
            const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
            resolvedSalesName = u?.name || 'Self';
        }

        const key = `DIST_VISITS_${distributorId}`;
        const visits = await getSettings(key);

        const visit = {
            id: `V-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            merchantId: merchantId || null, merchantName,
            salesId: salesId || req.user.userId, salesName: resolvedSalesName,
            date, objective: objective || 'Regular Visit', notes: notes || '',
            status: 'PLANNED', checkInTime: null, checkOutTime: null,
            checkInLat: null, checkInLng: null,
            orderCreated: false, orderAmount: 0, feedback: '',
            createdAt: new Date().toISOString()
        };

        visits.push(visit);
        await saveSettings(key, visits, 'Sales visits');
        return successResponse(res, visit, "Visit planned", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create visit", 500, error);
    }
};

const checkInVisit = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { latitude, longitude } = req.body;

        const key = `DIST_VISITS_${distributorId}`;
        const visits = await getSettings(key);
        const idx = visits.findIndex(v => v.id === id);
        if (idx < 0) return errorResponse(res, "Visit not found", 404);

        visits[idx].status = 'IN_PROGRESS';
        visits[idx].checkInTime = new Date().toISOString();
        visits[idx].checkInLat = latitude || null;
        visits[idx].checkInLng = longitude || null;

        await saveSettings(key, visits, 'Sales visits');
        return successResponse(res, visits[idx], "Checked in");
    } catch (error) {
        return errorResponse(res, "Failed to check in", 500, error);
    }
};

const checkOutVisit = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { feedback, orderCreated, orderAmount, nextAction } = req.body;

        const key = `DIST_VISITS_${distributorId}`;
        const visits = await getSettings(key);
        const idx = visits.findIndex(v => v.id === id);
        if (idx < 0) return errorResponse(res, "Visit not found", 404);

        visits[idx].status = 'COMPLETED';
        visits[idx].checkOutTime = new Date().toISOString();
        visits[idx].feedback = feedback || '';
        visits[idx].orderCreated = orderCreated || false;
        visits[idx].orderAmount = orderAmount || 0;
        visits[idx].nextAction = nextAction || '';

        await saveSettings(key, visits, 'Sales visits');

        // Auto-notification if order created
        if (orderCreated) {
            const { tenantId } = req.user;
            try {
                await prisma.notification.create({
                    data: { tenantId, title: 'Order dari Kunjungan', body: `${visits[idx].salesName} membuat order Rp ${(orderAmount || 0).toLocaleString()} dari ${visits[idx].merchantName}` }
                });
            } catch (e) { }
        }

        return successResponse(res, visits[idx], "Checked out");
    } catch (error) {
        return errorResponse(res, "Failed to check out", 500, error);
    }
};

const cancelVisit = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const { reason } = req.body;

        const key = `DIST_VISITS_${distributorId}`;
        const visits = await getSettings(key);
        const idx = visits.findIndex(v => v.id === id);
        if (idx < 0) return errorResponse(res, "Visit not found", 404);

        visits[idx].status = 'CANCELLED';
        visits[idx].cancelReason = reason || '';

        await saveSettings(key, visits, 'Sales visits');
        return successResponse(res, visits[idx], "Visit cancelled");
    } catch (error) {
        return errorResponse(res, "Failed to cancel visit", 500, error);
    }
};

// --- SALES TARGETS (Real data integration) ---

const getSalesTargets = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const targets = await getSettings(`DIST_TARGETS_${distributorId}`);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get team
        const distributor = await prisma.distributor.findUnique({ where: { id: distributorId }, select: { user: { select: { tenantId: true } } } });
        const users = await prisma.user.findMany({ where: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR', isActive: true }, select: { id: true, name: true } });
        const userMap = new Map(users.map(u => [u.id, u.name]));

        // Real performance data
        const monthOrders = await prisma.wholesaleOrder.findMany({
            where: { distributorId, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
            select: { totalAmount: true, paymentStatus: true, tenantId: true }
        });
        const paidRevenue = monthOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.totalAmount, 0);
        const totalOrders = monthOrders.length;
        const uniqueCustomers = new Set(monthOrders.map(o => o.tenantId)).size;

        // Visits this month
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const monthVisits = visits.filter(v => v.date >= monthStart.toISOString().split('T')[0] && v.status === 'COMPLETED');

        const enriched = targets.map(t => ({
            ...t,
            userName: userMap.get(t.userId) || 'Unknown',
            actual: { revenue: paidRevenue, orders: totalOrders, visits: monthVisits.filter(v => v.salesId === t.userId).length, newCustomers: uniqueCustomers },
            achievement: {
                revenue: t.revenue > 0 ? Math.min(200, Math.round((paidRevenue / t.revenue) * 100)) : 0,
                orders: t.orders > 0 ? Math.min(200, Math.round((totalOrders / t.orders) * 100)) : 0,
                visits: t.visits > 0 ? Math.min(200, Math.round((monthVisits.filter(v => v.salesId === t.userId).length / t.visits) * 100)) : 0,
            }
        }));

        return successResponse(res, {
            targets: enriched,
            teamMembers: users,
            summary: { revenue: paidRevenue, orders: totalOrders, visits: monthVisits.length, customers: uniqueCustomers, month: monthStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) }
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch targets", 500, error);
    }
};

const setSalesTarget = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { userId, revenue, orders, visits, newCustomers } = req.body;
        if (!userId) return errorResponse(res, "userId required", 400);

        const key = `DIST_TARGETS_${distributorId}`;
        const targets = await getSettings(key);

        const idx = targets.findIndex(t => t.userId === userId);
        const data = { userId, revenue: revenue || 0, orders: orders || 0, visits: visits || 0, newCustomers: newCustomers || 0, updatedAt: new Date().toISOString() };

        if (idx >= 0) targets[idx] = data;
        else targets.push(data);

        await saveSettings(key, targets, 'Sales targets');
        return successResponse(res, data, "Target saved");
    } catch (error) {
        return errorResponse(res, "Failed to set target", 500, error);
    }
};

// --- ROUTE PLANS ---

const getRoutePlans = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const plans = await getSettings(`DIST_ROUTES_${distributorId}`);

        // Enrich with user names
        const distributor = await prisma.distributor.findUnique({ where: { id: distributorId }, select: { user: { select: { tenantId: true } } } });
        const users = await prisma.user.findMany({ where: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR' }, select: { id: true, name: true } });
        const userMap = new Map(users.map(u => [u.id, u.name]));

        const enriched = plans.map(p => ({ ...p, salesName: userMap.get(p.salesId) || p.salesName || 'Unknown' }));
        return successResponse(res, enriched);
    } catch (error) {
        return errorResponse(res, "Failed to fetch route plans", 500, error);
    }
};

const createRoutePlan = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { name, salesId, dayOfWeek, merchants } = req.body;
        if (!name || !merchants || merchants.length === 0) return errorResponse(res, "name and merchants required", 400);

        const key = `DIST_ROUTES_${distributorId}`;
        const plans = await getSettings(key);

        plans.push({
            id: `RP-${Date.now()}`,
            name, salesId: salesId || req.user.userId,
            dayOfWeek: dayOfWeek || 'MONDAY',
            merchants, // [{merchantName, order, estimatedTime}]
            isActive: true, createdAt: new Date().toISOString()
        });

        await saveSettings(key, plans, 'Route plans');
        return successResponse(res, plans[plans.length - 1], "Route plan created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create route plan", 500, error);
    }
};

const deleteRoutePlan = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { id } = req.params;
        const key = `DIST_ROUTES_${distributorId}`;
        let plans = await getSettings(key);
        plans = plans.filter(p => p.id !== id);
        await saveSettings(key, plans, 'Route plans');
        return successResponse(res, null, "Route plan deleted");
    } catch (error) {
        return errorResponse(res, "Failed to delete route plan", 500, error);
    }
};

// --- SALES PERFORMANCE LEADERBOARD ---

const getLeaderboard = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get visits per sales rep
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const monthVisits = visits.filter(v => v.date >= monthStart.toISOString().split('T')[0]);

        // Get team
        const distributor = await prisma.distributor.findUnique({ where: { id: distributorId }, select: { user: { select: { tenantId: true } } } });
        const users = await prisma.user.findMany({ where: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR', isActive: true }, select: { id: true, name: true } });

        // Aggregate per sales rep
        const leaderboard = users.map(u => {
            const userVisits = monthVisits.filter(v => v.salesId === u.id);
            const completed = userVisits.filter(v => v.status === 'COMPLETED');
            const effective = completed.filter(v => v.orderCreated);
            const totalOrderValue = effective.reduce((s, v) => s + (v.orderAmount || 0), 0);

            return {
                userId: u.id,
                name: u.name,
                totalVisits: userVisits.length,
                completedVisits: completed.length,
                effectiveCalls: effective.length,
                ecr: completed.length > 0 ? Math.round((effective.length / completed.length) * 100) : 0,
                totalOrderValue,
                score: (completed.length * 10) + (effective.length * 25) + Math.floor(totalOrderValue / 100000)
            };
        });

        leaderboard.sort((a, b) => b.score - a.score);

        return successResponse(res, leaderboard);
    } catch (error) {
        return errorResponse(res, "Failed to fetch leaderboard", 500, error);
    }
};

module.exports = {
    getHierarchy, addToHierarchy, removeFromHierarchy,
    getTerritories, createTerritory, updateTerritory, deleteTerritory,
    getSfaDashboard,
    getVisits, createVisit, checkInVisit, checkOutVisit, cancelVisit,
    getSalesTargets, setSalesTarget,
    getRoutePlans, createRoutePlan, deleteRoutePlan,
    getLeaderboard
};
