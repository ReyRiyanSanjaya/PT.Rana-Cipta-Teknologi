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
 * POST /distributor/kpi/generate
 * 
 * AI KPI Target Generator
 * 
 * Rumus:
 * 1. Ambil data historis 3 bulan terakhir per sales rep
 * 2. Hitung rata-rata + trend (growth rate)
 * 3. Terapkan growth factor dari Direktur (hope target)
 * 4. Distribusikan target secara fair berdasarkan:
 *    - Historis performa individu (weighted 60%)
 *    - Potensi territory / jumlah merchant (weighted 25%)
 *    - Seniority / tenure (weighted 15%)
 * 5. Pastikan total target tim = company target dari Direktur
 * 6. Floor/ceiling: min 70% dari rata-rata historis, max 150%
 */
const generateKpiTargets = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const {
            companyRevenueTarget,   // Direktur set: total omset target perusahaan bulan depan
            companyOrderTarget,     // Direktur set: total order target
            companyVisitTarget,     // Direktur set: total visit target
            growthPercent = 10,     // Default 10% growth expectation
            fairnessMode = 'balanced', // 'balanced' | 'performance' | 'equal'
        } = req.body;

        if (!companyRevenueTarget) {
            return errorResponse(res, "companyRevenueTarget (hope target dari Direktur) wajib diisi", 400);
        }

        const now = new Date();

        // 1. Get all sales team members
        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { user: { select: { tenantId: true } } }
        });
        const users = await prisma.user.findMany({
            where: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR', isActive: true },
            select: { id: true, name: true, createdAt: true }
        });

        if (users.length === 0) {
            return errorResponse(res, "Tidak ada anggota tim", 400);
        }

        // Get org hierarchy to identify sales reps (level 5-6)
        const orgNodes = await getSettings(`DIST_ORG_${distributorId}`);
        const salesReps = users.filter(u => {
            const node = orgNodes.find(n => n.userId === u.id);
            // Include if level >= 5 (SPV, SALES) or if no hierarchy data (include all)
            return !node || node.level >= 5;
        });

        if (salesReps.length === 0) {
            // Fallback: use all team members
            salesReps.push(...users);
        }

        // 2. Get historical data (3 months)
        const historicalMonths = [];
        for (let i = 3; i >= 1; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            historicalMonths.push({ start: monthStart, end: monthEnd, label: monthStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) });
        }

        // Get orders per month
        const monthlyData = [];
        for (const month of historicalMonths) {
            const orders = await prisma.wholesaleOrder.findMany({
                where: {
                    distributorId,
                    createdAt: { gte: month.start, lte: month.end },
                    status: { not: 'CANCELLED' },
                    paymentStatus: 'PAID'
                },
                select: { totalAmount: true, tenantId: true }
            });
            monthlyData.push({
                ...month,
                revenue: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
                orders: orders.length,
                uniqueCustomers: new Set(orders.map(o => o.tenantId)).size,
            });
        }

        // Get visits per month per sales rep
        const allVisits = await getSettings(`DIST_VISITS_${distributorId}`);

        // 3. Calculate per-sales-rep historical performance
        const repPerformance = salesReps.map(rep => {
            // Visits
            const repVisits = allVisits.filter(v => v.salesId === rep.id && v.status === 'COMPLETED');
            const monthlyVisits = historicalMonths.map(month => {
                const monthStr = month.start.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
                return repVisits.filter(v => v.date && v.date.startsWith(monthStr)).length;
            });
            const avgVisits = monthlyVisits.reduce((s, v) => s + v, 0) / Math.max(monthlyVisits.length, 1);

            // Effective calls (visits with orders)
            const effectiveVisits = repVisits.filter(v => v.orderCreated);
            const monthlyEffective = historicalMonths.map(month => {
                const monthStr = month.start.toISOString().split('T')[0].substring(0, 7);
                return effectiveVisits.filter(v => v.date && v.date.startsWith(monthStr)).length;
            });
            const avgEffective = monthlyEffective.reduce((s, v) => s + v, 0) / Math.max(monthlyEffective.length, 1);

            // Order value from visits
            const monthlyOrderValue = historicalMonths.map(month => {
                const monthStr = month.start.toISOString().split('T')[0].substring(0, 7);
                return effectiveVisits
                    .filter(v => v.date && v.date.startsWith(monthStr))
                    .reduce((s, v) => s + (v.orderAmount || 0), 0);
            });
            const avgOrderValue = monthlyOrderValue.reduce((s, v) => s + v, 0) / Math.max(monthlyOrderValue.length, 1);

            // Trend: compare last month to average
            const lastMonthValue = monthlyOrderValue[monthlyOrderValue.length - 1] || 0;
            const trend = avgOrderValue > 0 ? (lastMonthValue / avgOrderValue) : 1;

            // Territory potential (number of merchants in assigned territory)
            const territories = getSettings(`DIST_TERRITORIES_${distributorId}`);
            // Tenure in months
            const tenureMonths = Math.max(1, Math.floor((now - new Date(rep.createdAt)) / (1000 * 60 * 60 * 24 * 30)));

            return {
                userId: rep.id,
                name: rep.name,
                avgVisits: Math.round(avgVisits),
                avgEffective: Math.round(avgEffective),
                avgOrderValue: Math.round(avgOrderValue),
                trend: Math.round(trend * 100) / 100,
                tenureMonths,
                monthlyHistory: {
                    visits: monthlyVisits,
                    effective: monthlyEffective,
                    orderValue: monthlyOrderValue,
                },
            };
        });

        // 4. Calculate fair distribution weights
        const totalHistoricalRevenue = repPerformance.reduce((s, r) => s + r.avgOrderValue, 0);
        const totalHistoricalVisits = repPerformance.reduce((s, r) => s + r.avgVisits, 0);

        const targets = repPerformance.map(rep => {
            let weight;

            if (fairnessMode === 'equal') {
                // Equal distribution
                weight = 1 / salesReps.length;
            } else if (fairnessMode === 'performance') {
                // Pure performance-based (top performers get higher targets)
                weight = totalHistoricalRevenue > 0 ? rep.avgOrderValue / totalHistoricalRevenue : 1 / salesReps.length;
            } else {
                // Balanced: 60% performance + 25% potential + 15% tenure
                const perfWeight = totalHistoricalRevenue > 0 ? rep.avgOrderValue / totalHistoricalRevenue : 1 / salesReps.length;
                const tenureWeight = rep.tenureMonths / Math.max(1, repPerformance.reduce((s, r) => s + r.tenureMonths, 0));
                const potentialWeight = 1 / salesReps.length; // Equal potential for now (could use territory merchant count)

                weight = (perfWeight * 0.60) + (potentialWeight * 0.25) + (tenureWeight * 0.15);
            }

            // Apply growth factor
            const growthFactor = 1 + (growthPercent / 100);

            // Calculate individual targets
            let revenueTarget = Math.round(companyRevenueTarget * weight);
            let orderTarget = Math.round((companyOrderTarget || Math.round(companyRevenueTarget / (rep.avgOrderValue / Math.max(rep.avgEffective, 1) || 500000))) * weight);
            let visitTarget = Math.round((companyVisitTarget || Math.round(rep.avgVisits * growthFactor)) * (totalHistoricalVisits > 0 ? rep.avgVisits / totalHistoricalVisits : 1 / salesReps.length));

            // Apply floor/ceiling (fairness bounds)
            // Floor: at least 70% of their historical average × growth
            const revenueFloor = Math.round(rep.avgOrderValue * 0.7 * growthFactor);
            const revenueCeiling = Math.round(rep.avgOrderValue * 1.5 * growthFactor);

            if (revenueTarget < revenueFloor && rep.avgOrderValue > 0) revenueTarget = revenueFloor;
            if (revenueTarget > revenueCeiling && rep.avgOrderValue > 0) revenueTarget = revenueCeiling;

            // Visit target: min based on historical
            const visitFloor = Math.max(Math.round(rep.avgVisits * 0.8), 10);
            if (visitTarget < visitFloor) visitTarget = visitFloor;

            return {
                userId: rep.userId,
                userName: rep.name,
                revenue: revenueTarget,
                orders: Math.max(orderTarget, 5),
                visits: visitTarget,
                newCustomers: Math.max(Math.round(orderTarget * 0.1), 2),
                // Metadata for transparency
                basis: {
                    avgHistoricalRevenue: rep.avgOrderValue,
                    avgHistoricalVisits: rep.avgVisits,
                    avgHistoricalEffective: rep.avgEffective,
                    trend: rep.trend,
                    weight: Math.round(weight * 1000) / 1000,
                    growthApplied: growthPercent,
                    fairnessMode,
                },
                isAutoGenerated: true,
                generatedAt: new Date().toISOString(),
            };
        });

        // 5. Normalize: ensure total targets sum to company target
        const totalAssignedRevenue = targets.reduce((s, t) => s + t.revenue, 0);
        if (totalAssignedRevenue > 0 && Math.abs(totalAssignedRevenue - companyRevenueTarget) > 1000) {
            const adjustFactor = companyRevenueTarget / totalAssignedRevenue;
            targets.forEach(t => {
                t.revenue = Math.round(t.revenue * adjustFactor);
            });
        }

        // 6. Save targets
        const key = `DIST_TARGETS_${distributorId}`;
        await saveSettings(key, targets.map(t => ({
            userId: t.userId,
            revenue: t.revenue,
            orders: t.orders,
            visits: t.visits,
            newCustomers: t.newCustomers,
            isAutoGenerated: true,
            generatedAt: t.generatedAt,
            updatedAt: new Date().toISOString(),
        })), 'Sales targets');

        // 7. Save company hope target for reference
        await saveSettings(`DIST_COMPANY_TARGET_${distributorId}`, {
            companyRevenueTarget,
            companyOrderTarget: companyOrderTarget || null,
            companyVisitTarget: companyVisitTarget || null,
            growthPercent,
            fairnessMode,
            generatedAt: new Date().toISOString(),
            historicalContext: {
                months: historicalMonths.map(m => m.label),
                monthlyRevenue: monthlyData.map(m => m.revenue),
                monthlyOrders: monthlyData.map(m => m.orders),
                avgMonthlyRevenue: Math.round(monthlyData.reduce((s, m) => s + m.revenue, 0) / Math.max(monthlyData.length, 1)),
            }
        }, 'Company KPI target');

        return successResponse(res, {
            companyTarget: {
                revenue: companyRevenueTarget,
                orders: companyOrderTarget || targets.reduce((s, t) => s + t.orders, 0),
                visits: companyVisitTarget || targets.reduce((s, t) => s + t.visits, 0),
            },
            historicalContext: {
                months: historicalMonths.map(m => m.label),
                monthlyRevenue: monthlyData.map(m => m.revenue),
                avgMonthlyRevenue: Math.round(monthlyData.reduce((s, m) => s + m.revenue, 0) / Math.max(monthlyData.length, 1)),
                totalTeamMembers: salesReps.length,
            },
            config: { growthPercent, fairnessMode },
            targets,
            summary: {
                totalAssignedRevenue: targets.reduce((s, t) => s + t.revenue, 0),
                totalAssignedOrders: targets.reduce((s, t) => s + t.orders, 0),
                totalAssignedVisits: targets.reduce((s, t) => s + t.visits, 0),
                avgTargetPerRep: Math.round(targets.reduce((s, t) => s + t.revenue, 0) / targets.length),
            }
        }, "KPI targets generated successfully");
    } catch (error) {
        return errorResponse(res, "Failed to generate KPI targets", 500, error);
    }
};

