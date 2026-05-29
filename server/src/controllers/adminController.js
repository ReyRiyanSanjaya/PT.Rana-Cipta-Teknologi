const prisma = require('../config/database'); // [FIX] Singleton Prisma
const bcrypt = require('bcrypt'); // [NEW]
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/response');
const { emitPublic } = require('../socket');
const https = require('https');
const Contact = require('../models/contact');

const normalizePhone = (value) => {
    let digits = (value || '').toString().replace(/[^\d]/g, '');
    if (!digits) return '';
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    if (digits.startsWith('8')) digits = `62${digits}`;
    if (digits.startsWith('620')) digits = `62${digits.slice(3)}`;
    return digits;
};

const isLikelyPhoneNumber = (value) => {
    const digits = normalizePhone(value);
    if (!digits) return false;
    if (!digits.startsWith('62')) return false;
    if (digits.length < 10 || digits.length > 15) return false;
    return true;
};

const buildPhoneCandidates = (rawValue) => {
    const raw = (rawValue || '').toString().trim();
    const normalized = normalizePhone(raw);
    const candidates = new Set();
    if (raw) candidates.add(raw);
    if (normalized) {
        candidates.add(normalized);
        candidates.add(`+${normalized}`);
        if (normalized.startsWith('62')) candidates.add(`0${normalized.slice(2)}`);
    }
    return Array.from(candidates);
};

const getUrlText = (url, { timeoutMs = 5000, maxBytes = 64 * 1024, redirectsLeft = 5 } = {}) => {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            { headers: { 'user-agent': 'RanaPOS/1.0' } },
            (res) => {
                const statusCode = res.statusCode || 0;
                const location = res.headers.location;
                if ([301, 302, 303, 307, 308].includes(statusCode) && location && redirectsLeft > 0) {
                    res.resume();
                    const nextUrl = new URL(location, url).toString();
                    getUrlText(nextUrl, { timeoutMs, maxBytes, redirectsLeft: redirectsLeft - 1 })
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                let size = 0;
                const chunks = [];

                res.on('data', (chunk) => {
                    size += chunk.length;
                    if (size > maxBytes) {
                        req.destroy(new Error('Response too large'));
                        return;
                    }
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    resolve({
                        statusCode,
                        body: Buffer.concat(chunks).toString('utf8'),
                        finalUrl: url
                    });
                });
            }
        );

        req.on('error', reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timeout')));
    });
};

const verifyWhatsAppNumberWithoutOtp = async (value) => {
    const digits = normalizePhone(value);
    if (!digits) return false;
    try {
        const { statusCode, body } = await getUrlText(`https://wa.me/${digits}`, { timeoutMs: 5000 });
        if (!statusCode || statusCode >= 400) return false;
        const text = (body || '').toLowerCase();
        const invalidMarkers = [
            'phone number shared via url is invalid',
            'shared via url is invalid',
            'invalid phone number',
            'nomor telepon yang dibagikan'
        ];
        if (invalidMarkers.some((m) => text.includes(m))) return false;
        return true;
    } catch (_) {
        return false;
    }
};

