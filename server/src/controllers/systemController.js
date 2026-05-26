const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');

const getPaymentInfo = async (req, res) => {
    try {
        const qris = await prisma.systemSettings.findUnique({
            where: { key: 'PLATFORM_QRIS_URL' }
        });

        const bankSetting = await prisma.systemSettings.findUnique({
            where: { key: 'PLATFORM_BANK_INFO' }
        });

        let bankInfo = bankSetting?.value ? bankSetting.value.trim() : '';

        if (!bankInfo) {
            const bankSettings = await prisma.systemSettings.findMany({
                where: {
                    key: {
                        in: ['BANK_NAME', 'BANK_ACCOUNT_NUMBER', 'BANK_ACCOUNT_NAME']
                    }
                }
            });

            const bankMap = {};
            bankSettings.forEach((s) => {
                bankMap[s.key] = (s.value || '').trim();
            });

            const parts = [];
            if (bankMap.BANK_NAME) parts.push(bankMap.BANK_NAME);
            if (bankMap.BANK_ACCOUNT_NUMBER) parts.push(bankMap.BANK_ACCOUNT_NUMBER);
            if (bankMap.BANK_ACCOUNT_NAME) parts.push(`a.n ${bankMap.BANK_ACCOUNT_NAME}`);

            bankInfo = parts.join(' ').trim();
        }

        let bankAccounts = [];
        try {
            const banksSetting = await prisma.systemSettings.findUnique({
                where: { key: 'SUBSCRIPTION_BANKS' }
            });
            if (banksSetting?.value) {
                const parsed = JSON.parse(banksSetting.value);
                if (Array.isArray(parsed)) {
                    bankAccounts = parsed
                        .map((b) => ({
                            bankName: (b.bankName || '').trim(),
                            accountNumber: (b.accountNumber || '').trim(),
                            accountName: (b.accountName || '').trim(),
                            label: (b.label || '').trim(),
                            isDefault: !!b.isDefault
                        }))
                        .filter(
                            (b) =>
                                b.bankName !== '' ||
                                b.accountNumber !== '' ||
                                b.accountName !== ''
                        );
                }
            }
        } catch (e) {
            bankAccounts = [];
        }

        return successResponse(res, {
            qrisUrl: qris?.value || 'https://placehold.co/400x400/png?text=QRIS+Rana',
            bankInfo,
            bankAccounts
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch payment info", 500);
    }
};

const updatePaymentInfo = async (req, res) => {
    try {
        const { qrisUrl, bankInfo } = req.body;
        const { id: userId, tenantId } = req.user || {};
        const { logAudit } = require('./adminController');

        if (qrisUrl) {
            await prisma.systemSettings.upsert({
                where: { key: 'PLATFORM_QRIS_URL' },
                update: { value: qrisUrl },
                create: { key: 'PLATFORM_QRIS_URL', value: qrisUrl, description: 'Main QRIS' }
            });
            if (logAudit) {
                await logAudit(tenantId || 'SYSTEM', userId, 'UPDATE_SETTING', 'SystemSettings', 'PLATFORM_QRIS_URL', { value: qrisUrl });
            }
        }

        if (bankInfo) {
            await prisma.systemSettings.upsert({
                where: { key: 'PLATFORM_BANK_INFO' },
                update: { value: bankInfo },
                create: { key: 'PLATFORM_BANK_INFO', value: bankInfo, description: 'Bank Transfer Info' }
            });
            if (logAudit) {
                await logAudit(tenantId || 'SYSTEM', userId, 'UPDATE_SETTING', 'SystemSettings', 'PLATFORM_BANK_INFO', { value: bankInfo });
            }
        }

        return successResponse(res, null, "Payment Info Updated");
    } catch (error) {
        return errorResponse(res, "Update Failed", 500, error);
    }
};

const getSubscriptionBankAccounts = async (req, res) => {
    try {
        const setting = await prisma.systemSettings.findUnique({
            where: { key: 'SUBSCRIPTION_BANKS' }
        });

        let banks = [];

        if (setting?.value) {
            try {
                const parsed = JSON.parse(setting.value);
                if (Array.isArray(parsed)) {
                    banks = parsed
                        .map((b) => ({
                            bankName: (b.bankName || '').trim(),
                            accountNumber: (b.accountNumber || '').trim(),
                            accountName: (b.accountName || '').trim(),
                            label: (b.label || '').trim(),
                            isDefault: !!b.isDefault
                        }))
                        .filter(
                            (b) =>
                                b.bankName !== '' ||
                                b.accountNumber !== '' ||
                                b.accountName !== ''
                        );
                }
            } catch (e) {
                banks = [];
            }
        }

        if (banks.length === 0) {
            const bankSettings = await prisma.systemSettings.findMany({
                where: {
                    key: {
                        in: ['BANK_NAME', 'BANK_ACCOUNT_NUMBER', 'BANK_ACCOUNT_NAME']
                    }
                }
            });

            const bankMap = {};
            bankSettings.forEach((s) => {
                bankMap[s.key] = (s.value || '').trim();
            });

            if (
                bankMap.BANK_NAME ||
                bankMap.BANK_ACCOUNT_NUMBER ||
                bankMap.BANK_ACCOUNT_NAME
            ) {
                banks = [
                    {
                        bankName: bankMap.BANK_NAME || '',
                        accountNumber: bankMap.BANK_ACCOUNT_NUMBER || '',
                        accountName: bankMap.BANK_ACCOUNT_NAME || '',
                        label: '',
                        isDefault: true
                    }
                ];
            }
        }

        return successResponse(res, banks);
    } catch (error) {
        return errorResponse(res, "Failed to fetch subscription banks", 500);
    }
};

const updateSubscriptionBankAccounts = async (req, res) => {
    try {
        const { banks } = req.body;
        const { id: userId, tenantId } = req.user || {};
        const { logAudit } = require('./adminController');

        if (!Array.isArray(banks)) {
            return errorResponse(res, "Invalid banks payload", 400);
        }

        const normalized = banks
            .map((b) => ({
                bankName: (b.bankName || '').trim(),
                accountNumber: (b.accountNumber || '').trim(),
                accountName: (b.accountName || '').trim(),
                label: (b.label || '').trim(),
                isDefault: !!b.isDefault
            }))
            .filter(
                (b) =>
                    b.bankName !== '' ||
                    b.accountNumber !== '' ||
                    b.accountName !== ''
            );

        const payload = JSON.stringify(normalized);

        await prisma.systemSettings.upsert({
            where: { key: 'SUBSCRIPTION_BANKS' },
            update: { value: payload },
            create: {
                key: 'SUBSCRIPTION_BANKS',
                value: payload,
                description: 'Bank accounts for subscription payments'
            }
        });

        if (logAudit) {
            await logAudit(
                tenantId || 'SYSTEM',
                userId,
                'UPDATE_SETTING',
                'SystemSettings',
                'SUBSCRIPTION_BANKS',
                { value: payload }
            );
        }

        return successResponse(res, normalized, "Subscription banks updated");
    } catch (error) {
        return errorResponse(res, "Failed to update subscription banks", 500);
    }
};

// GET Fee Settings (Admin)
const getFeeSettings = async (req, res) => {
    try {
        const keys = [
            'BUYER_SERVICE_FEE',
            'BUYER_SERVICE_FEE_TYPE',
            'BUYER_FEE_CAP_MIN',
            'BUYER_FEE_CAP_MAX',
            'MERCHANT_SERVICE_FEE',
            'MERCHANT_SERVICE_FEE_TYPE',
            'MERCHANT_FEE_CAP_MIN',
            'MERCHANT_FEE_CAP_MAX',
            'WHOLESALE_SERVICE_FEE',
            'WHOLESALE_SERVICE_FEE_TYPE',
            'WHOLESALE_FEE_CAP_MIN',
            'WHOLESALE_FEE_CAP_MAX'
        ];
        const settings = await prisma.systemSettings.findMany({
            where: { key: { in: keys } }
        });
 
        const feeMap = {
            buyerFee: '0',
            buyerFeeType: 'FLAT',
            buyerFeeCapMin: '',
            buyerFeeCapMax: '',
            merchantFee: '0',
            merchantFeeType: 'FLAT',
            merchantFeeCapMin: '',
            merchantFeeCapMax: '',
            wholesaleFee: '0',
            wholesaleFeeType: 'FLAT',
            wholesaleFeeCapMin: '',
            wholesaleFeeCapMax: ''
        };
 
        settings.forEach(s => {
            if (s.key === 'BUYER_SERVICE_FEE') feeMap.buyerFee = s.value;
            if (s.key === 'BUYER_SERVICE_FEE_TYPE') feeMap.buyerFeeType = s.value || 'FLAT';
            if (s.key === 'BUYER_FEE_CAP_MIN') feeMap.buyerFeeCapMin = s.value || '';
            if (s.key === 'BUYER_FEE_CAP_MAX') feeMap.buyerFeeCapMax = s.value || '';
            if (s.key === 'MERCHANT_SERVICE_FEE') feeMap.merchantFee = s.value;
            if (s.key === 'MERCHANT_SERVICE_FEE_TYPE') feeMap.merchantFeeType = s.value || 'FLAT';
            if (s.key === 'MERCHANT_FEE_CAP_MIN') feeMap.merchantFeeCapMin = s.value || '';
            if (s.key === 'MERCHANT_FEE_CAP_MAX') feeMap.merchantFeeCapMax = s.value || '';
            if (s.key === 'WHOLESALE_SERVICE_FEE') feeMap.wholesaleFee = s.value;
            if (s.key === 'WHOLESALE_SERVICE_FEE_TYPE') feeMap.wholesaleFeeType = s.value || 'FLAT';
            if (s.key === 'WHOLESALE_FEE_CAP_MIN') feeMap.wholesaleFeeCapMin = s.value || '';
            if (s.key === 'WHOLESALE_FEE_CAP_MAX') feeMap.wholesaleFeeCapMax = s.value || '';
        });
 
        return successResponse(res, feeMap);
    } catch (error) {
        return errorResponse(res, "Failed to fetch fee settings", 500, error);
    }
};

// UPDATE Fee Settings (Admin)
const updateFeeSettings = async (req, res) => {
    try {
        const {
            buyerFee,
            buyerFeeType,
            buyerFeeCapMin,
            buyerFeeCapMax,
            merchantFee,
            merchantFeeType,
            merchantFeeCapMin,
            merchantFeeCapMax,
            wholesaleFee,
            wholesaleFeeType,
            wholesaleFeeCapMin,
            wholesaleFeeCapMax
        } = req.body;
        const { id: userId, tenantId } = req.user || {};
        const { logAudit } = require('./adminController');
 
        const updates = [];
        if (buyerFeeType !== undefined) updates.push({ key: 'BUYER_SERVICE_FEE_TYPE', value: String(buyerFeeType), description: 'Buyer Fee Type' });
        if (buyerFee !== undefined) updates.push({ key: 'BUYER_SERVICE_FEE', value: String(buyerFee), description: 'Fee charged to Buyer' });
        if (buyerFeeCapMin !== undefined) updates.push({ key: 'BUYER_FEE_CAP_MIN', value: String(buyerFeeCapMin), description: 'Buyer Fee Min Cap' });
        if (buyerFeeCapMax !== undefined) updates.push({ key: 'BUYER_FEE_CAP_MAX', value: String(buyerFeeCapMax), description: 'Buyer Fee Max Cap' });
 
        if (merchantFeeType !== undefined) updates.push({ key: 'MERCHANT_SERVICE_FEE_TYPE', value: String(merchantFeeType), description: 'Merchant Fee Type' });
        if (merchantFee !== undefined) updates.push({ key: 'MERCHANT_SERVICE_FEE', value: String(merchantFee), description: 'Fee deducted from Merchant' });
        if (merchantFeeCapMin !== undefined) updates.push({ key: 'MERCHANT_FEE_CAP_MIN', value: String(merchantFeeCapMin), description: 'Merchant Fee Min Cap' });
        if (merchantFeeCapMax !== undefined) updates.push({ key: 'MERCHANT_FEE_CAP_MAX', value: String(merchantFeeCapMax), description: 'Merchant Fee Max Cap' });
 
        if (wholesaleFeeType !== undefined) updates.push({ key: 'WHOLESALE_SERVICE_FEE_TYPE', value: String(wholesaleFeeType), description: 'Wholesale Fee Type' });
        if (wholesaleFee !== undefined) updates.push({ key: 'WHOLESALE_SERVICE_FEE', value: String(wholesaleFee), description: 'Fee on Wholesale Orders' });
        if (wholesaleFeeCapMin !== undefined) updates.push({ key: 'WHOLESALE_FEE_CAP_MIN', value: String(wholesaleFeeCapMin), description: 'Wholesale Fee Min Cap' });
        if (wholesaleFeeCapMax !== undefined) updates.push({ key: 'WHOLESALE_FEE_CAP_MAX', value: String(wholesaleFeeCapMax), description: 'Wholesale Fee Max Cap' });
 
        for (const update of updates) {
            await prisma.systemSettings.upsert({
                where: { key: update.key },
                update: { value: update.value },
                create: update
            });
            if (logAudit) {
                await logAudit(tenantId || 'SYSTEM', userId, 'UPDATE_SETTING', 'SystemSettings', update.key, { value: update.value });
            }
        }
 
        return successResponse(res, null, "Fee Settings Updated");
    } catch (error) {
        return errorResponse(res, "Failed to update fee settings", 500, error);
    }
};

const getAppMenus = async (req, res) => {
    try {
        const allMenus = await prisma.appMenu.findMany({
            orderBy: { order: 'asc' }
        });
        const settings = await prisma.systemSettings.findMany({
            where: { key: { startsWith: 'MAINTENANCE_MENU_' } }
        });
        const maintActive = new Set();
        for (const s of settings) {
            try {
                const val = JSON.parse(s.value);
                if (val && val.active === true) {
                    maintActive.add(s.key.replace('MAINTENANCE_MENU_', ''));
                }
            } catch { }
        }
        const visibleMenus = allMenus.filter(m => m.isActive === true || maintActive.has(m.key));
        successResponse(res, visibleMenus);
    } catch (error) {
        errorResponse(res, "Failed to fetch app menus", 500);
    }
};

const getAppMenuMaintenancePublic = async (req, res) => {
    try {
        const settings = await prisma.systemSettings.findMany({
            where: { key: { startsWith: 'MAINTENANCE_MENU_' } }
        });
        const map = {};
        for (const s of settings) {
            try {
                map[s.key.replace('MAINTENANCE_MENU_', '')] = JSON.parse(s.value);
            } catch {
                map[s.key.replace('MAINTENANCE_MENU_', '')] = { active: false };
            }
        }
        successResponse(res, map);
    } catch (error) {
        errorResponse(res, "Failed to fetch maintenance map", 500);
    }
};
const getActiveAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { 
                isActive: true,
                target: 'ALL' 
            },
            orderBy: { createdAt: 'desc' }
        });
        successResponse(res, announcements);
    } catch (error) {
        errorResponse(res, "Failed to fetch announcements", 500);
    }
};

