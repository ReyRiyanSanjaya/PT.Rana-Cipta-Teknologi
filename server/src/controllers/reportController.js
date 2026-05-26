const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');

async function callModernMerchantAssistant(payload) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || typeof fetch !== 'function') {
        return null;
    }
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const systemContent =
        'Anda adalah asisten AI Rana POS yang membantu pemilik toko dan kasir UMKM di Indonesia. ' +
        'Jawab singkat, jelas, praktis, dan gunakan bahasa Indonesia yang ramah. ' +
        'Fokus pada topik laporan penjualan, stok, promo, pelanggan, dan operasional toko. ' +
        'Selalu kembalikan dalam format JSON dengan bentuk: ' +
        '{"reply": "jawaban utama dalam 2-4 kalimat", "suggestions": ["saran lanjutan 1", "saran lanjutan 2", "..."]}. ' +
        'Tanpa teks di luar JSON.';
    const body = {
        model,
        messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: JSON.stringify(payload) }
        ],
        temperature: 0.5,
        max_tokens: 512
    };
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        const content =
            data &&
            data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            data.choices[0].message.content;
        if (!content) {
            return null;
        }
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            return {
                reply: content.toString(),
                suggestions: []
            };
        }
        const reply = parsed && parsed.reply ? parsed.reply.toString() : '';
        let suggestions = [];
        if (parsed && Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions
                .map(x => x.toString())
                .filter(x => x.trim().length > 0)
                .slice(0, 5);
        }
        return { reply, suggestions };
    } catch (error) {
        return null;
    }
}

/**
 * Get Dashboard Summary
 * /reports/dashboard?storeId=...&date=...
 */
const getDashboardStats = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { storeId, date } = req.query; // YYYY-MM-DD

        if (!date) return errorResponse(res, "Date is required", 400);

        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);

        // --- 1. FINANCIAL SUMMARY ---
        let summary;

        if (storeId) {
            // Specific Store
            summary = await prisma.dailySalesSummary.findFirst({
                where: { tenantId, storeId, date: startOfDay }
            });
        } else {
            // Global (All Stores) - Aggregate
            const agg = await prisma.dailySalesSummary.aggregate({
                where: { tenantId, date: startOfDay },
                _sum: { totalSales: true, totalTrans: true }
            });

            if (agg._sum.totalSales !== null) {
                summary = {
                    totalSales: agg._sum.totalSales,
                    totalTrans: agg._sum.totalTrans,
                };
            }
        }

        // Calculate COGS / Fallback if Summary Missing
        let cogs = 0;
        
        // Query items for COGS calculation (needed in both cases)
        const items = await prisma.transactionItem.findMany({
            where: {
                transaction: {
                    tenantId,
                    orderStatus: 'COMPLETED',
                    storeId: storeId || undefined,
                    occurredAt: { gte: startOfDay, lte: dayEnd }
                }
            },
            select: {
                quantity: true,
                price: true, // Selling price
                costPrice: true, // [FIX] Also select costPrice snapshot
                basePrice: true, // Recorded base price at sale
                productId: true,
                product: { select: { basePrice: true, name: true, sku: true } }
            }
        });

        // Calculate COGS
        for (const it of items) {
            const bp = it.costPrice != null ? Number(it.costPrice) : (it.basePrice != null ? Number(it.basePrice) : Number(it.product?.basePrice || 0));
            cogs += bp * Number(it.quantity || 0);
        }

        if (!summary) {
            // Fallback: Calculate from transactions directly
            const txnAgg = await prisma.transaction.aggregate({
                where: {
                    tenantId,
                    orderStatus: 'COMPLETED',
                    storeId: storeId || undefined,
                    occurredAt: { gte: startOfDay, lte: dayEnd }
                },
                _sum: { totalAmount: true },
                _count: { _all: true }
            });
            
            const revenue = Number(txnAgg._sum.totalAmount) || 0;
            const transCount = Number(txnAgg._count._all) || 0;

            summary = {
                totalSales: revenue,
                totalTrans: transCount,
                grossProfit: revenue - cogs,
                netSales: revenue,
                cogs: cogs
            };
        } else {
            // If summary exists, just attach calculated COGS
            summary.cogs = cogs;
        }

        // --- 2. TOP PRODUCTS (REALTIME CALCULATION) ---
        // Calculate directly from today's transactions to ensure accuracy
        // (Bypassing ProductSalesSummary which might be empty)
        
        const productStats = new Map();

        for (const item of items) {
            const pid = item.productId;
            if (!productStats.has(pid)) {
                productStats.set(pid, {
                    productId: pid,
                    product: item.product || { name: 'Unknown', sku: '-' },
                    quantitySold: 0,
                    revenue: 0
                });
            }
            const stat = productStats.get(pid);
            stat.quantitySold += item.quantity;
            stat.revenue += (Number(item.price) * item.quantity);
        }

        const topProducts = Array.from(productStats.values())
            .sort((a, b) => b.revenue - a.revenue) // Sort by Revenue High -> Low
            .slice(0, 5);

        // --- RESPONSE ---
        const financials = {
            grossSales: Number(summary.grossSales ?? summary.totalSales ?? 0),
            netSales: Number(summary.netSales ?? summary.totalSales ?? 0),
            grossProfit: Number(summary.grossProfit ?? (Number(summary.totalSales || 0) - Number(summary.cogs || 0))),
            transactionCount: Number(summary.transactionCount ?? summary.totalTrans ?? 0),
            cogs: Number(summary.cogs ?? 0)
        };

        return successResponse(res, { financials, topProducts });

    } catch (error) {
        return errorResponse(res, "Failed to fetch dashboard stats", 500, error);
    }
};

