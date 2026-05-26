
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Subscription Requests...');

    // 1. Create a dummy tenant for the request
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Toko Sejahtera Abadi ' + Date.now(),
            plan: 'FREE',
            subscriptionStatus: 'TRIAL',
            users: {
                create: {
                    name: 'Budi Santoso',
                    email: `budi.${Date.now()}@example.com`,
                    passwordHash: 'hashed_password',
                    role: 'OWNER'
                }
            }
        }
    });

    // 2. Create Subscription Package if not exists
    let pkg = await prisma.subscriptionPackage.findFirst();
    if (!pkg) {
        pkg = await prisma.subscriptionPackage.create({
            data: {
                name: 'Premium Monthly',
                price: 50000,
                durationDays: 30,
                description: 'Full access for 30 days'
            }
        });
    }

    // 3. Create the request
    await prisma.subscriptionRequest.create({
        data: {
            tenantId: tenant.id,
            packageId: pkg.id,
            status: 'PENDING',
            proofUrl: 'https://via.placeholder.com/600x400.png?text=Bukti+Transfer', 
            selectedBank: {
                bankName: 'BCA',
                accountNumber: '1234567890',
                accountName: 'PT Rana Tech'
            }
        }
    });

    console.log(`Created Subscription Request for tenant: ${tenant.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
