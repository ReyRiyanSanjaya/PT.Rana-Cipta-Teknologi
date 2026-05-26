const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Database...');

    // 1. Create Tenant (UMKM Demo)
    // Check if exists
    let tenant = await prisma.tenant.findFirst({ where: { name: 'Kopi Kenangan Demo' } });

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Kopi Kenangan Demo',
                plan: 'PREMIUM',
                subscriptionStatus: 'ACTIVE',
                // Trial ends in 30 days
                trialEndsAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
            }
        });
        console.log('✅ Created Tenant:', tenant.name);
    } else {
        console.log('ℹ️ Tenant already exists:', tenant.name);
    }

    // 2. Create User (Merchant Owner)
    const merchantEmail = 'merchant@rana.com';
    const rawPassword = 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const merchantUser = await prisma.user.upsert({
        where: { email: merchantEmail },
        update: {
            passwordHash: hashedPassword, // Force update password
        },
        create: {
            email: merchantEmail,
            name: 'Merchant Owner',
            passwordHash: hashedPassword,
            role: 'OWNER',
            tenantId: tenant.id
        },
    });
    console.log(`✅ Created Merchant: ${merchantEmail} / ${rawPassword}`);

    // 3. Create User (Super Admin Platform)
    // Super Admin might not have a tenant, OR belongs to a system tenant. 
    // For simplicity, let's allow null tenantId for Super Admin if schema allows, 
    // OR create a System Tenant.
    // Checking schema: tenantId is String (required) or String? (optional).
    // Let's assume user.tenantId is required based on schema context usually.
    // If required, we use the same tenant or a special one. 
    // Safe bet: modify schema to make tenantId optional for Super Admin, 
    // BUT for now, assign to the same tenant to avoid schema errors if strict.

    // Actually, looking at previous schema view, tenantId looks required on User?
    // Let's check schema first in next step if unsure, but I'll assume it's required for now
    // and just assign the same tenant but give SUPER_ADMIN role.

    const adminEmail = 'super@rana.com';
    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: 'SUPER_ADMIN',
            passwordHash: hashedPassword // Force update password
        },
        create: {
            email: adminEmail,
            name: 'Platform Administrator',
            passwordHash: hashedPassword,
            role: 'SUPER_ADMIN',
            tenantId: tenant.id
        },
    });
    console.log(`✅ Created Super Admin: ${adminEmail} / ${rawPassword}`);

    // 3. Create Store
    // Fix: Upsert by unique constraint or check first
    // waNumber is often unique. If so, use it. Or just check count.
    let targetStore = await prisma.store.findFirst({
        where: { waNumber: '628123456789' }
    });

    if (!targetStore) {
        targetStore = await prisma.store.create({
            data: {
                tenantId: tenant.id,
                name: 'Cabang Pusat - Jakarta',
                location: 'Jakarta Selatan',
                waNumber: '628123456789'
            }
        });
        console.log('✅ Created Store: Cabang Pusat');
    } else {
        console.log('ℹ️ Store already exists:', targetStore.name);
    }

    // 4. Create Subscription Packages
    const packages = [
        { name: 'Paket Bulanan', price: 49000, durationDays: 30, description: 'Billed Monthly' },
        { name: 'Paket 6 Bulan', price: 250000, durationDays: 180, description: 'Save 15%' },
        { name: 'Paket Tahunan', price: 450000, durationDays: 365, description: 'Best Value (Save 25%)' }
    ];

    for (const pkg of packages) {
        const existing = await prisma.subscriptionPackage.findFirst({ where: { name: pkg.name } });
        if (!existing) {
            await prisma.subscriptionPackage.create({ data: pkg });
            console.log(`✅ Created Subscription Package: ${pkg.name}`);
        } else {
            console.log(`ℹ️ Subscription Package already exists: ${pkg.name}`);
        }
    }
    // 5. Create Dummy Products
    const category = await prisma.category.upsert({
        where: { id: 'cat-kopi' }, // Simplification: UUID usually, but hardcoded for seed
        update: {},
        create: {
            id: 'cat-kopi',
            tenantId: tenant.id,
            name: 'Kopi',
        }
    });
    
    // We need to check if category already exists properly or use findFirst if ID is uuid
    // Let's rely on create if not exists logic more dynamically if needed, 
    // but for seed, creating a product is key.
    
    // Fix: Create Product
    const productKopi = await prisma.product.findFirst({ where: { name: 'Kopi Susu Gula Aren' } });
    let productId = productKopi?.id;

    if (!productKopi) {
        const newProd = await prisma.product.create({
            data: {
                tenantId: tenant.id,
                name: 'Kopi Susu Gula Aren',
                sellingPrice: 18000,
                basePrice: 12000,
                stock: 100,
                sku: 'KOPI-001',
                categoryId: category.id
            }
        });
        productId = newProd.id;
        console.log('✅ Created Product: Kopi Susu Gula Aren');
    }

    // 6. Create Dummy Transactions
    const txnCount = await prisma.transaction.count({ where: { tenantId: tenant.id } });
    if (txnCount === 0 && productId) {
        console.log('Creating dummy transactions...');
        const today = new Date();
        
        // Create 5 transactions
        for (let i = 0; i < 5; i++) {
            const txn = await prisma.transaction.create({
                data: {
                    tenantId: tenant.id,
                    storeId: targetStore.id,
                    cashierId: merchantUser.id,
                    totalAmount: 36000,
                    paymentMethod: 'CASH',
                    amountPaid: 50000,
                    change: 14000,
                    orderStatus: 'COMPLETED',
                    paymentStatus: 'PAID',
                    occurredAt: new Date(today.getTime() - i * 3600000), // Back in time 1 hour each
                    transactionItems: {
                        create: [
                            {
                                productId: productId,
                                quantity: 2,
                                price: 18000,
                                productName: 'Kopi Susu Gula Aren',
                                basePrice: 12000
                            }
                        ]
                    }
                }
            });
            console.log(`✅ Created Transaction: ${txn.id}`);
            
            // Update Daily Sales Summary
            const dateOnly = new Date(txn.occurredAt);
            dateOnly.setHours(0,0,0,0);
            
            // Simple upsert logic for summary (not atomic but ok for seed)
            const summary = await prisma.dailySalesSummary.findUnique({
                where: {
                    storeId_date: {
                        storeId: txn.storeId,
                        date: dateOnly
                    }
                }
            });

            if (summary) {
                await prisma.dailySalesSummary.update({
                    where: { id: summary.id },
                    data: {
                        totalSales: { increment: txn.totalAmount },
                        transactionCount: { increment: 1 }
                    }
                });
            } else {
                await prisma.dailySalesSummary.create({
                    data: {
                        tenantId: tenant.id,
                        storeId: txn.storeId,
                        date: dateOnly,
                        totalSales: txn.totalAmount,
                        transactionCount: 1
                    }
                });
            }
        }
    } else {
        console.log('ℹ️ Transactions already exist');
    }

    // 7. Create Default Chat Rooms (Community)
    const defaultRooms = [
        { name: 'Umum & Santai', icon: 'Coffee', type: 'public' },
        { name: 'Info Supplier', icon: 'Truck', type: 'public' },
        { name: 'Tips Marketing', icon: 'TrendingUp', type: 'public' },
        { name: 'Bantuan Aplikasi', icon: 'HelpCircle', type: 'public' }
    ];

    for (const room of defaultRooms) {
        const existing = await prisma.chatRoom.findFirst({ where: { name: room.name } });
        if (!existing) {
            await prisma.chatRoom.create({ data: room });
            console.log(`✅ Created Chat Room: ${room.name}`);
        } else {
            console.log(`ℹ️ Chat Room already exists: ${room.name}`);
        }
    }

    console.log('✅ Seeding Complete');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