/**
 * GET /distributor/kpi/company-target
 * Get the company-level hope target set by Director
 */
const getCompanyTarget = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const data = await getSettings(`DIST_COMPANY_TARGET_${distributorId}`);
        return successResponse(res, data || {}, "Company target retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch company target", 500, error);
    }
};

/**
 * PUT /distributor/kpi/company-target
 * Director sets the hope target (company-level)
 */
const setCompanyTarget = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { companyRevenueTarget, companyOrderTarget, companyVisitTarget, growthPercent, notes } = req.body;

        if (!companyRevenueTarget) {
            return errorResponse(res, "companyRevenueTarget wajib diisi", 400);
        }

        const data = {
            companyRevenueTarget: parseFloat(companyRevenueTarget),
            companyOrderTarget: companyOrderTarget ? parseInt(companyOrderTarget) : null,
            companyVisitTarget: companyVisitTarget ? parseInt(companyVisitTarget) : null,
            growthPercent: growthPercent || 10,
            notes: notes || '',
            setBy: req.user.userId,
            setAt: new Date().toISOString(),
        };

        await saveSettings(`DIST_COMPANY_TARGET_${distributorId}`, data, 'Company KPI target');
        return successResponse(res, data, "Company target saved");
    } catch (error) {
        return errorResponse(res, "Failed to save company target", 500, error);
    }
};

module.exports = {
    generateKpiTargets,
    getCompanyTarget,
    setCompanyTarget,
};
