const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { getIo } = require('../socket');

const notifyAdmin = async (title, body) => {
    try {
        // Find Admin Tenant
        // We assume the ID is fixed as 'rana_admin_tenant' from the seed, 
        // but we can also look up by plan 'ENTERPRISE' or role 'SUPER_ADMIN' user's tenant.
        // For reliability, let's use the ID 'rana_admin_tenant' if it exists.
        const adminTenantId = 'rana_admin_tenant';

        // Check if tenant exists (just in case)
        const tenant = await prisma.tenant.findUnique({ where: { id: adminTenantId } });
        if (!tenant) {
            console.warn('Admin tenant not found, cannot create notification');
            return;
        }

        const notification = await prisma.notification.create({
            data: {
                tenantId: adminTenantId,
                title,
                body,
                isRead: false
            }
        });

        // Emit to socket room for this tenant
        // The Admin Client should join this room. 
        // We need to verify if Admin Client joins `tenant:${adminTenantId}` room.
        const io = getIo();
        if (io) {
            io.to(`tenant:${adminTenantId}`).emit('notification', notification);
        }

    } catch (error) {
        console.error('Failed to notify admin:', error);
    }
};

const notifyTenant = async (tenantId, title, body) => {
    try {
        const notification = await prisma.notification.create({
            data: {
                tenantId,
                title,
                body,
                isRead: false
            }
        });

        const io = getIo();
        if (io) {
            io.to(`tenant:${tenantId}`).emit('notification', notification);
        }
    } catch (error) {
        console.error(`Failed to notify tenant ${tenantId}:`, error);
    }
};

module.exports = {
    notifyAdmin,
    notifyTenant
};
