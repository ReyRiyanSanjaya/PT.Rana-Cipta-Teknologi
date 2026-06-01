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

const WORK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Haversine distance between two lat/lng points (in km)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nearest-neighbor clustering: group merchants by proximity for each day
 */
function clusterByProximity(merchants, numGroups) {
    if (merchants.length === 0) return Array(numGroups).fill([]);
    if (merchants.length <= numGroups) {
        return merchants.map(m => [m]).concat(Array(numGroups - merchants.length).fill([]));
    }

    // Sort merchants by latitude first (rough geographic grouping)
    const sorted = [...merchants].sort((a, b) => (a.latitude || 0) - (b.latitude || 0));

    // Split into roughly equal groups
    const groups = Array.from({ length: numGroups }, () => []);
    const perGroup = Math.ceil(sorted.length / numGroups);

    sorted.forEach((m, i) => {
        const groupIdx = Math.min(Math.floor(i / perGroup), numGroups - 1);
        groups[groupIdx].push(m);
    });

    // Within each group, sort by nearest-neighbor for optimal route
    return groups.map(group => sortByNearestNeighbor(group));
}

/**
 * Sort a list of merchants by nearest-neighbor (greedy TSP)
 */
function sortByNearestNeighbor(merchants) {
    if (merchants.length <= 1) return merchants;

    const result = [merchants[0]];
    const remaining = merchants.slice(1);

    while (remaining.length > 0) {
        const last = result[result.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(
                last.latitude || 0, last.longitude || 0,
                remaining[i].latitude || 0, remaining[i].longitude || 0
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        result.push(remaining[nearestIdx]);
        remaining.splice(nearestIdx, 1);
    }

    return result;
}

/**
 * POST /distributor/sfa/route-plans/generate
 * AI-generated route plan based on:
 * - Sales rep's assigned territories (kecamatan)
 * - Total merchants in those territories
 * - Work days (Mon-Sat half day)
 * - Visit frequency assigned by SPV
 * - Proximity-based daily grouping
 * - Spread visits evenly (no back-to-back same merchant)
 * - Waitlist for unvisited merchants
 */
const generateRoutePlan = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const {
            salesId,
            workDays = WORK_DAYS,
            visitFrequency = 1,       // visits per month per merchant (default: 1x/month)
            maxVisitsPerDay = 8,      // max merchants per day (Saturday = half)
            saturdayMax = 4,          // Saturday half day
            excludeDates = [],        // holidays: ['2026-06-01', ...]
        } = req.body;

        const targetSalesId = salesId || req.user.userId;

        // 1. Get territories assigned to this sales rep
        const territories = await getSettings(`DIST_TERRITORIES_${distributorId}`);
        const myTerritories = territories.filter(t => t.assignedTo === targetSalesId);

        if (myTerritories.length === 0) {
            return errorResponse(res, "Sales rep belum di-assign territory. Hubungi SPV untuk assign kecamatan.", 400);
        }

        const myAreas = myTerritories.flatMap(t => t.areas || []);

        // 2. Get all merchants in those territories
        const customers = await prisma.distributorCustomer.findMany({
            where: { distributorId, isActive: true },
            include: {
                tenant: {
                    include: {
                        stores: {
                            select: { name: true, location: true, latitude: true, longitude: true, category: true, waNumber: true },
                            take: 1
                        }
                    }
                }
            }
        });

        // Filter merchants by territory areas (match location string)
        const merchantsInTerritory = customers.filter(c => {
            const loc = (c.tenant?.stores?.[0]?.location || '').toLowerCase();
            return myAreas.some(area => loc.toLowerCase().includes(area.toLowerCase()));
        }).map(c => ({
            tenantId: c.tenantId,
            name: c.tenant?.stores?.[0]?.name || c.tenant?.name || 'Unknown',
            location: c.tenant?.stores?.[0]?.location || '',
            latitude: c.tenant?.stores?.[0]?.latitude || null,
            longitude: c.tenant?.stores?.[0]?.longitude || null,
            category: c.tenant?.stores?.[0]?.category || null,
            waNumber: c.tenant?.stores?.[0]?.waNumber || null,
        }));

        if (merchantsInTerritory.length === 0) {
            return errorResponse(res, "Tidak ada merchant di territory yang di-assign. Pastikan data lokasi merchant sudah benar.", 400);
        }

        // 3. Get previous visits to calculate last visit date per merchant
        const visits = await getSettings(`DIST_VISITS_${distributorId}`);
        const salesVisits = visits.filter(v => v.salesId === targetSalesId && v.status === 'COMPLETED');

        const lastVisitMap = {};
        salesVisits.forEach(v => {
            const key = (v.merchantName || '').toLowerCase().substring(0, 10);
            if (!lastVisitMap[key] || v.date > lastVisitMap[key]) {
                lastVisitMap[key] = v.date;
            }
        });

        // 4. Calculate how many visits needed this month
        const totalMerchants = merchantsInTerritory.length;
        const effectiveWorkDays = workDays.filter(d => d !== 'SUNDAY');
        const numWorkDays = effectiveWorkDays.length; // typically 6 (Mon-Sat)

        // Total visits needed per month = merchants × frequency
        const totalVisitsNeeded = totalMerchants * visitFrequency;

        // Visits per week = totalVisitsNeeded / 4 (weeks)
        const visitsPerWeek = Math.ceil(totalVisitsNeeded / 4);

        // Distribute across work days
        const visitsPerDay = {};
        effectiveWorkDays.forEach(day => {
            visitsPerDay[day] = day === 'SATURDAY' ? saturdayMax : maxVisitsPerDay;
        });

        // 5. Sort merchants by priority (least recently visited first)
        const today = new Date().toISOString().split('T')[0];
        const merchantsWithPriority = merchantsInTerritory.map(m => {
            const key = (m.name || '').toLowerCase().substring(0, 10);
            const lastVisit = lastVisitMap[key] || '2000-01-01';
            const daysSinceVisit = Math.floor((new Date(today) - new Date(lastVisit)) / (1000 * 60 * 60 * 24));
            return { ...m, lastVisit, daysSinceVisit, priority: daysSinceVisit };
        });

        // Sort: highest priority (longest since last visit) first
        merchantsWithPriority.sort((a, b) => b.priority - a.priority);

        // 6. Distribute merchants across days using proximity clustering
        // First, determine how many merchants per day
        const totalCapacity = effectiveWorkDays.reduce((sum, day) => sum + visitsPerDay[day], 0);
        const merchantsToSchedule = merchantsWithPriority.slice(0, Math.min(totalCapacity, totalMerchants));
        const waitlist = merchantsWithPriority.slice(totalCapacity);

        // Cluster merchants by proximity into N groups (one per work day)
        const clustered = clusterByProximity(merchantsToSchedule, numWorkDays);

        // 7. Assign clusters to days, respecting max per day
        const weeklyPlan = {};
        const scheduledMerchantNames = new Set();

        effectiveWorkDays.forEach((day, idx) => {
            const dayMax = visitsPerDay[day];
            const cluster = clustered[idx] || [];
            const dayMerchants = cluster.slice(0, dayMax);

            weeklyPlan[day] = dayMerchants.map((m, order) => ({
                merchantName: m.name,
                tenantId: m.tenantId,
                location: m.location,
                latitude: m.latitude,
                longitude: m.longitude,
                category: m.category,
                order: order + 1,
                lastVisit: m.lastVisit,
                daysSinceVisit: m.daysSinceVisit,
                estimatedTime: '30 min',
            }));

            dayMerchants.forEach(m => scheduledMerchantNames.add(m.name));
        });

        // 8. Build waitlist (merchants not scheduled this week)
        const finalWaitlist = merchantsWithPriority
            .filter(m => !scheduledMerchantNames.has(m.name))
            .map(m => ({
                merchantName: m.name,
                tenantId: m.tenantId,
                location: m.location,
                daysSinceVisit: m.daysSinceVisit,
                lastVisit: m.lastVisit,
                priority: m.daysSinceVisit > 30 ? 'HIGH' : m.daysSinceVisit > 14 ? 'MEDIUM' : 'LOW',
            }));

        // 9. Save generated plan
        const planId = `AUTO-${Date.now()}`;
        const key = `DIST_ROUTES_${distributorId}`;
        const existingPlans = await getSettings(key);

        // Remove old auto-generated plans for this sales rep
        const filteredPlans = existingPlans.filter(p => !(p.id && p.id.startsWith('AUTO-') && p.salesId === targetSalesId));

        // Add new plans per day
        const newPlans = [];
        for (const [day, merchants] of Object.entries(weeklyPlan)) {
            if (merchants.length === 0) continue;
            const plan = {
                id: `${planId}-${day}`,
                name: `Auto: ${myAreas.join(', ')} - ${day}`,
                salesId: targetSalesId,
                dayOfWeek: day,
                merchants: merchants,
                isActive: true,
                isAutoGenerated: true,
                generatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };
            newPlans.push(plan);
        }

        await saveSettings(key, [...filteredPlans, ...newPlans], 'Route plans');

        // 10. Save waitlist
        await saveSettings(`DIST_WAITLIST_${distributorId}_${targetSalesId}`, finalWaitlist, 'Visit waitlist');

        // Get sales name
        const salesUser = await prisma.user.findUnique({ where: { id: targetSalesId }, select: { name: true } });

        return successResponse(res, {
            salesName: salesUser?.name || 'Unknown',
            territories: myAreas,
            totalMerchants,
            scheduled: merchantsToSchedule.length,
            waitlistCount: finalWaitlist.length,
            weeklyPlan,
            waitlist: finalWaitlist.slice(0, 20),
            plans: newPlans,
            config: {
                workDays: effectiveWorkDays,
                visitFrequency,
                maxVisitsPerDay,
                saturdayMax,
            }
        }, "Route plan generated successfully");
    } catch (error) {
        return errorResponse(res, "Failed to generate route plan", 500, error);
    }
};

/**
 * GET /distributor/sfa/route-plans/waitlist
 * Get waitlist of merchants that haven't been visited
 */
const getWaitlist = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const salesId = req.query.salesId || req.user.userId;
        const waitlist = await getSettings(`DIST_WAITLIST_${distributorId}_${salesId}`);

        return successResponse(res, waitlist, "Waitlist retrieved");
    } catch (error) {
        return errorResponse(res, "Failed to fetch waitlist", 500, error);
    }
};

module.exports = {
    generateRoutePlan,
    getWaitlist,
};