/**
 * Get Profit & Loss Report
 * /reports/profit-loss?startDate=...&endDate=...
 */
const getProfitLoss = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { startDate, endDate, storeId } = req.query;

        if (!startDate || !endDate) {
            return errorResponse(res, "startDate dan endDate wajib diisi", 400);
        }

        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);

        // [FIX] Adjust for WIB (UTC+7)
        // User wants Jan 10 00:00 WIB -> Jan 9 17:00 UTC
        start.setHours(start.getHours() - 7);
        end.setHours(end.getHours() - 7);

        // Aggregate the Aggregates: Summing up DailySalesSummaries
        const aggs = await prisma.dailySalesSummary.groupBy({
            by: ['tenantId'],
            where: {
                tenantId,
                storeId: storeId || undefined,
                date: {
                    gte: start,
                    lte: end
                }
            },
            _sum: {
                totalSales: true,
                totalTrans: true
            }
        });

        // Fetch Expenses (CashflowLog)
        const expenses = await prisma.cashflowLog.groupBy({
            by: ['category'],
            where: {
                tenantId,
                storeId: storeId || undefined,
                type: 'CASH_OUT',
                category: {
                    in: ['EXPENSE_OPERATIONAL', 'EXPENSE_PURCHASE', 'EXPENSE_PETTY', 'OTHER']
                },
                occurredAt: {
                    gte: start,
                    lte: end
                }
            },
            _sum: {
                amount: true
            }
        });

        const totals = aggs[0]?._sum || {};

        // Process Expenses
        const expenseMap = {};
        let totalExpenses = 0;
        expenses.forEach(e => {
            const amt = Number(e._sum.amount);
            expenseMap[e.category] = amt;
            totalExpenses += amt;
        });

        // Fallback: jika DailySalesSummary kosong, agregasi langsung dari transaksi
        let revenue = totals.totalSales || 0;
        let transCount = totals.totalTrans || 0;
        if (!revenue && !transCount) {
            const txnAgg = await prisma.transaction.aggregate({
                where: {
                    tenantId,
                    orderStatus: 'COMPLETED',
                    storeId: storeId || undefined,
                    occurredAt: {
                        gte: start,
                        lte: end
                    }
                },
                _sum: { totalAmount: true },
                _count: { _all: true }
            });
            revenue = Number(txnAgg._sum.totalAmount) || 0;
            transCount = Number(txnAgg._count._all) || 0;
        }

        // Calculate COGS (HPP) using transaction items in the period
        const periodItems = await prisma.transactionItem.findMany({
            where: {
                transaction: {
                    tenantId,
                    orderStatus: 'COMPLETED',
                    storeId: storeId || undefined,
                    occurredAt: { gte: start, lte: end }
                }
            },
            select: {
                quantity: true,
                costPrice: true, // [FIX] Also select costPrice snapshot
                basePrice: true,
                product: { select: { basePrice: true } }
            }
        });
        let cogs = 0;
        for (const it of periodItems) {
            const bp = it.costPrice != null ? Number(it.costPrice) : (it.basePrice != null ? Number(it.basePrice) : Number(it.product?.basePrice || 0));
            cogs += bp * Number(it.quantity || 0);
        }
        const grossProfit = revenue - cogs;
        const netProfit = grossProfit - totalExpenses;

        return successResponse(res, {
            period: { start, end },
            pnl: {
                revenue,
                transCount,
                cogs,
                grossProfit,
                margin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0,
                taxCollected: 0,
                discountsGiven: 0,
                totalExpenses,
                netProfit,
                expenseBreakdown: expenseMap
            }
        });

    } catch (error) {
        return errorResponse(res, "Failed to fetch P&L", 500, error);
    }
};

