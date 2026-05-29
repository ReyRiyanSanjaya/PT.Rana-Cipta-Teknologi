const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');

// Get recipients with filters
const getRecipients = async (req, res) => {
    try {
        const { category, search, tag, isActive, page = 1, limit = 25 } = req.query;
        const where = { unsubscribed: false };
        if (category) where.category = category;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (tag) where.tags = { has: tag };
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [recipients, total] = await prisma.$transaction([
            prisma.emailRecipient.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            prisma.emailRecipient.count({ where })
        ]);
        return successResponse(res, { recipients, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch recipients', 500, error);
    }
};

// Get stats by category
const getStats = async (req, res) => {
    try {
        const total = await prisma.emailRecipient.count({ where: { unsubscribed: false } });
        const active = await prisma.emailRecipient.count({ where: { isActive: true, unsubscribed: false } });
        const unsubscribed = await prisma.emailRecipient.count({ where: { unsubscribed: true } });

        const byCategory = await prisma.emailRecipient.groupBy({
            by: ['category'],
            where: { unsubscribed: false },
            _count: true
        });
        const categories = byCategory.map(c => ({ category: c.category, count: c._count }));

        // Get all unique tags
        const allRecipients = await prisma.emailRecipient.findMany({
            where: { unsubscribed: false },
            select: { tags: true }
        });
        const tagSet = new Set();
        allRecipients.forEach(r => (r.tags || []).forEach(t => tagSet.add(t)));

        const lists = await prisma.emailList.findMany({ orderBy: { createdAt: 'desc' } });

        return successResponse(res, { total, active, unsubscribed, categories, tags: Array.from(tagSet), lists });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch stats', 500, error);
    }
};

// Add single recipient
const addRecipient = async (req, res) => {
    try {
        const { email, name, category, tags, source, metadata } = req.body;
        if (!email) return errorResponse(res, 'Email is required', 400);

        const existing = await prisma.emailRecipient.findUnique({ where: { email } });
        if (existing) return errorResponse(res, 'Email already exists', 400);

        const recipient = await prisma.emailRecipient.create({
            data: { email, name, category: category || 'GENERAL', tags: tags || [], source: source || 'MANUAL', metadata }
        });
        return successResponse(res, recipient, 'Recipient added');
    } catch (error) {
        return errorResponse(res, 'Failed to add recipient', 500, error);
    }
};

// Bulk import recipients
const bulkImport = async (req, res) => {
    try {
        const { recipients, category, tags, source } = req.body;
        if (!Array.isArray(recipients) || recipients.length === 0) return errorResponse(res, 'Recipients array required', 400);

        let imported = 0, skipped = 0;
        for (const r of recipients) {
            const email = (r.email || r).toString().trim().toLowerCase();
            if (!email || !email.includes('@')) { skipped++; continue; }
            try {
                await prisma.emailRecipient.upsert({
                    where: { email },
                    update: { name: r.name || undefined, isActive: true, unsubscribed: false },
                    create: {
                        email,
                        name: r.name || null,
                        category: category || r.category || 'GENERAL',
                        tags: tags || r.tags || [],
                        source: source || 'IMPORT'
                    }
                });
                imported++;
            } catch { skipped++; }
        }
        return successResponse(res, { imported, skipped, total: recipients.length }, 'Import complete');
    } catch (error) {
        return errorResponse(res, 'Failed to import', 500, error);
    }
};

// Update recipient
const updateRecipient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, tags, isActive } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (category !== undefined) data.category = category;
        if (tags !== undefined) data.tags = tags;
        if (isActive !== undefined) data.isActive = isActive;

        const updated = await prisma.emailRecipient.update({ where: { id }, data });
        return successResponse(res, updated, 'Recipient updated');
    } catch (error) {
        return errorResponse(res, 'Failed to update recipient', 500, error);
    }
};

// Delete recipient
const deleteRecipient = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.emailRecipient.delete({ where: { id } });
        return successResponse(res, null, 'Recipient deleted');
    } catch (error) {
        return errorResponse(res, 'Failed to delete recipient', 500, error);
    }
};

// Sync from existing users (pull merchants, buyers, drivers into email list)
const syncFromUsers = async (req, res) => {
    try {
        let synced = 0;

        // Sync merchants (store owners)
        const merchants = await prisma.user.findMany({
            where: { role: 'OWNER' },
            select: { email: true, name: true }
        });
        for (const u of merchants) {
            if (!u.email) continue;
            await prisma.emailRecipient.upsert({
                where: { email: u.email },
                update: { name: u.name, isActive: true },
                create: { email: u.email, name: u.name, category: 'MERCHANT', source: 'REGISTER', tags: ['merchant', 'auto-sync'] }
            });
            synced++;
        }

        // Sync buyers
        const buyers = await prisma.user.findMany({
            where: { tenantId: 'rana_market_buyer_tenant' },
            select: { email: true, name: true }
        });
        for (const u of buyers) {
            if (!u.email) continue;
            await prisma.emailRecipient.upsert({
                where: { email: u.email },
                update: { name: u.name, isActive: true },
                create: { email: u.email, name: u.name, category: 'BUYER', source: 'REGISTER', tags: ['buyer', 'auto-sync'] }
            });
            synced++;
        }

        // Sync drivers
        const drivers = await prisma.driver.findMany({
            select: { email: true, name: true }
        });
        for (const d of drivers) {
            if (!d.email) continue;
            await prisma.emailRecipient.upsert({
                where: { email: d.email },
                update: { name: d.name, isActive: true },
                create: { email: d.email, name: d.name, category: 'DRIVER', source: 'REGISTER', tags: ['driver', 'auto-sync'] }
            });
            synced++;
        }

        // Sync distributors
        const distributors = await prisma.distributor.findMany({
            include: { user: { select: { email: true, name: true } } }
        });
        for (const dist of distributors) {
            if (!dist.user?.email) continue;
            await prisma.emailRecipient.upsert({
                where: { email: dist.user.email },
                update: { name: dist.user.name || dist.companyName, isActive: true },
                create: { email: dist.user.email, name: dist.user.name || dist.companyName, category: 'DISTRIBUTOR', source: 'REGISTER', tags: ['distributor', 'auto-sync'] }
            });
            synced++;
        }

        return successResponse(res, { synced }, `Synced ${synced} recipients from user database`);
    } catch (error) {
        console.error('syncFromUsers error:', error);
        return errorResponse(res, 'Failed to sync', 500, error);
    }
};

// Manage email lists
const createList = async (req, res) => {
    try {
        const { name, description, category, color } = req.body;
        if (!name) return errorResponse(res, 'Name required', 400);
        const list = await prisma.emailList.create({ data: { name, description, category: category || 'GENERAL', color } });
        return successResponse(res, list, 'List created');
    } catch (error) {
        return errorResponse(res, 'Failed to create list', 500, error);
    }
};

const deleteList = async (req, res) => {
    try {
        await prisma.emailList.delete({ where: { id: req.params.id } });
        return successResponse(res, null, 'List deleted');
    } catch (error) {
        return errorResponse(res, 'Failed to delete list', 500, error);
    }
};

module.exports = {
    getRecipients, getStats, addRecipient, bulkImport,
    updateRecipient, deleteRecipient, syncFromUsers,
    createList, deleteList
};
