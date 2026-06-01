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

// ============================================================
// CHART OF ACCOUNTS (Bagan Akun)
// ============================================================

const DEFAULT_ACCOUNTS = [
    { code: '1100', name: 'Kas & Bank', type: 'ASSET', category: 'Aset Lancar' },
    { code: '1200', name: 'Piutang Usaha', type: 'ASSET', category: 'Aset Lancar' },
    { code: '1300', name: 'Persediaan Barang', type: 'ASSET', category: 'Aset Lancar' },
    { code: '1400', name: 'Aset Tetap', type: 'ASSET', category: 'Aset Tetap' },
    { code: '2100', name: 'Hutang Usaha', type: 'LIABILITY', category: 'Kewajiban' },
    { code: '2200', name: 'Hutang Pajak', type: 'LIABILITY', category: 'Kewajiban' },
    { code: '3100', name: 'Modal Pemilik', type: 'EQUITY', category: 'Ekuitas' },
    { code: '3200', name: 'Laba Ditahan', type: 'EQUITY', category: 'Ekuitas' },
    { code: '4100', name: 'Pendapatan Penjualan', type: 'REVENUE', category: 'Pendapatan' },
    { code: '4200', name: 'Pendapatan Lain-lain', type: 'REVENUE', category: 'Pendapatan' },
    { code: '5100', name: 'Harga Pokok Penjualan', type: 'EXPENSE', category: 'Beban' },
    { code: '5200', name: 'Beban Operasional', type: 'EXPENSE', category: 'Beban' },
    { code: '5300', name: 'Beban Gaji', type: 'EXPENSE', category: 'Beban' },
    { code: '5400', name: 'Beban Pengiriman', type: 'EXPENSE', category: 'Beban' },
    { code: '5500', name: 'Beban Sewa', type: 'EXPENSE', category: 'Beban' },
    { code: '5600', name: 'Beban Lain-lain', type: 'EXPENSE', category: 'Beban' },
];

const getAccounts = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const key = `DIST_ACCOUNTS_${distributorId}`;
        let accounts = await getSettings(key);
        if (accounts.length === 0) {
            accounts = DEFAULT_ACCOUNTS.map((a, i) => ({ ...a, id: `ACC-${i + 1}`, balance: 0 }));
            await saveSettings(key, accounts, 'Chart of accounts');
        }
        return successResponse(res, accounts);
    } catch (error) {
        return errorResponse(res, "Failed to fetch accounts", 500, error);
    }
};

const createAccount = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { code, name, type, category } = req.body;
        if (!code || !name || !type) return errorResponse(res, "code, name, type required", 400);

        const key = `DIST_ACCOUNTS_${distributorId}`;
        const accounts = await getSettings(key);
        if (accounts.find(a => a.code === code)) return errorResponse(res, "Account code already exists", 400);

        accounts.push({ id: `ACC-${Date.now()}`, code, name, type, category: category || type, balance: 0 });
        await saveSettings(key, accounts, 'Chart of accounts');
        return successResponse(res, accounts[accounts.length - 1], "Account created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create account", 500, error);
    }
};

// ============================================================
// JOURNAL ENTRIES (Jurnal Umum)
// ============================================================

const getJournals = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { dateFrom, dateTo, type } = req.query;
        let journals = await getSettings(`DIST_JOURNALS_${distributorId}`);

        if (dateFrom) journals = journals.filter(j => j.date >= dateFrom);
        if (dateTo) journals = journals.filter(j => j.date <= dateTo);
        if (type) journals = journals.filter(j => j.type === type);

        journals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return successResponse(res, journals.slice(0, 200));
    } catch (error) {
        return errorResponse(res, "Failed to fetch journals", 500, error);
    }
};