const getMyAnnouncements = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        
        if (!tenant) return successResponse(res, []);

        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [
                    { target: 'ALL' },
                    { target: 'PLAN', targetValue: tenant.plan },
                    { target: 'STATUS', targetValue: tenant.subscriptionStatus }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        successResponse(res, announcements);
    } catch (error) {
        errorResponse(res, "Failed to fetch announcements", 500);
    }
};

const getNotifications = async (req, res) => {
    try {
        const { tenantId, role } = req.user; // Extracted from verifyToken middleware

        if (!tenantId) return successResponse(res, []);

        let where = { tenantId };
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            where = {
                OR: [
                    { tenantId },
                    { tenantId: 'rana_admin_tenant' }
                ]
            };
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        successResponse(res, notifications);
    } catch (error) {
        errorResponse(res, "Failed to fetch notifications", 500);
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        if (!tenantId) return successResponse(res, null, "No tenant");

        let where = { tenantId, isRead: false };
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            where = {
                isRead: false,
                OR: [
                    { tenantId },
                    { tenantId: 'rana_admin_tenant' }
                ]
            };
        }

        await prisma.notification.updateMany({
            where,
            data: { isRead: true }
        });

        successResponse(res, null, "Notifications marked as read");
    } catch (error) {
        errorResponse(res, "Failed to mark notifications as read", 500);
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId, role } = req.user;
        if (!tenantId) return successResponse(res, null, "No tenant");

        let where = { id, tenantId };
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            where = {
                id,
                OR: [
                    { tenantId },
                    { tenantId: 'rana_admin_tenant' }
                ]
            };
        }

        const result = await prisma.notification.updateMany({
            where,
            data: { isRead: true }
        });

        if (result.count === 0) {
            return errorResponse(res, "Notification not found or access denied", 404);
        }

        successResponse(res, null, "Notification marked as read");
    } catch (error) {
        errorResponse(res, "Failed to mark notification as read", 500);
    }
};

