const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
    console.log("🌱 Seeding Dummy Merchant...");

    const email = "toko.test@example.com";
    const waNumber = "6281200000001";
    
    // Check if exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log("User already exists.");
        return;
    }

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: "Toko Sejahtera Abadi",
            plan: 'FREE',
            subscriptionStatus: 'ACTIVE'
        }
    });

    // Create Store
    const store = await prisma.store.create({
        data: {
            tenantId: tenant.id,
            name: "Toko Sejahtera Abadi",
            waNumber: waNumber,
            location: "Jl. Merdeka No. 45, Jakarta",
            category: "Kelontong",
            isActive: true
        }
    });

    // Create User (Owner)
    const user = await prisma.user.create({
        data: {
            email: email,
            passwordHash: hashedPassword,
            name: "Budi Santoso",
            role: 'OWNER',
            tenantId: tenant.id,
            storeId: store.id
        }
    });

    console.log(`✅ Created Merchant: ${store.name} (${user.email})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
