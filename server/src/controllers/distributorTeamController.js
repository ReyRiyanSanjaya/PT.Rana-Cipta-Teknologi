const prisma = require('../config/database');
const bcrypt = require('bcrypt');
const { successResponse, errorResponse } = require('../utils/response');

const getDistributorId = async (req) => {
    if (req.user.distributorId) return req.user.distributorId;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { distributor: true } });
    return user?.distributor?.id;
};

// Sub-role definitions and permissions
// Now unified with org hierarchy positions
const SUB_ROLES = {
    OWNER: {
        label: 'Owner / Direktur Utama',
        permissions: ['*'],
        description: 'Akses penuh ke semua fitur',
        level: 0
    },
    DIRECTOR: {
        label: 'Direktur Distribusi',
        permissions: ['*'],
        description: 'Akses penuh ke semua fitur distribusi',
        level: 1
    },
    NSM: {
        label: 'National Sales Manager',
        permissions: ['dashboard', 'orders', 'customers', 'sales', 'receivables', 'kpi', 'reports', 'acquisition-map', 'notifications', 'returns', 'subscription'],
        description: 'Kelola seluruh penjualan nasional, laporan, dan piutang',
        level: 2
    },
    RSM: {
        label: 'Regional Sales Manager',
        permissions: ['dashboard', 'orders', 'customers', 'sales', 'receivables', 'kpi', 'reports', 'acquisition-map', 'notifications', 'returns'],
        description: 'Kelola penjualan regional, pelanggan, dan piutang',
        level: 3
    },
    ASM: {
        label: 'Area Sales Manager',
        permissions: ['dashboard', 'orders', 'customers', 'sales', 'kpi', 'acquisition-map', 'notifications', 'shipments'],
        description: 'Kelola penjualan area, pesanan, dan pengiriman',
        level: 4
    },
    SPV: {
        label: 'Supervisor',
        permissions: ['dashboard', 'orders', 'customers', 'sales', 'kpi', 'acquisition-map', 'notifications', 'shipments'],
        description: 'Supervisi tim sales, pesanan, dan kunjungan',
        level: 5
    },
    SALES: {
        label: 'Sales Representative',
        permissions: ['dashboard', 'orders', 'customers', 'sales', 'kpi', 'acquisition-map', 'notifications'],
        description: 'Eksekusi penjualan, kunjungan merchant',
        level: 6
    },
    WAREHOUSE: {
        label: 'Admin Gudang',
        permissions: ['dashboard', 'products', 'inventory', 'warehouses', 'warehouse-stock', 'shipments'],
        description: 'Kelola produk, stok gudang, dan pengiriman',
        level: 6
    },
    FINANCE: {
        label: 'Finance / Accounting',
        permissions: ['dashboard', 'receivables', 'reports', 'returns', 'subscription'],
        description: 'Kelola piutang, laporan keuangan, dan billing',
        level: 6
    },
    VIEWER: {
        label: 'Viewer',
        permissions: ['dashboard', 'reports'],
        description: 'Hanya bisa melihat dashboard dan laporan',
        level: 7
    }
};

// Helper: Get sub-role for a user from SystemSettings
const getUserSubRole = async (userId, distributorId) => {
    const key = `DIST_TEAM_${distributorId}`;
    const setting = await prisma.systemSettings.findUnique({ where: { key } });
    if (!setting || !setting.value) return null;

    try {
        const teamData = JSON.parse(setting.value);
        const member = teamData.find(m => m.userId === userId);
        return member?.subRole || null;
    } catch (e) {
        return null;
    }
};

// Helper: Save team data
const saveTeamData = async (distributorId, teamData) => {
    const key = `DIST_TEAM_${distributorId}`;
    await prisma.systemSettings.upsert({
        where: { key },
        update: { value: JSON.stringify(teamData) },
        create: { key, value: JSON.stringify(teamData), description: `Team roles for distributor ${distributorId}` }
    });
};

// =======================
// TEAM MANAGEMENT
// =======================

/**
 * GET /distributor/team
 * List all team members
 */