const getPublicSettings = async (req, res) => {
    try {
        const settings = await prisma.systemSettings.findMany({
            where: {
                key: { startsWith: 'CMS_' }
            }
        });
        const settingsMap = {};
        settings.forEach(s => settingsMap[s.key] = s.value);
        successResponse(res, settingsMap);
    } catch (error) {
        errorResponse(res, "Failed to fetch public settings", 500);
    }
};

const getAppConfig = async (req, res) => {
    try {
        const settings = await prisma.systemSettings.findMany({
            where: {
                key: {
                    in: [
                        'BUYER_SERVICE_FEE',
                        'BUYER_SERVICE_FEE_TYPE',
                        'BUYER_FEE_CAP_MIN',
                        'BUYER_FEE_CAP_MAX',
                        'PLATFORM_BANK_INFO',
                        'BANK_NAME',
                        'BANK_ACCOUNT_NUMBER',
                        'BANK_ACCOUNT_NAME'
                    ]
                }
            }
        });
        
        const config = {
            buyerServiceFee: 0,
            buyerServiceFeeType: 'FLAT',
            buyerFeeCapMin: null,
            buyerFeeCapMax: null,
            bankInfo: {}
        };

        const bankMap = {};

        settings.forEach(s => {
            if (s.key === 'BUYER_SERVICE_FEE') config.buyerServiceFee = parseInt(s.value) || 0;
            if (s.key === 'BUYER_SERVICE_FEE_TYPE') config.buyerServiceFeeType = s.value || 'FLAT';
            if (s.key === 'BUYER_FEE_CAP_MIN') {
                const v = parseFloat(s.value);
                if (!Number.isNaN(v)) config.buyerFeeCapMin = v;
            }
            if (s.key === 'BUYER_FEE_CAP_MAX') {
                const v = parseFloat(s.value);
                if (!Number.isNaN(v)) config.buyerFeeCapMax = v;
            }
            if (['PLATFORM_BANK_INFO', 'BANK_NAME', 'BANK_ACCOUNT_NUMBER', 'BANK_ACCOUNT_NAME'].includes(s.key)) {
                bankMap[s.key] = s.value;
            }
        });

        // Construct Bank Info
        if (bankMap.PLATFORM_BANK_INFO) {
            config.bankInfo.text = bankMap.PLATFORM_BANK_INFO;
        } else {
             const parts = [];
            if (bankMap.BANK_NAME) parts.push(bankMap.BANK_NAME);
            if (bankMap.BANK_ACCOUNT_NUMBER) parts.push(bankMap.BANK_ACCOUNT_NUMBER);
            if (bankMap.BANK_ACCOUNT_NAME) parts.push(`a.n ${bankMap.BANK_ACCOUNT_NAME}`);
            config.bankInfo.text = parts.join(' ').trim();
        }

        successResponse(res, config);
    } catch (error) {
        errorResponse(res, "Failed to fetch app config", 500, error);
    }
};

