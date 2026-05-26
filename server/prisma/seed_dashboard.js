
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Dashboard Data...');

    // 1. Get Tenants with Stores
    const tenants = await prisma.tenant.findMany({
        include: { stores: true }
    });

    for (const tenant of tenants) {
        if (tenant.stores.length === 0) {
            console.log(`Skipping tenant ${tenant.name} (No stores)`);
            continue;
        }

        console.log(`Seeding data for Tenant: ${tenant.name}`);
        const store = tenant.stores[0]; // Use first store

        // 2. Create Recent Transactions (Last 5 days)
        const paymentMethods = ['CASH', 'QRIS', 'TRANSFER'];
        
        for (let i = 0; i < 10; i++) { // 10 txns per tenant
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 5));
            
            const totalAmount = (Math.floor(Math.random() * 50) + 1) * 10000; // 10k - 500k
            
            try {
                // Try to create with a new item (requires product)
                // First get or create a product
                let product = await prisma.product.findFirst({ where: { storeId: store.id } });
                if (!product) {
                    product = await prisma.product.create({
                        data: {
                            tenantId: tenant.id,
                            storeId: store.id,
                            name: 'Sample Product ' + Math.floor(Math.random() * 1000),
                            basePrice: 15000,
                            sellingPrice: 20000
                        }
                    });
                }

                await prisma.transaction.create({
                    data: {
                        tenantId: tenant.id,
                        storeId: store.id,
                        totalAmount: totalAmount,
                        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                        amountPaid: totalAmount,
                        change: 0,
                        orderStatus: 'COMPLETED',
                        paymentStatus: 'PAID',
                        fulfillmentType: 'PICKUP',
                        occurredAt: date,
                        transactionItems: {
                            create: {
                                productId: product.id,
                                quantity: 1,
                                price: totalAmount,
                                productName: product.name
                            }
                        }
                    }
                });
            } catch (err) {
                console.error(`Failed to create txn for ${tenant.name}:`, err.message);
            }
        }
        console.log(`✅ Created Transactions for ${tenant.name}`);

        // 3. Create DailySalesSummary (Last 7 days)
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            d.setHours(0,0,0,0);
            
            // Check if exists
            const exists = await prisma.dailySalesSummary.findFirst({
                where: {
                    storeId: store.id,
                    date: d
                }
            });

            if (!exists) {
                await prisma.dailySalesSummary.create({
                    data: {
                        tenantId: tenant.id,
                        storeId: store.id,
                        date: d,
                        totalSales: (Math.floor(Math.random() * 100) + 50) * 10000,
                        totalTrans: Math.floor(Math.random() * 20) + 5
                    }
                });
            }
        }
        console.log(`✅ Created Daily Sales for ${tenant.name}`);

        // 4. Create Withdrawals
        await prisma.withdrawal.createMany({
            data: [
                {
                    storeId: store.id,
                    amount: 500000,
                    status: 'APPROVED',
                    bankName: 'BCA',
                    accountNumber: '1234567890',
                    createdAt: new Date(new Date().setDate(today.getDate() - 2))
                },
                {
                    storeId: store.id,
                    amount: 750000,
                    status: 'PENDING',
                    bankName: 'MANDIRI',
                    accountNumber: '0987654321',
                    createdAt: new Date()
                }
            ]
        });
        console.log(`✅ Created Withdrawals for ${tenant.name}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
