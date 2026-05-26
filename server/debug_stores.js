const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Inspecting Stores...");
    
    const stores = await prisma.store.findMany({
        include: {
            tenant: { select: { name: true } },
            users: { select: { name: true, role: true } }
        }
    });

    console.log(`Found ${stores.length} stores.`);
    stores.forEach(s => {
        console.log(`Store: ${s.name} (Tenant: ${s.tenant?.name})`);
        console.log(`  Users: ${s.users.map(u => u.name).join(', ')}`);
    });

    console.log("\n🔍 Inspecting Users...");
    const users = await prisma.user.findMany({
        select: { name: true, role: true, tenantId: true }
    });
    console.log(`Found ${users.length} users.`);
    users.forEach(u => console.log(`User: ${u.name} [${u.role}] (TenantId: ${u.tenantId})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