// Careers Openings (Public)
const getCareersOpenings = async (req, res) => {
    try {
        const setting = await prisma.systemSettings.findUnique({
            where: { key: 'CAREERS_OPENINGS' }
        });
        let openings = [];
        if (setting?.value) {
            try {
                const parsed = JSON.parse(setting.value);
                if (Array.isArray(parsed)) {
                    openings = parsed
                        .map(o => ({
                            title: String(o.title || '').trim(),
                            dept: String(o.dept || '').trim(),
                            location: String(o.location || '').trim(),
                            tags: Array.isArray(o.tags) ? o.tags.map(t => String(t).trim()).filter(Boolean) : [],
                            summary: String(o.summary || o.description || '').trim(),
                            seniority: String(o.seniority || '').trim()
                        }))
                        .filter(o => o.title !== '');
                }
            } catch (e) {
                openings = [];
            }
        }
        return successResponse(res, openings);
    } catch (error) {
        return errorResponse(res, "Failed to fetch careers openings", 500);
    }
};

const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        successResponse(res, announcements);
    } catch (error) {
        errorResponse(res, "Failed to fetch all announcements", 500);
    }
};

const createAnnouncement = async (req, res) => {
    try {
        const { title, content, isActive, target, targetValue } = req.body;
        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                isActive: isActive ?? true,
                target: target || 'ALL',
                targetValue: targetValue || null
            }
        });
        successResponse(res, announcement, "Announcement Created");
    } catch (error) {
        errorResponse(res, "Failed to create announcement", 500, error);
    }
};