/**
 * Get Inventory Intelligence (Slow Moving / Stock Aging)
 * /reports/inventory-aging
 */
const getInventoryIntelligence = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { storeId } = req.query;
        const now = new Date();

        // 1. Alerts: Low Stock
        // Find products where global stock is <= 5
        const lowStock = await prisma.product.findMany({
            where: {
                tenantId,
                isActive: true,
                stock: { lte: 5 } 
            },
            take: 20
        });

        // 2. Slow Moving Analysis (Stok Lambat)
        // Definisi: Produk dengan Stok > 0 tapi tidak ada penjualan > 30 hari

        const productsWithStock = await prisma.product.findMany({
            where: {
                tenantId,
                isActive: true,
                stock: { gt: 0 }
            },
            select: { id: true, name: true, sku: true, stock: true, createdAt: true }
        });

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const recentTransactions = await prisma.transaction.findMany({
            where: {
                tenantId,
                orderStatus: 'COMPLETED',
                occurredAt: { gte: ninetyDaysAgo }
            },
            select: {
                occurredAt: true,
                transactionItems: {
                    select: { productId: true }
                }
            }
        });

        const lastSoldMap = new Map();
        for (const txn of recentTransactions) {
            const date = new Date(txn.occurredAt);
            for (const item of txn.transactionItems) {
                const currentLast = lastSoldMap.get(item.productId);
                if (!currentLast || date > currentLast) {
                    lastSoldMap.set(item.productId, date);
                }
            }
        }

        const slowMoving = [];
        const THRESHOLD_DAYS = 30;

        for (const product of productsWithStock) {
            let lastActivityDate = lastSoldMap.get(product.id);
            
            if (!lastActivityDate) {
                lastActivityDate = new Date(product.createdAt);
            }

            const diffTime = Math.abs(now - lastActivityDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > THRESHOLD_DAYS) {
                slowMoving.push({
                    id: product.id,
                    name: product.name,
                    sku: product.sku || '-',
                    daysInactive: diffDays,
                    lastSoldDate: lastActivityDate
                });
            }
        }

        slowMoving.sort((a, b) => b.daysInactive - a.daysInactive);

        // 3. Top Products (Featured) - Last 30 Days
        // Calculate based on quantity sold
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const topTransactions = await prisma.transactionItem.groupBy({
            by: ['productId'],
            where: {
                transaction: {
                    tenantId,
                    orderStatus: 'COMPLETED',
                    occurredAt: { gte: thirtyDaysAgo }
                }
            },
            _sum: { quantity: true, price: true }, // price here is sum of price per item * qty? No, prisma sum aggregates. Wait, price is per item. We need sum of (price * qty) which prisma group by doesn't support directly for derived fields.
            // We can just count quantity for "Featured" or "Best Seller".
            orderBy: {
                _sum: { quantity: 'desc' }
            },
            take: 5
        });

        // Hydrate product details
        const topProductIds = topTransactions.map(t => t.productId);
        const topProductDetails = await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name: true, sku: true }
        });

        const topProducts = topTransactions.map(t => {
            const product = topProductDetails.find(p => p.id === t.productId) || { name: 'Unknown', sku: '-' };
            return {
                product,
                quantitySold: t._sum.quantity,
                revenue: Number(t._sum.price || 0) * Number(t._sum.quantity || 0) // Approximation if price didn't change. 
                // Better to just use quantity for ranking. But UI shows revenue.
                // Let's use a simpler approach for revenue: 
                // We really need real revenue.
            };
        });

        // Better approach for Top Products with Revenue:
        const periodTransactions = await prisma.transactionItem.findMany({
            where: {
                transaction: {
                    tenantId,
                    orderStatus: 'COMPLETED',
                    occurredAt: { gte: thirtyDaysAgo },
                    storeId: storeId || undefined
                }
            },
            select: {
                productId: true,
                quantity: true,
                price: true,
                product: { select: { name: true, sku: true } }
            }
        });

        const productStats = new Map();
        for (const item of periodTransactions) {
            const pid = item.productId;
            if (!productStats.has(pid)) {
                productStats.set(pid, {
                    product: item.product || { name: 'Unknown', sku: '-' },
                    quantitySold: 0,
                    revenue: 0
                });
            }
            const stat = productStats.get(pid);
            stat.quantitySold += item.quantity;
            stat.revenue += (Number(item.price) * item.quantity);
        }

        const topProductsList = Array.from(productStats.values())
            .sort((a, b) => b.quantitySold - a.quantitySold) // Sort by Quantity for "Featured" (Popularity)
            .slice(0, 5);


        return successResponse(res, {
            alerts: {
                lowStockCount: lowStock.length,
                items: lowStock
            },
            slowMoving: slowMoving.slice(0, 20),
            topProducts: topProductsList
        });

    } catch (error) {
        return errorResponse(res, "Failed inventory report", 500, error);
    }
};