// Get Withdrawals with filtering
const getWithdrawals = async (req, res) => {
    try {
        const { status } = req.query; // PENDING, APPROVED, REJECTED
        const whereClause = status ? { status } : {};

        const withdrawals = await prisma.withdrawal.findMany({
            where: whereClause,
            include: {
                store: {
                    select: {
                        name: true,
                        tenant: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return successResponse(res, withdrawals);
    } catch (error) {
        return errorResponse(res, "Failed to fetch withdrawals", 500, error);
    }
};

// Approve Withdrawal including proof
const approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { proofImage } = req.body; // Optional: URL to transfer proof

        const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
        if (!withdrawal) return errorResponse(res, "Withdrawal not found", 404);
        if (withdrawal.status !== 'PENDING') return errorResponse(res, "Withdrawal already processed", 400);

        const feeValSetting = await prisma.systemSettings.findUnique({ where: { key: 'MERCHANT_SERVICE_FEE' } });
        const feeTypeSetting = await prisma.systemSettings.findUnique({ where: { key: 'MERCHANT_SERVICE_FEE_TYPE' } });
        const percentFallbackSetting = await prisma.systemSettings.findUnique({ where: { key: 'PLATFORM_FEE_PERCENTAGE' } });
        const minCapSetting = await prisma.systemSettings.findUnique({ where: { key: 'MERCHANT_FEE_CAP_MIN' } });
        const maxCapSetting = await prisma.systemSettings.findUnique({ where: { key: 'MERCHANT_FEE_CAP_MAX' } });
        const amount = Number(withdrawal.amount) || 0;
        const feeVal = feeValSetting ? parseFloat(feeValSetting.value) || 0 : 0;
        const feeType = feeTypeSetting ? String(feeTypeSetting.value) : undefined;
        let feeAmount = 0;
        if (feeType === 'PERCENT') {
            feeAmount = (amount * feeVal) / 100;
        } else if (feeType === 'FLAT') {
            feeAmount = feeVal;
        } else {
            const feePercent = percentFallbackSetting ? parseFloat(percentFallbackSetting.value) || 0 : 0;
            feeAmount = (amount * feePercent) / 100;
        }
        const minCap = minCapSetting ? parseFloat(minCapSetting.value) : undefined;
        const maxCap = maxCapSetting ? parseFloat(maxCapSetting.value) : undefined;
        if (minCap !== undefined && feeAmount < minCap) feeAmount = minCap;
        if (maxCap !== undefined && feeAmount > maxCap) feeAmount = maxCap;
        if (!Number.isFinite(feeAmount)) feeAmount = 0;
        const netAmount = amount - feeAmount;

        // 3. Log Platform Revenue if fee exists (skip if table not available)
        if (feeAmount > 0) {
            try {
                await prisma.platformRevenue.create({
                    data: {
                        amount: feeAmount,
                        source: 'WITHDRAWAL_FEE',
                        description: `Fee from Withdrawal #${withdrawal.id.substring(0, 8)}`,
                        referenceId: withdrawal.id
                    }
                });
            } catch (revenueErr) {
                // PlatformRevenue table may not exist yet, log and continue
                console.warn('PlatformRevenue log skipped:', revenueErr.message);
            }
        }

        const updated = await prisma.withdrawal.update({
            where: { id },
            data: {
                status: 'APPROVED',
                updatedAt: new Date(),
                fee: feeAmount,
                netAmount: netAmount
            }
        });

        return successResponse(res, updated, "Withdrawal Approved");
    } catch (error) {
        return errorResponse(res, "Failed to approve withdrawal", 500, error);
    }
};

// ... existing code ...

// [NEW] Get TopUps with filtering
const getTopUps = async (req, res) => {
    try {
        const { status } = req.query; // PENDING, APPROVED, REJECTED
        const whereClause = status ? { status } : {};

        const topups = await prisma.topUpRequest.findMany({
            where: whereClause,
            include: {
                store: {
                    select: {
                        name: true,
                        tenant: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return successResponse(res, topups);
    } catch (error) {
        return errorResponse(res, "Failed to fetch top-ups", 500, error);
    }
};

const getReferralPrograms = async (req, res) => {
    try {
        const codes = await prisma.referralCode.findMany({
            include: {
                tenant: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to a "program-like" structure for the frontend
        const programs = codes.map(c => ({
            id: c.id,
            name: c.tenant?.name ? `Referral ${c.tenant.name}` : `Code ${c.code}`,
            code: c.code,
            type: 'REFERRAL_CODE',
            status: 'ACTIVE',
            rewardL1: 0, // Will be calculated from rewards if needed
            createdAt: c.createdAt,
            tenantId: c.tenantId,
            tenantName: c.tenant?.name || 'Unknown'
        }));

        return successResponse(res, programs);
    } catch (error) {
        return errorResponse(res, "Failed to fetch referral programs", 500, error);
    }
};

const getReferrals = async (req, res) => {
    try {
        const { programId, referrerTenantId, refereeTenantId, status } = req.query;
        const where = {};
        if (programId) where.referralCodeId = programId;
        if (referrerTenantId) where.referrerId = referrerTenantId;
        if (refereeTenantId) where.refereeId = refereeTenantId;
        if (status) where.status = status;

        const referrals = await prisma.referral.findMany({
            where,
            include: {
                referralCode: true,
                referrer: { select: { id: true, name: true } },
                referee: { select: { id: true, name: true } },
                reward: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const mapped = referrals.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            status: r.status,
            program: {
                id: r.referralCode.id,
                name: `Code ${r.referralCode.code}`,
                code: r.referralCode.code
            },
            referrer: r.referrer ? { id: r.referrer.id, name: r.referrer.name } : null,
            referee: r.referee ? { id: r.referee.id, name: r.referee.name } : null,
            rewards: r.reward ? [{
                id: r.reward.id,
                level: 1,
                amount: r.reward.amount,
                currency: 'IDR',
                status: r.reward.status,
                releasedAt: r.reward.paidAt
            }] : []
        }));

        return successResponse(res, mapped);
    } catch (error) {
        return errorResponse(res, "Failed to fetch referrals", 500, error);
    }
};

const getReferralRewards = async (req, res) => {
    try {
        const { status, beneficiaryTenantId, programId } = req.query;
        const where = {};
        if (status) where.status = status;
        if (beneficiaryTenantId) where.tenantId = beneficiaryTenantId;
        if (programId) {
            where.referral = { referralCodeId: programId };
        }

        const rewards = await prisma.referralReward.findMany({
            where,
            include: {
                referral: {
                    include: {
                        referralCode: true,
                        referrer: { select: { id: true, name: true } },
                        referee: { select: { id: true, name: true } }
                    }
                },
                tenant: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mapped = rewards.map((rw) => ({
            id: rw.id,
            createdAt: rw.createdAt,
            level: 1,
            amount: rw.amount,
            currency: 'IDR',
            status: rw.status,
            holdUntil: null,
            releasedAt: rw.paidAt,
            referral: {
                id: rw.referral.id,
                status: rw.referral.status,
                program: {
                    id: rw.referral.referralCode.id,
                    name: `Code ${rw.referral.referralCode.code}`,
                    code: rw.referral.referralCode.code
                },
                referrer: rw.referral.referrer
                    ? { id: rw.referral.referrer.id, name: rw.referral.referrer.name }
                    : null,
                referee: rw.referral.referee
                    ? { id: rw.referral.referee.id, name: rw.referral.referee.name }
                    : null
            },
            beneficiary: rw.tenant
                ? { id: rw.tenant.id, name: rw.tenant.name }
                : null
        }));

        return successResponse(res, mapped);
    } catch (error) {
        return errorResponse(res, "Failed to fetch referral rewards", 500, error);
    }
};

// [NEW] Approve TopUp
const approveTopUp = async (req, res) => {
    try {
        const { id } = req.params;

        return await prisma.$transaction(async (tx) => {
            const topup = await tx.topUpRequest.findUnique({
                where: { id },
                include: { store: true } // [FIX] Include store to access tenantId
            });
            if (!topup) throw new Error("TopUp request not found");
            if (topup.status !== 'PENDING') throw new Error("TopUp already processed");

            // 1. Update Status
            const updated = await tx.topUpRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    updatedAt: new Date()
                }
            });

            // 2. Add Balance to Store
            await tx.store.update({
                where: { id: topup.storeId },
                data: {
                    balance: { increment: topup.amount }
                }
            });

            // 3. Create Cashflow Log
            await tx.cashflowLog.create({
                data: {
                    tenantId: topup.store.tenantId, // [FIX] Get from store relation
                    storeId: topup.storeId,
                    amount: topup.amount,
                    type: 'CASH_IN',
                    category: 'TOPUP', // [FIX] Enum matches schema (TOPUP)
                    description: `Top Up Approved #${topup.id.substring(0, 8)}`,
                    occurredAt: new Date()
                }
            });

            return updated;
        })
            .then(result => successResponse(res, result, "Top Up Approved"))
            .catch(err => errorResponse(res, err.message || "Failed to approve", 400));

    } catch (error) {
        return errorResponse(res, "Failed to approve top-up", 500, error);
    }
};

// [NEW] Reject TopUp
const rejectTopUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const updated = await prisma.topUpRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                updatedAt: new Date()
            }
        });

        // Optional: Notify user about rejection reason

        return successResponse(res, updated, "Top Up Rejected");
    } catch (error) {
        return errorResponse(res, "Failed to reject top-up", 500, error);
    }
};

// ... existing code ...

// [NEW] Announcement Management
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        successResponse(res, announcements);
    } catch (error) {
        errorResponse(res, "Failed to fetch announcements", 500);
    }
};

const createAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;
        const newAnnouncement = await prisma.announcement.create({
            data: { title, content, isActive: true }
        });
        successResponse(res, newAnnouncement, "Announcement created");
    } catch (error) {
        errorResponse(res, "Failed to create announcement", 500);
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.announcement.delete({ where: { id } });
        successResponse(res, null, "Announcement deleted");
    } catch (error) {
        errorResponse(res, "Failed to delete announcement", 500);
    }
};

// Reject Withdrawal
const rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        return await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error("Withdrawal not found");
            if (withdrawal.status !== 'PENDING') throw new Error("Withdrawal already processed");

            // 1. Update status
            const updated = await tx.withdrawal.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    updatedAt: new Date()
                    // possibly failedReason: reason (if schema allows, otherwise just audit or console)
                }
            });

            // 2. Refund Balance to Store
            await tx.store.update({
                where: { id: withdrawal.storeId },
                data: {
                    balance: { increment: withdrawal.amount }
                }
            });

            return updated;
        })
            .then(result => successResponse(res, result, "Withdrawal Rejected and Funds Returned"))
            .catch(err => errorResponse(res, err.message || "Failed to reject", 400));

    } catch (error) {
        return errorResponse(res, "System Error during rejection", 500, error);
    }
};

// Get Global Settings
const getSettings = async (req, res) => {
    try {
        const SENSITIVE_SETTING_KEYS = new Set(['DIGIFLAZZ_API_KEY', 'DIGIFLAZZ_WEBHOOK_SECRET']);
        const deriveAesKey = (secret) =>
            crypto.createHash('sha256').update(String(secret || '')).digest();

        const decryptIfNeeded = (value) => {
            const raw = (value || '').toString();
            if (!raw) return '';
            if (!raw.startsWith('enc:v1:')) return raw;

            try {
                const secret =
                    process.env.SETTINGS_ENCRYPTION_KEY ||
                    process.env.JWT_SECRET; // [FIX] Removed hardcoded fallback
                const key = deriveAesKey(secret);

                const packed = Buffer.from(raw.slice('enc:v1:'.length), 'base64');
                if (packed.length < 12 + 16) return '';

                const iv = packed.subarray(0, 12);
                const tag = packed.subarray(12, 28);
                const ciphertext = packed.subarray(28);

                const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
                decipher.setAuthTag(tag);
                const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
                return plaintext.toString('utf8');
            } catch {
                return '';
            }
        };

        const maskSecret = (secret) => {
            const s = (secret || '').toString();
            if (!s) return '';
            const tail = s.slice(-4);
            return `****${tail}`;
        };

        const settings = await prisma.systemSettings.findMany();
        const settingsMap = {};
        settings.forEach(s => {
            if (SENSITIVE_SETTING_KEYS.has(s.key)) {
                const isSet = Boolean(s.value && s.value.toString().trim());
                settingsMap[`${s.key}_IS_SET`] = isSet ? 'true' : 'false';
                settingsMap[s.key] = isSet ? maskSecret(decryptIfNeeded(s.value)) : '';
                return;
            }
            settingsMap[s.key] = s.value;
        });
        return successResponse(res, settingsMap);
    } catch (error) {
        return errorResponse(res, "Failed to fetch settings", 500, error);
    }
};