const getTeamMembers = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        // Get the distributor to find owner
        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { userId: true, user: { select: { tenantId: true } } }
        });

        // Get all users in the same tenant with DISTRIBUTOR role
        const users = await prisma.user.findMany({
            where: {
                tenantId: distributor.user.tenantId,
                role: 'DISTRIBUTOR'
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                loginHistory: { orderBy: { loginAt: 'desc' }, take: 1, select: { loginAt: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Get team roles from settings
        const key = `DIST_TEAM_${distributorId}`;
        const setting = await prisma.systemSettings.findUnique({ where: { key } });
        let teamRoles = [];
        try { teamRoles = setting?.value ? JSON.parse(setting.value) : []; } catch (e) { }

        const roleMap = new Map(teamRoles.map(r => [r.userId, r]));

        const members = users.map(u => {
            const isOwner = u.id === distributor.userId;
            const roleData = roleMap.get(u.id);
            const subRole = isOwner ? 'OWNER' : (roleData?.subRole || 'VIEWER');
            const roleInfo = SUB_ROLES[subRole] || SUB_ROLES.VIEWER;

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                isActive: u.isActive,
                isOwner,
                subRole,
                subRoleLabel: roleInfo.label,
                permissions: roleInfo.permissions,
                lastLogin: u.loginHistory?.[0]?.loginAt || null,
                joinedAt: u.createdAt
            };
        });

        return successResponse(res, {
            members,
            totalMembers: members.length,
            roles: SUB_ROLES
        });
    } catch (error) {
        return errorResponse(res, "Failed to fetch team", 500, error);
    }
};

/**
 * POST /distributor/team/invite
 * Invite a new team member
 */
const inviteTeamMember = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { name, email, password, subRole } = req.body;
        if (!name || !email || !password || !subRole) {
            return errorResponse(res, "name, email, password, and subRole are required", 400);
        }

        if (!SUB_ROLES[subRole] || subRole === 'OWNER') {
            return errorResponse(res, "Invalid sub-role", 400);
        }

        // Check email uniqueness
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) return errorResponse(res, "Email sudah terdaftar", 400);

        // Get distributor's tenant
        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { user: { select: { tenantId: true } } }
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase().trim(),
                passwordHash: hashedPassword,
                role: 'DISTRIBUTOR',
                tenantId: distributor.user.tenantId,
                isActive: true
            }
        });

        // Save sub-role in team settings
        const key = `DIST_TEAM_${distributorId}`;
        const setting = await prisma.systemSettings.findUnique({ where: { key } });
        let teamData = [];
        try { teamData = setting?.value ? JSON.parse(setting.value) : []; } catch (e) { }

        teamData.push({ userId: newUser.id, subRole, invitedAt: new Date().toISOString() });
        await saveTeamData(distributorId, teamData);

        // Send notification
        try {
            await prisma.notification.create({
                data: {
                    tenantId: distributor.user.tenantId,
                    title: 'Anggota Tim Baru',
                    body: `${name} bergabung sebagai ${SUB_ROLES[subRole].label}`
                }
            });
        } catch (e) { }

        return successResponse(res, {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            subRole,
            subRoleLabel: SUB_ROLES[subRole].label
        }, "Team member invited", 201);
    } catch (error) {
        return errorResponse(res, "Failed to invite team member", 500, error);
    }
};

/**
 * PUT /distributor/team/:userId/role
 * Update team member's sub-role
 */
const updateMemberRole = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const { userId } = req.params;
        const { subRole } = req.body;

        if (!SUB_ROLES[subRole] || subRole === 'OWNER') {
            return errorResponse(res, "Invalid sub-role", 400);
        }

        // Verify user belongs to this distributor's tenant
        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { userId: true, user: { select: { tenantId: true } } }
        });

        if (userId === distributor.userId) {
            return errorResponse(res, "Cannot change owner role", 400);
        }

        const targetUser = await prisma.user.findFirst({
            where: { id: userId, tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR' }
        });
        if (!targetUser) return errorResponse(res, "User not found in team", 404);

        // Update team settings
        const key = `DIST_TEAM_${distributorId}`;
        const setting = await prisma.systemSettings.findUnique({ where: { key } });
        let teamData = [];
        try { teamData = setting?.value ? JSON.parse(setting.value) : []; } catch (e) { }

        const idx = teamData.findIndex(m => m.userId === userId);
        if (idx >= 0) {
            teamData[idx].subRole = subRole;
        } else {
            teamData.push({ userId, subRole, invitedAt: new Date().toISOString() });
        }
        await saveTeamData(distributorId, teamData);

        return successResponse(res, { userId, subRole, label: SUB_ROLES[subRole].label }, "Role updated");
    } catch (error) {
        return errorResponse(res, "Failed to update role", 500, error);
    }
};

/**
 * PUT /distributor/team/:userId/toggle
 * Activate/deactivate team member
 */