const getAnalytics = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { startDate, endDate, storeId } = req.query;
        if (!startDate || !endDate) {
            return errorResponse(res, "startDate dan endDate wajib diisi", 400);
        }
        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);

        // Adjust for WIB (UTC+7)
        start.setHours(start.getHours() - 7);
        end.setHours(end.getHours() - 7);

        // 1. Fetch Aggregated Daily Data for Trend & Summary
        const dailySummaries = await prisma.dailySalesSummary.findMany({
            where: {
                tenantId,
                storeId: storeId || undefined,
                date: { gte: start, lte: end }
            },
            orderBy: { date: 'asc' }
        });

        // 2. Category Sales (Optimized via GroupBy)
        const categoryStats = await prisma.transactionItem.groupBy({
            by: ['productId'],
            where: {
                transaction: {
                    tenantId,
                    storeId: storeId || undefined,
                    orderStatus: 'COMPLETED',
                    occurredAt: { gte: start, lte: end }
                }
            },
            _sum: { quantity: true, price: true }
        });
        
        // We still need to hydrate category names, but only for the unique product IDs
        const productIds = categoryStats.map(s => s.productId);
        const productsSelected = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, category: { select: { name: true } } }
        });

        const categoryMap = {};
        const productDataMap = new Map();
        productsSelected.forEach(p => productDataMap.set(p.id, p));

        const topProductsRaw = categoryStats.map(s => {
            const p = productDataMap.get(s.productId);
            const revenue = (Number(s._sum.price) || 0) * (Number(s._sum.quantity) || 0);
            const catName = p?.category?.name || 'Unknown';
            categoryMap[catName] = (categoryMap[catName] || 0) + revenue;
            return {
                productId: s.productId,
                name: p?.name || 'Unknown',
                sku: p?.sku || '-',
                quantity: s._sum.quantity,
                revenue: revenue
            };
        });

        const topProducts = topProductsRaw.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const categorySales = Object.entries(categoryMap).map(([category, revenue]) => ({ category, revenue }));

        // 3. Payment Methods (Optimized via GroupBy)
        const paymentStats = await prisma.transaction.groupBy({
            by: ['paymentMethod'],
            where: {
                tenantId,
                storeId: storeId || undefined,
                orderStatus: 'COMPLETED',
                occurredAt: { gte: start, lte: end }
            },
            _sum: { totalAmount: true }
        });
        const paymentMethods = paymentStats.map(s => ({
            method: s.paymentMethod || 'UNKNOWN',
            total: Number(s._sum.totalAmount) || 0
        }));

        // 4. Expenses (Optimized via GroupBy)
        const expenses = await prisma.cashflowLog.groupBy({
            by: ['category'],
            where: {
                tenantId,
                storeId: storeId || undefined,
                type: 'CASH_OUT',
                category: { in: ['EXPENSE_OPERATIONAL', 'EXPENSE_PURCHASE', 'EXPENSE_PETTY', 'OTHER'] },
                occurredAt: { gte: start, lte: end }
            },
            _sum: { amount: true }
        });
        const expenseBreakdown = {};
        let totalExpenses = 0;
        for (const e of expenses) {
            const amt = Number(e._sum.amount) || 0;
            expenseBreakdown[e.category] = amt;
            totalExpenses += amt;
        }

        // 5. Basic Totals & Trend
        let revenue = 0;
        let totalTransactions = 0;
        const trend = dailySummaries.map(ds => {
            revenue += ds.totalSales;
            totalTransactions += ds.transactionCount;
            const wibDate = new Date(ds.date);
            wibDate.setHours(wibDate.getHours() + 7);
            return {
                date: wibDate.toISOString().split('T')[0],
                sales: ds.totalSales,
                expenses: 0 // Will hydrate if needed or just use summary
            };
        });

        // Fallback for revenue if dailySummaries is empty (e.g. not aggregated yet)
        if (revenue === 0) {
            const fallback = await prisma.transaction.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    orderStatus: 'COMPLETED',
                    occurredAt: { gte: start, lte: end }
                },
                _sum: { totalAmount: true },
                _count: { _all: true }
            });
            revenue = Number(fallback._sum.totalAmount) || 0;
            totalTransactions = Number(fallback._count._all) || 0;
        }

        // COGS Calculation (Needs items for accuracy if not aggregated)
        // We'll limit properties fetched to save memory
        const periodItems = await prisma.transactionItem.findMany({
            where: {
                transaction: {
                    tenantId,
                    storeId: storeId || undefined,
                    orderStatus: 'COMPLETED',
                    occurredAt: { gte: start, lte: end }
                }
            },
            select: { 
                quantity: true, 
                costPrice: true, // [FIX] Also select costPrice snapshot
                basePrice: true, 
                product: { select: { basePrice: true } },
                transaction: { select: { customerId: true, occurredAt: true, totalAmount: true } }
            }
        });
        
        let cogs = 0;
        const customerStatsMap = new Map();
        const hourlyMap = new Array(24).fill(0).map(() => ({ count: 0, revenue: 0 }));
        
        // Single pass for metrics that need granular data
        const uniqueTxns = new Set();
        for (const it of periodItems) {
            const bp = it.costPrice != null ? Number(it.costPrice) : (it.basePrice != null ? Number(it.basePrice) : Number(it.product?.basePrice || 0));
            cogs += bp * Number(it.quantity || 0);

            const t = it.transaction;
            if (!t) continue;
            
            // Only process each transaction once for customer/hourly stats
            const tKey = t.occurredAt.getTime();
            if (!uniqueTxns.has(tKey)) {
                uniqueTxns.add(tKey);
                
                // Hourly stats
                const d = new Date(t.occurredAt);
                const hour = (d.getUTCHours() + 7) % 24;
                hourlyMap[hour].count += 1;
                hourlyMap[hour].revenue += Number(t.totalAmount) || 0;

                // Customer stats
                if (t.customerId) {
                    const cid = t.customerId;
                    const existing = customerStatsMap.get(cid) || { total: 0, count: 0, lastDate: null };
                    existing.total += Number(t.totalAmount) || 0;
                    if (!existing.lastDate || t.occurredAt > existing.lastDate) existing.lastDate = t.occurredAt;
                    existing.count += 1;
                    customerStatsMap.set(cid, existing);
                }
            }
        }

        const averageOrderValue = totalTransactions > 0 ? revenue / totalTransactions : 0;
        const netProfit = revenue - cogs - totalExpenses;

        // Peak Hour
        const hourlyStats = hourlyMap.map((stats, hour) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            ...stats
        }));

        // Insights logic (re-used but with optimized data)
        const insights = [];
        const peakHour = hourlyStats.reduce((max, curr) => curr.revenue > max.revenue ? curr : max, { revenue: 0, hour: '00:00' });
        if (peakHour.revenue > 0) {
            insights.push({
                type: 'PEAK_HOUR',
                title: 'Jam Tersibuk',
                message: `Penjualan tertinggi terjadi pada pukul ${peakHour.hour} dengan omzet Rp ${peakHour.revenue.toLocaleString('id-ID')}.`
            });
        }

        // Return Data
        return successResponse(res, {
            summary: {
                revenue,
                cogs,
                totalExpenses,
                netProfit,
                totalTransactions,
                averageOrderValue,
                growth: await (async () => {
                    const duration = end.getTime() - start.getTime();
                    const prevEnd = new Date(start.getTime() - 1);
                    const prevStart = new Date(prevEnd.getTime() - duration);
                    const prevAgg = await prisma.dailySalesSummary.aggregate({
                        where: { tenantId, storeId: storeId || undefined, date: { gte: prevStart, lte: prevEnd } },
                        _sum: { totalSales: true }
                    });
                    const prevRevenue = Number(prevAgg._sum.totalSales) || 0;
                    return {
                        revenue: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
                        expenses: 0,
                        netProfit: 0
                    };
                })()
            },
            hourlyStats,
            trend,
            topProducts,
            categorySales,
            paymentMethods,
            expenses: expenseBreakdown,
            insights
        });

        const msPerDay = 1000 * 60 * 60 * 24;
        const daysInPeriod = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);

        const dailySoldMap = new Map();
        for (const [pid, stat] of productStats.entries()) {
            const qty = Number(stat.quantity) || 0;
            if (qty <= 0) continue;
            dailySoldMap.set(pid, qty / daysInPeriod);
        }

        const lowStocks = await prisma.stock.findMany({
            where: {
                quantity: { lte: 5 },
                store: { tenantId }
            },
            include: { product: { select: { id: true, name: true, sku: true, minStock: true } } },
            take: 50
        });

        const restockCandidates = [];
        for (const s of lowStocks) {
            const pid = s.product?.id;
            if (!pid) continue;
            const dailySold = dailySoldMap.get(pid) || 0;
            if (dailySold <= 0) continue;
            const currentQty = Number(s.quantity || 0);
            if (currentQty < 0) continue;
            const daysLeft = currentQty <= 0 ? 0 : currentQty / dailySold;
            if (daysLeft > 7) continue;
            const targetDays = 14;
            const targetQty = dailySold * targetDays;
            const suggestedQty = Math.max(0, Math.ceil(targetQty - currentQty));
            restockCandidates.push({
                productId: pid,
                name: s.product?.name || 'Unknown',
                daysLeft,
                suggestedQty
            });
        }

        restockCandidates.sort((a, b) => a.daysLeft - b.daysLeft);
        const topRestock = restockCandidates.slice(0, 3);
        if (topRestock.length > 0) {
            const names = topRestock.map(r => r.name).filter(Boolean);
            const summaryNames = names.slice(0, 3).join(', ');
            const detailParts = topRestock.map(r => {
                const days = r.daysLeft <= 0 ? 'segera' : `~${Math.max(1, Math.round(r.daysLeft))} hari lagi`;
                const qty = r.suggestedQty > 0 ? `saran tambah sekitar ${r.suggestedQty} pcs` : '';
                return `${r.name} (${days}${qty ? `, ${qty}` : ''})`;
            });
            insights.push({
                type: 'RESTOCK',
                title: 'Rekomendasi Restock',
                message: `Beberapa produk diperkirakan akan habis dalam waktu dekat: ${summaryNames}. Detail: ${detailParts.join('; ')}. Pertimbangkan melakukan pembelian ulang sebelum stok benar-benar habis.`
            });
        }

        const allProductsArray = Array.from(productStats.values());
        if (allProductsArray.length > 0) {
            let totalRevenueAll = 0;
            for (const p of allProductsArray) {
                totalRevenueAll += Number(p.revenue) || 0;
            }
            const avgRevenuePerProduct = totalRevenueAll / allProductsArray.length;
            const slowMovingCandidates = allProductsArray
                .filter(p => {
                    const rev = Number(p.revenue) || 0;
                    return rev > 0 && rev < avgRevenuePerProduct * 0.2;
                })
                .sort((a, b) => (Number(a.revenue) || 0) - (Number(b.revenue) || 0))
                .slice(0, 3);
            if (slowMovingCandidates.length > 0) {
                const names = slowMovingCandidates
                    .map(p => p.product?.name || 'Unknown')
                    .filter(Boolean);
                if (names.length > 0) {
                    insights.push({
                        type: 'SLOW_MOVING_PROMO',
                        title: 'Produk Perlu Dibantu Promo',
                        message: `Penjualan beberapa produk relatif pelan di periode ini: ${names.join(', ')}. Coba bantu dengan promo khusus, misalnya diskon waktu tertentu atau bundling dengan produk yang lebih laris.`
                    });
                }
            }
        }

        const productNameMap = new Map();
        for (const [pid, stat] of productStats.entries()) {
            const name = stat.product?.name || 'Unknown';
            productNameMap.set(pid, name);
        }

        const pairArray = [];
        for (const [keyPair, value] of basketPairs.entries()) {
            pairArray.push({ key: keyPair, count: value.count });
        }
        pairArray.sort((a, b) => b.count - a.count);
        const topPairs = pairArray.filter(p => p.count >= 3).slice(0, 3);
        if (topPairs.length > 0) {
            const details = [];
            for (const p of topPairs) {
                const ids = p.key.split('|');
                const n1 = productNameMap.get(ids[0]) || 'Produk A';
                const n2 = productNameMap.get(ids[1]) || 'Produk B';
                details.push(`${n1} + ${n2} (muncul bersama di sekitar ${p.count} transaksi)`);
            }
            insights.push({
                type: 'BUNDLE',
                title: 'Ide Bundling Produk',
                message: `Ada kombinasi produk yang sering dibeli bersamaan: ${details.join('; ')}. Pertimbangkan membuat paket bundling dengan sedikit diskon untuk meningkatkan nilai transaksi.`
            });
        }

        if (customerStats.size > 0) {
            const nowRef = end;
            let loyal = 0;
            let atRisk = 0;
            let churnRisk = 0;
            let newly = 0;
            for (const stat of customerStats.values()) {
                if (!stat.lastDate) continue;
                const diffDays = Math.floor((nowRef.getTime() - stat.lastDate.getTime()) / msPerDay);
                if (stat.count === 1 && diffDays <= 14) {
                    newly += 1;
                } else if (stat.count >= 3 && diffDays <= 30) {
                    loyal += 1;
                } else if (diffDays > 30 && diffDays <= 90) {
                    atRisk += 1;
                } else if (diffDays > 90) {
                    churnRisk += 1;
                }
            }

            if (loyal > 0 || newly > 0) {
                const parts = [];
                if (loyal > 0) parts.push(`${loyal} pelanggan loyal`);
                if (newly > 0) parts.push(`${newly} pelanggan baru`);
                insights.push({
                    type: 'CUSTOMER_POSITIVE',
                    title: 'Pelanggan Loyal dan Baru',
                    message: `Terdapat ${parts.join(' dan ')} di periode ini. Pertimbangkan memberikan apresiasi berupa voucher kecil atau pesan terima kasih untuk menjaga hubungan baik.`
                });
            }

            if (atRisk > 0 || churnRisk > 0) {
                const parts = [];
                if (atRisk > 0) parts.push(`${atRisk} pelanggan yang tidak berbelanja lagi >30 hari`);
                if (churnRisk > 0) parts.push(`${churnRisk} pelanggan yang sangat jarang kembali`);
                insights.push({
                    type: 'CUSTOMER_AT_RISK',
                    title: 'Pelanggan Berisiko Hilang',
                    message: `Terdapat ${parts.join(' dan ')}. Coba kirim follow up personal atau broadcast promo khusus (misalnya diskon comeback) untuk mengajak mereka belanja lagi.`
                });
            }
        }

        return successResponse(res, {
            summary: {
                revenue,
                cogs,
                totalExpenses,
                netProfit,
                totalTransactions,
                averageOrderValue,
                growth
            },
            hourlyStats,
            trend,
            topProducts,
            categorySales,
            paymentMethods,
            expenses: expenseBreakdown,
            lowStock: lowStocks,
            insights // [NEW] AI Insights
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch analytics", 500, error);
    }
};