// Update Global Settings
const updateSettings = async (req, res) => {
    try {
        const { key, value, description } = req.body;
        const SENSITIVE_SETTING_KEYS = new Set(['DIGIFLAZZ_API_KEY', 'DIGIFLAZZ_WEBHOOK_SECRET']);
        const deriveAesKey = (secret) =>
            crypto.createHash('sha256').update(String(secret || '')).digest();

        const encryptIfNeeded = (k, v) => {
            if (!SENSITIVE_SETTING_KEYS.has(k)) return String(v ?? '');
            const incoming = String(v ?? '');
            if (!incoming.trim() || incoming.includes('*')) return null;

            const secret =
                process.env.SETTINGS_ENCRYPTION_KEY ||
                process.env.JWT_SECRET; // [FIX] Removed hardcoded fallback
            const aesKey = deriveAesKey(secret);
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
            const ciphertext = Buffer.concat([cipher.update(incoming, 'utf8'), cipher.final()]);
            const tag = cipher.getAuthTag();
            const packed = Buffer.concat([iv, tag, ciphertext]);
            return `enc:v1:${packed.toString('base64')}`;
        };

        const valueToStore = encryptIfNeeded(key, value);
        if (valueToStore === null) {
            // Value is being unset or is a placeholder, so we don't update
            const existing = await prisma.systemSettings.findUnique({ where: { key } });
            return successResponse(res, existing, "Setting unchanged");
        }

        const updatedSetting = await prisma.systemSettings.upsert({
            where: { key },
            update: { value: valueToStore, description },
            create: { key, value: valueToStore, description }
        });

        return successResponse(res, updatedSetting, "Setting updated");
    } catch (error) {
        return errorResponse(res, "Failed to update setting", 500, error);
    }
};

const getMessages = async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        return successResponse(res, messages);
    } catch (error) {
        return errorResponse(res, 'Gagal mengambil pesan', 500, error);
    }
};