const createJournal = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { date, description, type, entries } = req.body;
        // entries: [{ accountCode, accountName, debit, credit }]
        if (!date || !entries || entries.length < 2) return errorResponse(res, "date and min 2 entries required", 400);

        // Validate debit = credit
        const totalDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
        const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
        if (Math.abs(totalDebit - totalCredit) > 1) return errorResponse(res, "Debit must equal Credit", 400);

        const journal = {
            id: `JRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date, description: description || '', type: type || 'MANUAL',
            entries, totalDebit, totalCredit,
            createdBy: req.user.userId,
            createdAt: new Date().toISOString()
        };

        const key = `DIST_JOURNALS_${distributorId}`;
        const journals = await getSettings(key);
        journals.push(journal);
        await saveSettings(key, journals, 'Journal entries');

        // Update account balances
        const accKey = `DIST_ACCOUNTS_${distributorId}`;
        const accounts = await getSettings(accKey);
        entries.forEach(e => {
            const acc = accounts.find(a => a.code === e.accountCode);
            if (acc) {
                const debit = parseFloat(e.debit) || 0;
                const credit = parseFloat(e.credit) || 0;
                // ASSET & EXPENSE: debit increases, credit decreases
                // LIABILITY, EQUITY, REVENUE: credit increases, debit decreases
                if (['ASSET', 'EXPENSE'].includes(acc.type)) {
                    acc.balance = (acc.balance || 0) + debit - credit;
                } else {
                    acc.balance = (acc.balance || 0) + credit - debit;
                }
            }
        });
        await saveSettings(accKey, accounts, 'Chart of accounts');

        return successResponse(res, journal, "Journal entry created", 201);
    } catch (error) {
        return errorResponse(res, "Failed to create journal", 500, error);
    }
};

// ============================================================
// FINANCIAL REPORTS (Laporan Keuangan)
// ============================================================

const getProfitLoss = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { period } = req.query; // 'month' or 'year'
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const startDate = period === 'year' ? yearStart : monthStart;

        // Get real revenue from orders
        const revenue = await prisma.wholesaleOrder.aggregate({
            where: { distributorId, paymentStatus: 'PAID', createdAt: { gte: startDate } },
            _sum: { totalAmount: true }, _count: { _all: true }
        });

        // Get journals for expenses
        const journals = await getSettings(`DIST_JOURNALS_${distributorId}`);
        const periodJournals = journals.filter(j => new Date(j.date) >= startDate);

        // Aggregate by account type from journals
        const expenseFromJournals = periodJournals.reduce((sum, j) => {
            j.entries.forEach(e => {
                const accounts = DEFAULT_ACCOUNTS;
                const acc = accounts.find(a => a.code === e.accountCode);
                if (acc && acc.type === 'EXPENSE') sum += (parseFloat(e.debit) || 0);
            });
            return sum;
        }, 0);

        const totalRevenue = revenue._sum.totalAmount || 0;
        const cogs = Math.round(totalRevenue * 0.65); // Estimated 65% COGS
        const grossProfit = totalRevenue - cogs;
        const operatingExpenses = expenseFromJournals || Math.round(totalRevenue * 0.15);
        const netProfit = grossProfit - operatingExpenses;

        return successResponse(res, {
            period: period === 'year' ? 'Tahun Berjalan' : 'Bulan Berjalan',
            startDate: startDate.toISOString(),
            revenue: {
                sales: totalRevenue,
                orderCount: revenue._count._all,
                other: 0,
                total: totalRevenue
            },
            expenses: {
                cogs,
                operational: operatingExpenses,
                total: cogs + operatingExpenses
            },
            grossProfit,
            netProfit,
            margin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0
        });
    } catch (error) {
        return errorResponse(res, "Failed to generate P&L", 500, error);
    }
};

const getBalanceSheet = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        // Get account balances
        const accounts = await getSettings(`DIST_ACCOUNTS_${distributorId}`);

        // Get real data to enrich
        const [distributor, stockValue, receivables] = await Promise.all([
            prisma.distributor.findUnique({ where: { id: distributorId }, select: { balance: true } }),
            prisma.wholesaleProduct.aggregate({ where: { distributorId }, _sum: { stockQuantity: true } }),
            prisma.wholesaleOrder.aggregate({ where: { distributorId, paymentStatus: 'UNPAID' }, _sum: { totalAmount: true } })
        ]);

        // Build balance sheet from accounts + real data
        const assets = accounts.filter(a => a.type === 'ASSET');
        const liabilities = accounts.filter(a => a.type === 'LIABILITY');
        const equity = accounts.filter(a => a.type === 'EQUITY');

        // Override with real data
        const cashAccount = assets.find(a => a.code === '1100');
        if (cashAccount) cashAccount.balance = distributor?.balance || 0;
        const receivableAccount = assets.find(a => a.code === '1200');
        if (receivableAccount) receivableAccount.balance = receivables._sum.totalAmount || 0;

        const totalAssets = assets.reduce((s, a) => s + (a.balance || 0), 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + (a.balance || 0), 0);
        const totalEquity = equity.reduce((s, a) => s + (a.balance || 0), 0);

        return successResponse(res, {
            date: new Date().toISOString(),
            assets: { items: assets, total: totalAssets },
            liabilities: { items: liabilities, total: totalLiabilities },
            equity: { items: equity, total: totalEquity },
            balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 100
        });
    } catch (error) {
        return errorResponse(res, "Failed to generate balance sheet", 500, error);
    }
};

const getCashflow = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const now = new Date();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            const [inflow, outflow] = await Promise.all([
                prisma.wholesaleOrder.aggregate({
                    where: { distributorId, paymentStatus: 'PAID', createdAt: { gte: mStart, lte: mEnd } },
                    _sum: { totalAmount: true }
                }),
                prisma.wholesaleOrder.aggregate({
                    where: { distributorId, paymentMethod: 'EXTERNAL', createdAt: { gte: mStart, lte: mEnd } },
                    _sum: { totalAmount: true }
                })
            ]);

            const cashIn = inflow._sum.totalAmount || 0;
            const cashOut = Math.round(cashIn * 0.7); // Estimated outflow

            months.push({
                month: mStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                cashIn,
                cashOut,
                net: cashIn - cashOut
            });
        }

        return successResponse(res, {
            months,
            summary: {
                totalIn: months.reduce((s, m) => s + m.cashIn, 0),
                totalOut: months.reduce((s, m) => s + m.cashOut, 0),
                netCashflow: months.reduce((s, m) => s + m.net, 0)
            }
        });
    } catch (error) {
        return errorResponse(res, "Failed to generate cashflow", 500, error);
    }
};

module.exports = {
    getAccounts, createAccount,
    getJournals, createJournal,
    getProfitLoss, getBalanceSheet, getCashflow
};