const toggleMemberStatus = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { userId } = req.params;

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { userId: true, user: { select: { tenantId: true } } }
        });

        if (userId === distributor.userId) return errorResponse(res, "Cannot deactivate owner", 400);

        const targetUser = await prisma.user.findFirst({
            where: { id: userId, tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR' }
        });
        if (!targetUser) return errorResponse(res, "User not found", 404);

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { isActive: !targetUser.isActive }
        });

        return successResponse(res, { userId, isActive: updated.isActive }, `User ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
        return errorResponse(res, "Failed to toggle status", 500, error);
    }
};

/**
 * DELETE /distributor/team/:userId
 * Remove team member
 */
const removeMember = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        const { userId } = req.params;

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { userId: true, user: { select: { tenantId: true } } }
        });

        if (userId === distributor.userId) return errorResponse(res, "Cannot remove owner", 400);

        const targetUser = await prisma.user.findFirst({
            where: { id: userId, tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR' }
        });
        if (!targetUser) return errorResponse(res, "User not found", 404);

        // Deactivate instead of delete (preserve audit trail)
        await prisma.user.update({ where: { id: userId }, data: { isActive: false } });

        // Remove from team settings
        const key = `DIST_TEAM_${distributorId}`;
        const setting = await prisma.systemSettings.findUnique({ where: { key } });
        let teamData = [];
        try { teamData = setting?.value ? JSON.parse(setting.value) : []; } catch (e) { }
        teamData = teamData.filter(m => m.userId !== userId);
        await saveTeamData(distributorId, teamData);

        return successResponse(res, null, "Member removed");
    } catch (error) {
        return errorResponse(res, "Failed to remove member", 500, error);
    }
};

/**
 * GET /distributor/team/my-permissions
 * Get current user's permissions
 */
const getMyPermissions = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { userId: true, companyName: true }
        });

        const isOwner = req.user.userId === distributor.userId;

        // Get org hierarchy position (primary source of role)
        const orgKey = `DIST_ORG_${distributorId}`;
        const orgSetting = await prisma.systemSettings.findUnique({ where: { key: orgKey } });
        let orgNodes = [];
        try { orgNodes = orgSetting?.value ? JSON.parse(orgSetting.value) : []; } catch (e) { }

        const myNode = orgNodes.find(n => n.userId === req.user.userId);

        // Determine effective role: org position takes priority over team subRole
        let effectiveRole = 'VIEWER';
        if (isOwner) {
            effectiveRole = 'OWNER';
        } else if (myNode?.position && SUB_ROLES[myNode.position]) {
            // User has org position → use that as their role
            effectiveRole = myNode.position;
        } else {
            // Fallback to team subRole (for users not yet in org chart)
            const teamSubRole = await getUserSubRole(req.user.userId, distributorId);
            effectiveRole = teamSubRole || 'VIEWER';
        }

        const roleInfo = SUB_ROLES[effectiveRole] || SUB_ROLES.VIEWER;

        // Get subordinates
        const subordinateIds = orgNodes.filter(n => n.reportTo === req.user.userId).map(n => n.userId);
        let subordinates = [];
        if (subordinateIds.length > 0) {
            const subUsers = await prisma.user.findMany({ where: { id: { in: subordinateIds } }, select: { id: true, name: true } });
            subordinates = subUsers;
        }

        // Get manager
        let manager = null;
        if (myNode?.reportTo) {
            const mgrUser = await prisma.user.findUnique({ where: { id: myNode.reportTo }, select: { id: true, name: true } });
            const mgrNode = orgNodes.find(n => n.userId === myNode.reportTo);
            manager = mgrUser ? { id: mgrUser.id, name: mgrUser.name, position: mgrNode?.position || null } : null;
        }

        return successResponse(res, {
            subRole: effectiveRole,
            permissions: roleInfo.permissions,
            isOwner,
            label: roleInfo.label,
            level: roleInfo.level,
            position: myNode ? {
                code: myNode.position,
                title: roleInfo.label,
                level: roleInfo.level,
                territory: myNode.territory || null,
            } : null,
            manager,
            subordinates,
            subordinateCount: subordinates.length,
            companyName: distributor.companyName,
        });
    } catch (error) {
        return errorResponse(res, "Failed to get permissions", 500, error);
    }
};

/**
 * GET /distributor/team/activity
 * Recent team activity (login history)
 */
const getTeamActivity = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId) return errorResponse(res, "Not a distributor", 403);

        const distributor = await prisma.distributor.findUnique({
            where: { id: distributorId },
            select: { user: { select: { tenantId: true } } }
        });

        const recentLogins = await prisma.loginHistory.findMany({
            where: {
                user: { tenantId: distributor.user.tenantId, role: 'DISTRIBUTOR' }
            },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { loginAt: 'desc' },
            take: 30
        });

        return successResponse(res, recentLogins);
    } catch (error) {
        return errorResponse(res, "Failed to fetch activity", 500, error);
    }
};

module.exports = {
    getTeamMembers,
    inviteTeamMember,
    updateMemberRole,
    toggleMemberStatus,
    removeMember,
    getMyPermissions,
    getTeamActivity,
    SUB_ROLES
};