const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, isActive, target, targetValue } = req.body;
        const announcement = await prisma.announcement.update({
            where: { id },
            data: { 
                title, 
                content, 
                isActive,
                target,
                targetValue
            }
        });
        successResponse(res, announcement, "Announcement Updated");
    } catch (error) {
        errorResponse(res, "Failed to update announcement", 500, error);
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.announcement.delete({ where: { id } });
        successResponse(res, null, "Announcement Deleted");
    } catch (error) {
        errorResponse(res, "Failed to delete announcement", 500, error);
    }
};

const getFeaturedStores = async (req, res) => {
    try {
        const stores = await prisma.store.findMany({
            where: {
                isActive: true,
                imageUrl: { not: null } // Prefer stores with logos
            },
            take: 20,
            orderBy: { createdAt: 'desc' }, // Or random if possible, but simple desc is fine
            select: {
                id: true,
                name: true,
                imageUrl: true,
                category: true,
                description: true,
                location: true
            }
        });

        // If not enough stores with images, fetch others
        if (stores.length < 5) {
            const moreStores = await prisma.store.findMany({
                where: {
                    isActive: true,
                    imageUrl: null
                },
                take: 10 - stores.length,
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    category: true,
                    description: true,
                    location: true
                }
            });
            stores.push(...moreStores);
        }

        return successResponse(res, stores);
    } catch (error) {
        return errorResponse(res, "Failed to fetch featured stores", 500);
    }
};

module.exports = {
    getPaymentInfo,
    updatePaymentInfo,
    getSubscriptionBankAccounts,
    updateSubscriptionBankAccounts,
    getFeeSettings,
    updateFeeSettings,
    getActiveAnnouncements,
    getMyAnnouncements,
    getAllAnnouncements, // Admin
    createAnnouncement, // Admin
    updateAnnouncement, // Admin
    deleteAnnouncement, // Admin
    getAppMenus,
    getAppMenuMaintenancePublic,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    getPublicSettings,
    getAppConfig,
    getFeaturedStores,
    getCareersOpenings
};