module.exports = {
    getWithdrawals,
    approveWithdrawal,
    getTopUps,
    approveTopUp,
    rejectTopUp,
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    rejectWithdrawal,
    getSettings,
    updateSettings,
    getReferralPrograms,
    getReferrals,
    getReferralRewards,
    getMessages,
    // New placeholders
    getDashboardStats: async (req, res) => {
        try {
            const totalStores = await prisma.store.count();
            const pendingWithdrawals = await prisma.withdrawal.count({
                where: { status: 'PENDING' }
            });

            const payoutsAgg = await prisma.withdrawal.aggregate({
                where: { status: 'APPROVED' },
                _sum: { amount: true }
            });
            const totalPayouts = payoutsAgg._sum.amount || 0;

            const recentWithdrawals = await prisma.withdrawal.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    store: {
                        select: { name: true }
                    }
                }
            });

            return successResponse(res, {
                totalStores,
                totalPayouts,
                pendingWithdrawals,
                recentWithdrawals
            });
        } catch (error) {
            return errorResponse(res, "Failed to get dashboard stats", 500, error);
        }
    },

    getDashboardChart: async (req, res) => {
        try {
            // Last 7 days sales chart
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);

            const sales = await prisma.dailySalesSummary.groupBy({
                by: ['date'],
                where: {
                    date: {
                        gte: startDate
                    }
                },
                _sum: {
                    totalSales: true
                }
            });

            // Fill missing days
            const chartData = [];
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
                const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });

                const found = sales.find(s => s.date.toISOString().split('T')[0] === dateStr);
                chartData.push({
                    name: dayName,
                    value: found ? (found._sum.totalSales || 0) : 0,
                    date: dateStr
                });
            }

            return successResponse(res, chartData);
        } catch (error) {
            return errorResponse(res, "Failed to get dashboard chart", 500, error);
        }
    },

    getAllTransactions: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                storeId,
                startDate,
                endDate,
                area,
                category,
                paymentStatus,
                paymentMethod
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            const where = {};

            if (storeId) {
                where.storeId = storeId;
            }

            if (startDate || endDate) {
                where.occurredAt = {};
                if (startDate) where.occurredAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    where.occurredAt.lte = end;
                }
            }

            if (paymentStatus) where.paymentStatus = paymentStatus;
            if (paymentMethod) where.paymentMethod = paymentMethod;

            if (search || area || category) {
                const storeWhere = {};
                if (area) storeWhere.location = { contains: area, mode: 'insensitive' };
                if (category) storeWhere.category = category;
                
                if (search) {
                    // When search is combined with area/category, use AND to combine them
                    const searchConditions = [
                        { id: { contains: search, mode: 'insensitive' } },
                        { store: { name: { contains: search, mode: 'insensitive' } } }
                    ];
                    
                    if (Object.keys(storeWhere).length > 0) {
                        where.AND = [
                            { store: storeWhere },
                            { OR: searchConditions }
                        ];
                    } else {
                        where.OR = searchConditions;
                    }
                } else if (Object.keys(storeWhere).length > 0) {
                    where.store = storeWhere;
                }
            }

            const [transactions, total] = await prisma.$transaction([
                prisma.transaction.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        store: {
                            select: {
                                name: true,
                                location: true,
                                category: true
                            }
                        },
                        tenant: {
                            select: {
                                name: true
                            }
                        },
                        cashier: {
                            select: {
                                name: true
                            }
                        },
                        transactionItems: {
                            select: {
                                quantity: true,
                                price: true,
                                productName: true,
                                productSku: true,
                                productImage: true,
                                basePrice: true,
                                product: {
                                    select: {
                                        name: true,
                                        sku: true,
                                        imageUrl: true,
                                        basePrice: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.transaction.count({ where })
            ]);

            return successResponse(res, {
                transactions,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / take)
            });
        } catch (error) {
            return errorResponse(res, "Failed to get transactions", 500, error);
        }
    },
    getBusinessAnalytics: async (req, res) => {
        try {
            const { months = 6, city, category } = req.query;

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - parseInt(months));
            startDate.setHours(0, 0, 0, 0);

            // Build store filter if city or category is specified
            const storeWhere = {};
            if (city) storeWhere.location = { contains: city, mode: 'insensitive' };
            if (category) storeWhere.category = category;

            // Get filtered store IDs if filters applied
            let storeIds = null;
            if (city || category) {
                const filteredStores = await prisma.store.findMany({
                    where: storeWhere,
                    select: { id: true }
                });
                storeIds = filteredStores.map(s => s.id);
            }

            const txnWhere = {
                paymentStatus: 'PAID',
                occurredAt: { gte: startDate, lte: endDate }
            };
            if (storeIds) txnWhere.storeId = { in: storeIds };

            // 1. Revenue calculation from real data sources
            // Subscription Revenue = sum of approved subscription package prices
            const approvedSubs = await prisma.subscriptionRequest.findMany({
                where: { status: 'APPROVED', createdAt: { gte: startDate, lte: endDate } },
                include: { package: { select: { price: true } } }
            });
            const totalSubscriptionRevenue = approvedSubs.reduce((sum, s) => sum + (s.package?.price || 0), 0);

            // Withdrawal Fees = sum of fees from approved withdrawals
            const wdFeesAgg = await prisma.withdrawal.aggregate({
                where: { status: 'APPROVED', createdAt: { gte: startDate, lte: endDate } },
                _sum: { fee: true }
            });
            const totalTxnFees = wdFeesAgg._sum.fee || 0;

            // Total platform revenue
            const totalRevenue = totalSubscriptionRevenue + totalTxnFees;
            const totalWholesaleFees = 0;

            // 2. Tenant Statistics
            const totalTenants = await prisma.tenant.count();
            const activeSubscribers = await prisma.tenant.count({
                where: { subscriptionStatus: 'ACTIVE' }
            });
            const cancelledTenants = await prisma.tenant.count({
                where: { subscriptionStatus: 'CANCELLED' }
            });

            // Churn Rate
            const churnRate = totalTenants > 0 ? ((cancelledTenants / totalTenants) * 100).toFixed(1) : 0;

            // ARPU (Average Revenue Per User)
            const arpu = activeSubscribers > 0 ? totalRevenue / activeSubscribers : 0;

            // 3. Revenue by Source (for pie chart)
            const revenueBySource = [];
            if (totalSubscriptionRevenue > 0) {
                revenueBySource.push({ source: 'SUBSCRIPTION', _sum: { amount: totalSubscriptionRevenue } });
            }
            if (totalTxnFees > 0) {
                revenueBySource.push({ source: 'WITHDRAWAL_FEE', _sum: { amount: totalTxnFees } });
            }

            // 4. Transaction breakdown by payment method
            const txnByMethodRaw = await prisma.transaction.groupBy({
                by: ['paymentMethod'],
                where: txnWhere,
                _count: { _all: true },
                _sum: { totalAmount: true }
            });
            const txnByMethod = txnByMethodRaw.map(t => ({
                paymentMethod: t.paymentMethod,
                count: t._count._all,
                amount: t._sum.totalAmount || 0
            }));

                        // 5. Transaction breakdown by source (Disabled due to missing field)
            const txnBySource = [];

            // 6. Top Merchants by transaction volume
            const topMerchantsRaw = await prisma.transaction.groupBy({
                by: ['storeId'],
                where: txnWhere,
                _sum: { totalAmount: true },
                orderBy: { _sum: { totalAmount: 'desc' } },
                take: 10
            });

            const storeIdsForTop = topMerchantsRaw.map(t => t.storeId);
            const topStores = await prisma.store.findMany({
                where: { id: { in: storeIdsForTop } },
                include: { tenant: { select: { name: true } } }
            });
            const storeMap = new Map(topStores.map(s => [s.id, s]));

            const topMerchants = topMerchantsRaw.map(t => {
                const store = storeMap.get(t.storeId);
                return {
                    name: store?.name || 'Unknown',
                    tenantName: store?.tenant?.name || 'Unknown',
                    volume: t._sum.totalAmount || 0
                };
            });

            // 7. Revenue Chart (monthly trend)
            const revenueChart = [];
            for (let i = parseInt(months) - 1; i >= 0; i--) {
                const monthStart = new Date();
                monthStart.setMonth(monthStart.getMonth() - i);
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);

                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                monthEnd.setDate(0);
                monthEnd.setHours(23, 59, 59, 999);

                // Monthly subscription revenue
                const monthSubs = await prisma.subscriptionRequest.findMany({
                    where: { status: 'APPROVED', createdAt: { gte: monthStart, lte: monthEnd } },
                    include: { package: { select: { price: true } } }
                });
                const monthSubRevenue = monthSubs.reduce((sum, s) => sum + (s.package?.price || 0), 0);

                // Monthly withdrawal fees
                const monthFees = await prisma.withdrawal.aggregate({
                    where: { status: 'APPROVED', createdAt: { gte: monthStart, lte: monthEnd } },
                    _sum: { fee: true }
                });

                revenueChart.push({
                    name: monthStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                    revenue: monthSubRevenue + (monthFees._sum.fee || 0)
                });
            }

            // 8. Growth Chart (new merchants per month)
            const growthChart = [];
            for (let i = parseInt(months) - 1; i >= 0; i--) {
                const monthStart = new Date();
                monthStart.setMonth(monthStart.getMonth() - i);
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);

                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                monthEnd.setDate(0);
                monthEnd.setHours(23, 59, 59, 999);

                const newMerchants = await prisma.store.count({
                    where: { createdAt: { gte: monthStart, lte: monthEnd } }
                });

                growthChart.push({
                    name: monthStart.toLocaleDateString('id-ID', { month: 'short' }),
                    count: newMerchants
                });
            }

            // 9. Merchants by Location
            const merchantByLocationRaw = await prisma.store.groupBy({
                by: ['location'],
                _count: { _all: true },
                orderBy: { _count: { location: 'desc' } },
                take: 10
            });
            const merchantByLocation = merchantByLocationRaw
                .filter(m => m.location)
                .map(m => ({
                    name: m.location,
                    count: m._count._all
                }));

            // 10. Merchants by Category
            const merchantByCategory = await prisma.store.groupBy({
                by: ['category'],
                _count: { _all: true }
            });
            const formattedMerchantByCategory = merchantByCategory
                .filter(m => m.category)
                .map(m => ({
                    category: m.category,
                    count: m._count._all
                }));

            // 11. Tenants by Plan
            const tenantByPlan = await prisma.tenant.groupBy({
                by: ['plan'],
                _count: { _all: true }
            });
            const formattedTenantByPlan = tenantByPlan.map(t => ({
                plan: t.plan,
                count: t._count._all
            }));

            return successResponse(res, {
                rangeStart: startDate.toISOString(),
                rangeEnd: endDate.toISOString(),
                totalRevenue,
                totalSubscriptionRevenue,
                totalTxnFees,
                totalWholesaleFees,
                totalTenants,
                activeSubscribers,
                cancelledTenants,
                churnRate: parseFloat(churnRate),
                arpu,
                revenueBySource,
                txnByMethod,
                txnBySource,
                topMerchants,
                revenueChart,
                growthChart,
                merchantByLocation,
                merchantByCategory: formattedMerchantByCategory,
                tenantByPlan: formattedTenantByPlan
            });
        } catch (error) {
            console.error('getBusinessAnalytics error:', error);
            return errorResponse(res, "Failed to fetch business analytics", 500, error);
        }
    },
    getPackages: async (req, res) => {
        try {
            const packages = await prisma.subscriptionPackage.findMany({
                where: { isActive: true },
                orderBy: { price: 'asc' }
            });
            return successResponse(res, packages);
        } catch (error) {
            console.error('getPackages error:', error);
            return errorResponse(res, "Failed to fetch packages", 500, error);
        }
    },
    createPackage: async (req, res) => {
        try {
            const { name, price, durationDays, description } = req.body;
            const newPackage = await prisma.subscriptionPackage.create({
                data: { name, price, durationDays, description }
            });
            return successResponse(res, newPackage, "Package created");
        } catch (error) {
            return errorResponse(res, "Failed to create package", 500, error);
        }
    },
    updatePackage: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, price, durationDays, description, isActive } = req.body;
            const updated = await prisma.subscriptionPackage.update({
                where: { id },
                data: { name, price, durationDays, description, isActive }
            });
            return successResponse(res, updated, "Package updated");
        } catch (error) {
            return errorResponse(res, "Failed to update package", 500, error);
        }
    },
    deletePackage: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.subscriptionPackage.update({
                where: { id },
                data: { isActive: false }
            });
            return successResponse(res, null, "Package deleted");
        } catch (error) {
            return errorResponse(res, "Failed to delete package", 500, error);
        }
    },
    getMerchants: async (req, res) => {
        try {
            const { status, search, plan, city, createdFrom, createdTo, sort } = req.query;

            const where = {};

            // Filter by subscription status
            if (status) {
                where.tenant = { subscriptionStatus: status };
            }

            // Filter by plan
            if (plan) {
                where.tenant = { ...where.tenant, plan: plan };
            }

            // Filter by city/location
            if (city) {
                where.location = { contains: city, mode: 'insensitive' };
            }

            // Filter by date range
            if (createdFrom || createdTo) {
                where.createdAt = {};
                if (createdFrom) where.createdAt.gte = new Date(createdFrom);
                if (createdTo) where.createdAt.lte = new Date(createdTo);
            }

            // Search by name, email, or tenant name
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { tenant: { name: { contains: search, mode: 'insensitive' } } },
                    { tenant: { email: { contains: search, mode: 'insensitive' } } }
                ];
            }

            // Parse sort parameter
            let orderBy = { createdAt: 'desc' };
            if (sort) {
                const [field, direction] = sort.split(':');
                if (field && direction) {
                    orderBy = { [field]: direction };
                }
            }

            const stores = await prisma.store.findMany({
                where,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            plan: true,
                            subscriptionStatus: true,
                            subscriptionEndsAt: true,
                            trialEndsAt: true
                        }
                    },
                    users: {
                        where: { role: 'OWNER' },
                        select: { email: true },
                        take: 1
                    }
                },
                orderBy
            });

            // Add address field from location and email from users
            const formattedStores = stores.map(store => ({
                ...store,
                address: store.location || null,
                tenant: store.tenant ? {
                    ...store.tenant,
                    email: store.users?.[0]?.email || null
                } : null,
                users: undefined // Remove users from response
            }));

            return successResponse(res, formattedStores);
        } catch (error) {
            console.error('getMerchants error:', error);
            return errorResponse(res, "Failed to fetch merchants", 500, error);
        }
    },
    createMerchant: async (req, res) => {
        try {
            const { ownerName, businessName, email, password, phone, address } = req.body;

            if (!email || !password || !businessName) {
                return errorResponse(res, "Email, password, and business name are required", 400);
            }

            // Check if email already exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return errorResponse(res, "Email already in use", 400);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Create tenant, store, and user in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create Tenant
                const tenant = await tx.tenant.create({
                    data: {
                        name: ownerName || businessName,
                        plan: 'FREE',
                        subscriptionStatus: 'TRIAL',
                        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
                    }
                });

                // Create Store
                const store = await tx.store.create({
                    data: {
                        tenantId: tenant.id,
                        name: businessName,
                        location: address,
                        waNumber: phone
                    }
                });

                // Create User (Owner)
                const user = await tx.user.create({
                    data: {
                        tenantId: tenant.id,
                        storeId: store.id,
                        name: ownerName || businessName,
                        email,
                        passwordHash: hashedPassword,
                        role: 'OWNER'
                    }
                });

                return { tenant, store, user };
            });

            return successResponse(res, result, "Merchant created successfully");
        } catch (error) {
            console.error('createMerchant error:', error);
            return errorResponse(res, "Failed to create merchant", 500, error);
        }
    },
    deleteMerchant: async (req, res) => {
        try {
            const { id } = req.params;

            // Find the store
            const store = await prisma.store.findUnique({
                where: { id },
                include: { tenant: true }
            });

            if (!store) {
                return errorResponse(res, "Merchant not found", 404);
            }

            // Soft delete by updating subscription status
            await prisma.tenant.update({
                where: { id: store.tenantId },
                data: { subscriptionStatus: 'CANCELLED' }
            });

            // Deactivate store
            await prisma.store.update({
                where: { id },
                data: { isActive: false }
            });

            return successResponse(res, null, "Merchant deactivated successfully");
        } catch (error) {
            console.error('deleteMerchant error:', error);
            return errorResponse(res, "Failed to delete merchant", 500, error);
        }
    },
    updateMerchantSubscription: async (req, res) => {
        try {
            const { tenantId } = req.params;
            const { subscriptionStatus, subscriptionEndsAt, plan } = req.body;

            const updateData = {};
            if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
            if (subscriptionEndsAt) updateData.subscriptionEndsAt = new Date(subscriptionEndsAt);
            if (plan) updateData.plan = plan;

            const updatedTenant = await prisma.tenant.update({
                where: { id: tenantId },
                data: updateData
            });

            return successResponse(res, updatedTenant, "Subscription updated");
        } catch (error) {
            console.error('updateMerchantSubscription error:', error);
            return errorResponse(res, "Failed to update subscription", 500, error);
        }
    },
    updateMerchant: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, location, category, waNumber } = req.body;

            const updatedStore = await prisma.store.update({
                where: { id },
                data: {
                    name: name || undefined,
                    location: location || undefined,
                    category: category || undefined,
                    waNumber: waNumber || undefined
                }
            });

            return successResponse(res, updatedStore, "Merchant updated");
        } catch (error) {
            console.error('updateMerchant error:', error);
            return errorResponse(res, "Failed to update merchant", 500, error);
        }
    },
    getMerchantDetail: async (req, res) => {
        try {
            const { id } = req.params;

            const store = await prisma.store.findUnique({
                where: { id },
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            plan: true,
                            subscriptionStatus: true,
                            subscriptionEndsAt: true,
                            trialEndsAt: true
                        }
                    },
                    users: {
                        where: { role: 'OWNER' },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        },
                        take: 1
                    },
                    products: {
                        take: 10,
                        orderBy: { createdAt: 'desc' }
                    },
                    transactions: {
                        take: 10,
                        orderBy: { occurredAt: 'desc' },
                        select: {
                            id: true,
                            totalAmount: true,
                            paymentStatus: true,
                            occurredAt: true
                        }
                    }
                }
            });

            if (!store) {
                return errorResponse(res, "Merchant not found", 404);
            }

            // Add owner email to tenant for consistency with list view
            const ownerUser = store.users?.[0];
            const formattedStore = {
                ...store,
                tenant: {
                    ...store.tenant,
                    email: ownerUser?.email || null
                }
            };

            return successResponse(res, formattedStore);
        } catch (error) {
            console.error('getMerchantDetail error:', error);
            return errorResponse(res, "Failed to fetch merchant detail", 500, error);
        }
    },
    adjustMerchantWallet: async (req, res) => {
        try {
            const { storeId } = req.params;
            const { amount, type, description } = req.body; // type: 'add' or 'deduct'

            if (!amount || !type) {
                return errorResponse(res, "Amount and type are required", 400);
            }

            const store = await prisma.store.findUnique({ where: { id: storeId } });
            if (!store) return errorResponse(res, "Store not found", 404);

            const adjustAmount = type === 'add' ? Math.abs(amount) : -Math.abs(amount);

            const updated = await prisma.store.update({
                where: { id: storeId },
                data: { balance: { increment: adjustAmount } }
            });

            // Log the adjustment
            await prisma.cashflowLog.create({
                data: {
                    tenantId: store.tenantId,
                    storeId: storeId,
                    amount: Math.abs(amount),
                    type: type === 'add' ? 'CASH_IN' : 'CASH_OUT',
                    category: 'OTHER',
                    description: description || `Admin wallet adjustment: ${type} Rp ${amount}`,
                    occurredAt: new Date()
                }
            });

            return successResponse(res, updated, "Wallet adjusted successfully");
        } catch (error) {
            console.error('adjustMerchantWallet error:', error);
            return errorResponse(res, "Failed to adjust wallet", 500, error);
        }
    },
    getSubscriptionStats: async (req, res) => {
        try {
            const pending = await prisma.subscriptionRequest.count({
                where: { status: 'PENDING' }
            });
            return successResponse(res, { pending });
        } catch (error) {
            console.error('getSubscriptionStats error:', error);
            return errorResponse(res, "Failed to fetch subscription stats", 500, error);
        }
    },
    sendNotification: async (req, res) => {
        try {
            const { tenantId, title, body } = req.body;

            if (!tenantId || !title || !body) {
                return errorResponse(res, "tenantId, title, and body are required", 400);
            }

            const notification = await prisma.notification.create({
                data: { tenantId, title, body, isRead: false }
            });

            // Emit via socket if available
            try {
                emitPublic('notification', { tenantId, notification });
            } catch (e) { /* ignore socket errors */ }

            return successResponse(res, notification, "Notification sent");
        } catch (error) {
            console.error('sendNotification error:', error);
            return errorResponse(res, "Failed to send notification", 500, error);
        }
    },
    exportMerchants: async (req, res) => {
        try {
            const { status, plan, city, createdFrom, createdTo, format = 'csv' } = req.query;

            const where = {};
            if (status) where.tenant = { subscriptionStatus: status };
            if (plan) where.tenant = { ...where.tenant, plan: plan };
            if (city) where.location = { contains: city, mode: 'insensitive' };
            if (createdFrom || createdTo) {
                where.createdAt = {};
                if (createdFrom) where.createdAt.gte = new Date(createdFrom);
                if (createdTo) where.createdAt.lte = new Date(createdTo);
            }

            const stores = await prisma.store.findMany({
                where,
                include: {
                    tenant: { select: { id: true, name: true, plan: true, subscriptionStatus: true } },
                    users: { where: { role: 'OWNER' }, select: { email: true }, take: 1 }
                },
                orderBy: { createdAt: 'desc' }
            });

            const exportData = stores.map(s => ({
                id: s.id,
                storeName: s.name,
                ownerName: s.tenant?.name || '',
                email: s.users?.[0]?.email || '',
                location: s.location || '',
                plan: s.tenant?.plan || '',
                status: s.tenant?.subscriptionStatus || '',
                balance: s.balance,
                createdAt: s.createdAt
            }));

            return successResponse(res, exportData);
        } catch (error) {
            console.error('exportMerchants error:', error);
            return errorResponse(res, "Failed to export merchants", 500, error);
        }
    },
    getMerchantProducts: async (req, res) => {
        try {
            const { storeId } = req.params;
            const { search, categoryId, limit = 50 } = req.query;

            const where = { storeId };
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (categoryId) where.categoryId = categoryId;

            const products = await prisma.product.findMany({
                where,
                include: { category: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit)
            });

            return successResponse(res, products);
        } catch (error) {
            console.error('getMerchantProducts error:', error);
            return errorResponse(res, "Failed to fetch products", 500, error);
        }
    },
    createMerchantProduct: async (req, res) => {
        try {
            const { storeId } = req.params;
            const { name, sku, basePrice, sellingPrice, stock, categoryId, description, imageUrl } = req.body;

            const store = await prisma.store.findUnique({ where: { id: storeId } });
            if (!store) return errorResponse(res, "Store not found", 404);

            const product = await prisma.product.create({
                data: {
                    tenantId: store.tenantId,
                    storeId,
                    name,
                    sku,
                    basePrice: basePrice || 0,
                    sellingPrice: sellingPrice || 0,
                    stock: stock || 0,
                    categoryId,
                    description,
                    imageUrl
                }
            });

            return successResponse(res, product, "Product created");
        } catch (error) {
            console.error('createMerchantProduct error:', error);
            return errorResponse(res, "Failed to create product", 500, error);
        }
    },
    updateMerchantProduct: async (req, res) => {
        try {
            const { productId } = req.params;
            const { name, sku, basePrice, sellingPrice, stock, categoryId, description, imageUrl, isActive } = req.body;

            const product = await prisma.product.update({
                where: { id: productId },
                data: {
                    name: name || undefined,
                    sku: sku || undefined,
                    basePrice: basePrice !== undefined ? basePrice : undefined,
                    sellingPrice: sellingPrice !== undefined ? sellingPrice : undefined,
                    stock: stock !== undefined ? stock : undefined,
                    categoryId: categoryId || undefined,
                    description: description || undefined,
                    imageUrl: imageUrl || undefined,
                    isActive: isActive !== undefined ? isActive : undefined
                }
            });

            return successResponse(res, product, "Product updated");
        } catch (error) {
            console.error('updateMerchantProduct error:', error);
            return errorResponse(res, "Failed to update product", 500, error);
        }
    },
    deleteMerchantProduct: async (req, res) => {
        try {
            const { productId } = req.params;

            // Soft delete
            await prisma.product.update({
                where: { id: productId },
                data: { isActive: false }
            });

            return successResponse(res, null, "Product deleted");
        } catch (error) {
            console.error('deleteMerchantProduct error:', error);
            return errorResponse(res, "Failed to delete product", 500, error);
        }
    },
    getSubscriptionRequests: async (req, res) => {
        try {
            const { status } = req.query;

            const where = {};
            if (status) {
                where.status = status;
            }

            const requests = await prisma.subscriptionRequest.findMany({
                where,
                include: {
                    tenant: {
                        include: {
                            users: {
                                where: { role: 'OWNER' },
                                select: { email: true },
                                take: 1
                            }
                        }
                    },
                    package: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return successResponse(res, requests);
        } catch (error) {
            console.error('getSubscriptionRequests error:', error);
            return errorResponse(res, "Failed to fetch subscription requests", 500, error);
        }
    },
    approveSubscriptionRequest: async (req, res) => {
        try {
            const { id } = req.params;

            const request = await prisma.subscriptionRequest.update({
                where: { id },
                data: { status: 'APPROVED' },
                include: {
                    tenant: true,
                    package: true
                }
            });

            const durationDays = request.package?.durationDays || 30;
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + durationDays);

            await prisma.tenant.update({
                where: { id: request.tenantId },
                data: {
                    subscriptionStatus: 'ACTIVE',
                    plan: 'PREMIUM',
                    subscriptionEndsAt
                }
            });

            if (request.package) {
                try {
                    await prisma.platformRevenue.create({
                        data: {
                            amount: request.package.price,
                            source: 'SUBSCRIPTION',
                            description: `Subscription: ${request.package.name} - ${request.tenant.name}`,
                            referenceId: request.id
                        }
                    });
                } catch (revenueErr) {
                    console.warn('PlatformRevenue log skipped:', revenueErr.message);
                }
            }

            try {
                await prisma.notification.create({
                    data: {
                        tenantId: request.tenantId,
                        title: 'Subscription Approved',
                        body: `Paket ${request.package?.name || 'Premium'} kamu sudah aktif sampai ${subscriptionEndsAt.toLocaleDateString('id-ID')}.`
                    }
                });
            } catch (e) { }

            return successResponse(res, {
                packageName: request.package?.name,
                durationDays,
                subscriptionEndsAt
            }, "Subscription request approved");
        } catch (error) {
            console.error('approveSubscriptionRequest error:', error);
            return errorResponse(res, "Failed to approve subscription request", 500, error);
        }
    },
    rejectSubscriptionRequest: async (req, res) => {
        try {
            const { id } = req.params;

            const request = await prisma.subscriptionRequest.update({
                where: { id },
                data: { status: 'REJECTED' }
            });

            try {
                await prisma.notification.create({
                    data: {
                        tenantId: request.tenantId,
                        title: 'Subscription Rejected',
                        body: 'Permintaan langganan kamu ditolak. Silakan cek bukti pembayaran atau hubungi support.'
                    }
                });
            } catch (e) { }

            return successResponse(res, request, "Subscription request rejected");
        } catch (error) {
            console.error('rejectSubscriptionRequest error:', error);
            return errorResponse(res, "Failed to reject subscription request", 500, error);
        }
    },
    exportWithdrawals: async (req, res) => {
        try {
            const { status, from, to } = req.query;
            const where = {};
            if (status) where.status = status;
            if (from || to) {
                where.createdAt = {};
                if (from) where.createdAt.gte = new Date(from);
                if (to) where.createdAt.lte = new Date(to);
            }

            const withdrawals = await prisma.withdrawal.findMany({
                where,
                include: {
                    store: {
                        select: {
                            name: true,
                            tenant: {
                                select: { name: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });

            return successResponse(res, withdrawals);
        } catch (error) {
            console.error("exportWithdrawals error:", error);
            return errorResponse(res, "Failed to export withdrawals", 500, error);
        }
    },
    getAppMenus: async (req, res) => {
        try {
            const menus = await prisma.appMenu.findMany({
                orderBy: { order: "asc" }
            });
            return successResponse(res, menus);
        } catch (error) {
            console.error("getAppMenus error:", error);
            return errorResponse(res, "Failed to fetch app menus", 500, error);
        }
    },
    createAppMenu: async (req, res) => {
        try {
            const { key, label, icon, route, order, isActive } = req.body;

            const maxOrder = await prisma.appMenu.aggregate({
                _max: { order: true }
            });
            const nextOrder =
                typeof order === "number" && !Number.isNaN(order)
                    ? order
                    : (maxOrder._max.order || 0) + 1;

            const menu = await prisma.appMenu.create({
                data: {
                    key,
                    label,
                    icon,
                    route,
                    order: nextOrder,
                    isActive: isActive !== undefined ? !!isActive : true
                }
            });
            return successResponse(res, menu, "App menu created");
        } catch (error) {
            console.error("createAppMenu error:", error);
            if (error.code === "P2002") {
                return errorResponse(res, "Menu key must be unique", 400, error);
            }
            return errorResponse(res, "Failed to create app menu", 500, error);
        }
    },
    updateAppMenu: async (req, res) => {
        try {
            const { id } = req.params;
            const { key, label, icon, route, order, isActive } = req.body;

            const data = {};
            if (key !== undefined) data.key = key;
            if (label !== undefined) data.label = label;
            if (icon !== undefined) data.icon = icon;
            if (route !== undefined) data.route = route;
            if (order !== undefined) data.order = order;
            if (isActive !== undefined) data.isActive = !!isActive;

            const updated = await prisma.appMenu.update({
                where: { id },
                data
            });
            return successResponse(res, updated, "App menu updated");
        } catch (error) {
            console.error("updateAppMenu error:", error);
            return errorResponse(res, "Failed to update app menu", 500, error);
        }
    },
    deleteAppMenu: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.appMenu.delete({ where: { id } });
            return successResponse(res, null, "App menu deleted");
        } catch (error) {
            console.error("deleteAppMenu error:", error);
            return errorResponse(res, "Failed to delete app menu", 500, error);
        }
    },
    getAppMenuMaintenance: async (req, res) => {
        try {
            const settings = await prisma.systemSettings.findMany({
                where: { key: { startsWith: "MAINTENANCE_MENU_" } }
            });
            const map = {};
            for (const s of settings) {
                const k = s.key.replace("MAINTENANCE_MENU_", "");
                try {
                    map[k] = JSON.parse(s.value);
                } catch {
                    map[k] = { active: false };
                }
            }
            return successResponse(res, map);
        } catch (error) {
            console.error("getAppMenuMaintenance error:", error);
            return errorResponse(res, "Failed to fetch maintenance config", 500, error);
        }
    },
    updateAppMenuMaintenance: async (req, res) => {
        try {
            const { id } = req.params;
            const { active, message, until } = req.body;

            const menu = await prisma.appMenu.findUnique({ where: { id } });
            if (!menu) {
                return errorResponse(res, "Menu not found", 404);
            }

            const key = `MAINTENANCE_MENU_${menu.key}`;
            const value = JSON.stringify({
                active: !!active,
                message: message || "",
                until: until || null
            });

            const existing = await prisma.systemSettings.findUnique({ where: { key } });
            if (existing) {
                await prisma.systemSettings.update({
                    where: { key },
                    data: { value }
                });
            } else {
                await prisma.systemSettings.create({
                    data: {
                        key,
                        value,
                        description: `Maintenance config for menu ${menu.key}`
                    }
                });
            }

            return successResponse(res, { key: menu.key, active: !!active, message: message || "", until: until || null }, "Maintenance updated");
        } catch (error) {
            console.error("updateAppMenuMaintenance error:", error);
            return errorResponse(res, "Failed to update maintenance", 500, error);
        }
    },
    resetUserPassword: async (req, res) => {
        try {
            const { id } = req.params;
            const { password } = req.body;
            if (!password || password.length < 6) {
                return errorResponse(res, "Password must be at least 6 characters", 400);
            }

            const hashed = await bcrypt.hash(password, 10);
            const updated = await prisma.user.update({
                where: { id },
                data: { passwordHash: hashed }
            });
            return successResponse(res, { id: updated.id }, "Password updated");
        } catch (error) {
            console.error("resetUserPassword error:", error);
            return errorResponse(res, "Failed to reset password", 500, error);
        }
    },
    getAdminUsers: async (req, res) => {
        try {
            const { search, role, page = 1, limit = 10 } = req.query;
            const where = {
                role: { in: ["SUPER_ADMIN", "ADMIN"] },
                storeId: null
            };

            if (role) {
                where.role = role;
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            const users = await prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" }
            });

            const data = users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt,
                isActive: u.isActive
            }));

            return successResponse(res, data);
        } catch (error) {
            console.error("getAdminUsers error:", error);
            return errorResponse(res, "Failed to fetch admin users", 500, error);
        }
    },
    createAdminUser: async (req, res) => {
        try {
            const { name, email, password, role = "ADMIN" } = req.body;
            if (!name || !email || !password) {
                return errorResponse(res, "Name, email and password are required", 400);
            }

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return errorResponse(res, "Email already in use", 400);
            }

            const hashed = await bcrypt.hash(password, 10);

            const platformTenant = await prisma.tenant.upsert({
                where: { id: "rana_admin_tenant" },
                update: {},
                create: {
                    id: "rana_admin_tenant",
                    name: "Rana Platform",
                    plan: "ENTERPRISE",
                    subscriptionStatus: "ACTIVE"
                }
            });

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    passwordHash: hashed,
                    role,
                    tenantId: platformTenant.id,
                    storeId: null,
                    isActive: true
                }
            });

            return successResponse(res, {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                isActive: user.isActive
            }, "Admin user created");
        } catch (error) {
            console.error("createAdminUser error:", error);
            return errorResponse(res, "Failed to create admin user", 500, error);
        }
    },
    deleteAdminUser: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await prisma.user.findUnique({ where: { id } });
            if (!user) {
                return errorResponse(res, "Admin user not found", 404);
            }
            if (user.role === "SUPER_ADMIN") {
                return errorResponse(res, "Cannot delete SUPER_ADMIN user", 400);
            }

            await prisma.user.delete({ where: { id } });
            return successResponse(res, null, "Admin user deleted");
        } catch (error) {
            console.error("deleteAdminUser error:", error);
            return errorResponse(res, "Failed to delete admin user", 500, error);
        }
    },
    updateAdminUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { role, isActive } = req.body;

            const data = {};
            if (role !== undefined) data.role = role;
            if (isActive !== undefined) data.isActive = !!isActive;

            const updated = await prisma.user.update({
                where: { id },
                data
            });

            return successResponse(res, {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                createdAt: updated.createdAt,
                isActive: updated.isActive
            }, "Admin user updated");
        } catch (error) {
            console.error("updateAdminUser error:", error);
            return errorResponse(res, "Failed to update admin user", 500, error);
        }
    },
    getPlatformSubscription: async (req, res) => {
        try {
            const plan = "ENTERPRISE";
            const status = "ACTIVE";
            const today = new Date();
            const next = new Date(today);
            next.setMonth(next.getMonth() + 1);

            return successResponse(res, {
                plan,
                status,
                features: [
                    "Unlimited merchants monitoring",
                    "Real-time transaction analytics",
                    "Priority support",
                    "Advanced reporting exports"
                ],
                nextBillingDate: next.toISOString().split("T")[0]
            });
        } catch (error) {
            console.error("getPlatformSubscription error:", error);
            return errorResponse(res, "Failed to fetch platform subscription", 500, error);
        }
    },
    exportDashboardData: async (req, res) => {
        try {
            const totalStores = await prisma.store.count();
            const pendingWithdrawals = await prisma.withdrawal.count({
                where: { status: "PENDING" }
            });
            const totalTenants = await prisma.tenant.count();
            const activeTenants = await prisma.tenant.count({
                where: { subscriptionStatus: "ACTIVE" }
            });
            const totalTransactions = await prisma.transaction.count();

            const payoutsAgg = await prisma.withdrawal.aggregate({
                where: { status: "APPROVED" },
                _sum: { amount: true }
            });
            const totalPayouts = payoutsAgg._sum.amount || 0;

            // Calculate platform revenue from subscriptions + withdrawal fees
            const allApprovedSubs = await prisma.subscriptionRequest.findMany({
                where: { status: 'APPROVED' },
                include: { package: { select: { price: true } } }
            });
            const allWdFees = await prisma.withdrawal.aggregate({
                where: { status: 'APPROVED' },
                _sum: { fee: true }
            });
            const totalPlatformRevenue = allApprovedSubs.reduce((sum, s) => sum + (s.package?.price || 0), 0) + (allWdFees._sum.fee || 0);

            const byPlan = await prisma.tenant.groupBy({
                by: ["plan"],
                _count: { _all: true }
            });

            const recentWithdrawals = await prisma.withdrawal.findMany({
                take: 10,
                orderBy: { createdAt: "desc" },
                include: {
                    store: {
                        select: {
                            name: true,
                            tenant: { select: { name: true } }
                        }
                    }
                }
            });

            return successResponse(res, {
                totals: {
                    totalStores,
                    totalTenants,
                    activeTenants,
                    totalTransactions,
                    totalPayouts,
                    totalPlatformRevenue,
                    pendingWithdrawals
                },
                tenantsByPlan: byPlan.map(p => ({
                    plan: p.plan,
                    count: p._count._all
                })),
                recentWithdrawals
            });
        } catch (error) {
            console.error("exportDashboardData error:", error);
            return errorResponse(res, "Failed to export dashboard data", 500, error);
        }
    },
    getAuditLogs: async (req, res) => {
        try {
            const { q, action, entity, user, from, to } = req.query;
            const where = {};

            if (action) where.action = action;
            if (entity) where.entity = { contains: entity, mode: 'insensitive' };
            if (user) {
                where.OR = [
                    { userId: { contains: user, mode: 'insensitive' } }
                ];
            }
            if (q) {
                where.OR = [
                    { action: { contains: q, mode: 'insensitive' } },
                    { entity: { contains: q, mode: 'insensitive' } },
                    { newValue: { contains: q, mode: 'insensitive' } }
                ];
            }
            if (from || to) {
                where.createdAt = {};
                if (from) where.createdAt.gte = new Date(from);
                if (to) where.createdAt.lte = new Date(to);
            }

            const logs = await prisma.auditLog.findMany({
                where,
                orderBy: { occurredAt: 'desc' },
                take: 500
            });
            return successResponse(res, logs);
        } catch (error) {
            console.error('getAuditLogs error:', error);
            return errorResponse(res, "Failed to fetch audit logs", 500, error);
        }
    },
    globalSearch: async (req, res) => {
        try {
            const { q } = req.query;
            if (!q || String(q).trim().length < 2) {
                return successResponse(res, { merchants: [], users: [], products: [] });
            }
            const term = String(q).trim();

            const [merchants, users, products] = await Promise.all([
                prisma.store.findMany({
                    where: {
                        OR: [
                            { name: { contains: term, mode: "insensitive" } },
                            { tenant: { name: { contains: term, mode: "insensitive" } } }
                        ]
                    },
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    include: {
                        tenant: {
                            select: { name: true, plan: true }
                        }
                    }
                }),
                prisma.user.findMany({
                    where: {
                        role: { in: ["SUPER_ADMIN", "ADMIN"] },
                        OR: [
                            { name: { contains: term, mode: "insensitive" } },
                            { email: { contains: term, mode: "insensitive" } }
                        ]
                    },
                    take: 10,
                    orderBy: { createdAt: "desc" }
                }),
                prisma.product.findMany({
                    where: {
                        name: { contains: term, mode: "insensitive" }
                    },
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        name: true,
                        sellingPrice: true
                    }
                })
            ]);

            const mapped = {
                merchants: merchants.map(m => ({
                    id: m.id,
                    name: m.name,
                    plan: m.tenant?.plan || "",
                    tenantName: m.tenant?.name || ""
                })),
                users: users.map(u => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    email: u.email
                })),
                products
            };

            return successResponse(res, mapped);
        } catch (error) {
            console.error("globalSearch error:", error);
            return errorResponse(res, "Failed to perform search", 500, error);
        }
    },
    // getAllTransactions already implemented above
    exportTransactions: async (req, res) => {
        try {
            const {
                startDate,
                endDate,
                area,
                category,
                paymentStatus,
                paymentMethod,
                search
            } = req.query;

            const where = {};
            if (startDate || endDate) {
                where.occurredAt = {};
                if (startDate) where.occurredAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    where.occurredAt.lte = end;
                }
            }
            if (paymentStatus) where.paymentStatus = paymentStatus;
            if (paymentMethod) where.paymentMethod = paymentMethod;

            if (search || area || category) {
                const storeWhere = {};
                if (area) storeWhere.location = { contains: area, mode: "insensitive" };
                if (category) storeWhere.category = category;
                
                if (search) {
                    const searchConditions = [
                        { id: { contains: search, mode: "insensitive" } },
                        { store: { name: { contains: search, mode: "insensitive" } } }
                    ];
                    if (Object.keys(storeWhere).length > 0) {
                        where.AND = [
                            { store: storeWhere },
                            { OR: searchConditions }
                        ];
                    } else {
                        where.OR = searchConditions;
                    }
                } else if (Object.keys(storeWhere).length > 0) {
                    where.store = storeWhere;
                }
            }

            const txns = await prisma.transaction.findMany({
                where,
                orderBy: { occurredAt: "desc" },
                include: {
                    store: {
                        select: {
                            name: true,
                            location: true,
                            category: true
                        }
                    },
                    cashier: {
                        select: { name: true }
                    }
                },
                take: 5000
            });

            const data = txns.map(t => ({
                id: t.id,
                occurredAt: t.occurredAt,
                store: t.store?.name || "",
                storeLocation: t.store?.location || "",
                storeCategory: t.store?.category || "",
                totalAmount: t.totalAmount,
                paymentMethod: t.paymentMethod,
                paymentStatus: t.paymentStatus,
                orderStatus: t.orderStatus,
                cashier: t.cashier?.name || ""
            }));

            return successResponse(res, data);
        } catch (error) {
            console.error("exportTransactions error:", error);
            return errorResponse(res, "Failed to export transactions", 500, error);
        }
    },
    getFlashSales: async (req, res) => {
        try {
            const flashSales = await prisma.flashSale.findMany({
                include: {
                    store: { select: { name: true } },
                    items: {
                        include: {
                            product: { select: { name: true, sellingPrice: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Map to include a virtual "status" based on isActive and time
            const now = new Date();
            const mapped = flashSales.map(fs => {
                let status = 'PENDING';
                if (!fs.isActive) {
                    status = 'ENDED';
                } else if (now >= new Date(fs.startTime) && now <= new Date(fs.endTime)) {
                    status = 'ACTIVE';
                } else if (now > new Date(fs.endTime)) {
                    status = 'ENDED';
                } else {
                    status = 'PENDING'; // Not started yet
                }

                return {
                    ...fs,
                    status,
                    startAt: fs.startTime,
                    endAt: fs.endTime,
                    items: fs.items.map(item => ({
                        ...item,
                        salePrice: item.discountPrice,
                        saleStock: item.maxQuantity,
                        maxQtyPerOrder: null
                    }))
                };
            });

            return successResponse(res, mapped);
        } catch (error) {
            console.error('getFlashSales error:', error);
            return errorResponse(res, "Failed to fetch flash sales", 500, error);
        }
    },
    updateFlashSaleStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { action } = req.body; // APPROVE, REJECT, ACTIVATE, END

            let data = {};
            switch (action) {
                case 'APPROVE':
                case 'ACTIVATE':
                    data = { isActive: true };
                    break;
                case 'REJECT':
                case 'END':
                    data = { isActive: false };
                    break;
                default:
                    return errorResponse(res, "Invalid action", 400);
            }

            const updated = await prisma.flashSale.update({
                where: { id },
                data
            });
            return successResponse(res, updated, `Flash sale ${action.toLowerCase()}d`);
        } catch (error) {
            console.error('updateFlashSaleStatus error:', error);
            return errorResponse(res, "Failed to update flash sale status", 500, error);
        }
    },
};