const merchantAssistant = async (req, res) => {
    try {
        const { message } = req.body || {};
        const text = (message || "").toString().trim();
        if (!text) {
            return errorResponse(res, "Pertanyaan tidak boleh kosong", 400);
        }

        const tenantId = req.user && req.user.tenantId ? req.user.tenantId : null;
        const storeId = req.user && req.user.storeId ? req.user.storeId : null;

        let context = null;
        if (tenantId) {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            try {
                const [aggTx, items, lowStocks] = await Promise.all([
                    prisma.transaction.aggregate({
                        where: {
                            tenantId,
                            orderStatus: 'COMPLETED',
                            storeId: storeId || undefined,
                            occurredAt: { gte: sevenDaysAgo, lte: now }
                        },
                        _sum: { totalAmount: true },
                        _count: { _all: true }
                    }),
                    prisma.transactionItem.findMany({
                        where: {
                            transaction: {
                                tenantId,
                                orderStatus: 'COMPLETED',
                                storeId: storeId || undefined,
                                occurredAt: { gte: sevenDaysAgo, lte: now }
                            }
                        },
                        select: {
                            quantity: true,
                            price: true,
                            product: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        },
                        take: 300
                    }),
                    prisma.stock.findMany({
                        where: {
                            quantity: { lte: 5 },
                            store: { tenantId },
                            product: { NOT: { id: null } }
                        },
                        select: {
                            quantity: true,
                            product: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        },
                        take: 50
                    })
                ]);

                const last7dRevenue = Number(aggTx._sum.totalAmount) || 0;
                const last7dTransactions = Number(aggTx._count._all) || 0;
                const last7dAov =
                    last7dTransactions > 0
                        ? last7dRevenue / last7dTransactions
                        : 0;

                const productAgg = new Map();
                for (const it of items) {
                    if (!it.product) continue;
                    const pid = it.product.id;
                    const prev = productAgg.get(pid) || {
                        name: it.product.name || 'Unknown',
                        revenue: 0
                    };
                    prev.revenue += (Number(it.price) || 0) * Number(it.quantity || 0);
                    productAgg.set(pid, prev);
                }
                const topProducts = Array.from(productAgg.values())
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 3)
                    .map(p => ({
                        name: p.name,
                        revenue: Math.round(p.revenue)
                    }));

                const lowStockProducts = [];
                for (const s of lowStocks) {
                    if (!s.product) continue;
                    lowStockProducts.push({
                        name: s.product.name || 'Unknown',
                        quantity: Number(s.quantity || 0)
                    });
                }

                context = {
                    summaryLast7Days: {
                        revenue: Math.round(last7dRevenue),
                        transactions: last7dTransactions,
                        averageOrderValue: Math.round(last7dAov)
                    },
                    topProducts,
                    lowStockProducts
                };
            } catch (_) {
                context = null;
            }
        }

        const modern = await callModernMerchantAssistant({
            question: text,
            locale: 'id-ID',
            tenantId,
            storeId,
            context
        });
        if (modern && modern.reply) {
            return successResponse(res, {
                reply: modern.reply,
                suggestions: modern.suggestions || []
            });
        }

        const lower = text.toLowerCase();
        const suggestions = [];
        let reply = "";

        if (lower.includes("stok") || lower.includes("persediaan") || lower.includes("habis")) {
            reply =
                "Untuk memantau stok, buka menu Laporan lalu cek bagian Ringkasan dan Insight Stok. " +
                "Produk dengan stok menipis akan muncul di insight dan laporan inventory. " +
                "Pastikan min stock sudah diatur agar sistem bisa memberi peringatan lebih cepat.";
            suggestions.push(
                "Buka menu Laporan > Ringkasan untuk melihat produk yang stoknya menipis.",
                "Gunakan fitur promo di menu Promo Hub untuk menghabiskan stok lambat."
            );
        } else if (lower.includes("penjualan") || lower.includes("omzet") || lower.includes("laporan")) {
            reply =
                "Penjualan periode terakhir bisa dilihat di menu Laporan. " +
                "Grafik tren, omzet, margin, dan jam tersibuk sudah diringkas untuk Anda. " +
                "Perhatikan juga insight AI di bagian bawah untuk rekomendasi tindakan.";
            suggestions.push(
                "Gunakan filter tanggal di menu Laporan untuk membandingkan periode yang berbeda.",
                "Fokus pada produk dengan omzet tertinggi dan margin sehat untuk kampanye promo."
            );
        } else if (lower.includes("promo") || lower.includes("diskon") || lower.includes("bundling")) {
            reply =
                "Untuk membuat promo, gunakan menu Promo & Broadcast. " +
                "Pilih produk yang penjualannya lambat atau stoknya menumpuk, lalu buat diskon atau bundling. " +
                "Insight AI di Beranda dan Laporan bisa membantu memilih produk yang tepat.";
            suggestions.push(
                "Prioritaskan promo untuk produk dengan stok besar tetapi pergerakan lambat.",
                "Coba bundling produk laris dengan produk yang kurang laku."
            );
        } else if (lower.includes("pelanggan") || lower.includes("customer") || lower.includes("loyal")) {
            reply =
                "Pelanggan bisa dikelola dengan melihat riwayat transaksi dan insight kebiasaan belanja di menu Laporan. " +
                "Anda bisa gunakan nomor WhatsApp pelanggan untuk kirim ucapan terima kasih atau promo khusus.";
            suggestions.push(
                "Buat daftar pelanggan yang jarang belanja lagi dan kirimkan promo comeback.",
                "Berikan apresiasi seperti voucher kecil untuk pelanggan yang sering belanja."
            );
        } else if (lower.includes("sepi") || lower.includes("ramai") || lower.includes("jam")) {
            reply =
                "Jam ramai dan sepi toko terlihat di grafik jam tersibuk di menu Laporan. " +
                "Gunakan insight ini untuk mengatur jadwal karyawan dan stok di jam tertentu.";
            suggestions.push(
                "Tambahkan promo khusus di jam-jam sepi untuk menarik kunjungan.",
                "Pastikan stok dan kembalian cukup sebelum memasuki jam tersibuk."
            );
        } else {
            reply =
                "Saat ini asisten pintar fokus membantu membaca laporan, stok, dan promo. " +
                "Coba ajukan pertanyaan seputar penjualan, stok, pelanggan, atau promo, " +
                "dan saya akan memberikan saran yang lebih spesifik.";
            suggestions.push(
                "Contoh: 'Bagaimana cara membaca laporan penjualan?', 'Produk mana yang sebaiknya dipromo?', 'Bagaimana mengurangi stok menumpuk?'."
            );
        }

        return successResponse(res, {
            reply,
            suggestions
        });
    } catch (error) {
        return errorResponse(res, "Failed to process assistant request", 500, error);
    }
};

module.exports = {
    getDashboardStats,
    getProfitLoss,
    getInventoryIntelligence,
    getAnalytics,
    merchantAssistant
};
