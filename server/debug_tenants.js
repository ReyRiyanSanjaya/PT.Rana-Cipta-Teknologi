const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Inspecting Tenants and Users...");
    
    // 1. Get All Tenants with their Users and Roles
    const tenants = await prisma.tenant.findMany({
        include: {
            users: {
                select: { id: true, name: true, role: true, email: true }
            },
            stores: {
                select: { id: true, name: true }
            },
            wholesaleOrders: {
                select: { id: true, distributorId: true }
            }
        }
    });

    console.log(`Found ${tenants.length} tenants.`);
    
    tenants.forEach(t => {
        console.log(`\nTenant: ${t.name} (${t.id})`);
        console.log(`  Users: ${t.users.map(u => `${u.name} [${u.role}]`).join(', ')}`);
        console.log(`  Stores: ${t.stores.map(s => s.name).join(', ')}`);
        console.log(`  Orders: ${t.wholesaleOrders.length}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
