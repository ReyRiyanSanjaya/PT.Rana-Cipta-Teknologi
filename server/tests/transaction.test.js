const request = require('supertest');
const { app, server } = require('../src/index');
const prisma = require('../src/config/database');

describe('Transaction Integration Tests', () => {
    
    let testUser;
    let testStore;
    let testProduct;
    let token;

    beforeAll(async () => {
        // Setup test data
        const tenant = await prisma.tenant.create({
            data: { name: 'Test Tenant', plan: 'ENTERPRISE' }
        });

        testStore = await prisma.store.create({
            data: { name: 'Test Store', tenantId: tenant.id }
        });

        testUser = await prisma.user.create({
            data: {
                email: `tester_${Date.now()}@rana.id`,
                passwordHash: 'hashed',
                name: 'Tester',
                role: 'OWNER',
                tenantId: tenant.id,
                storeId: testStore.id
            }
        });

        testProduct = await prisma.product.create({
            data: {
                name: 'Test Item',
                basePrice: 1000,
                sellingPrice: 1500,
                stock: 10,
                tenantId: tenant.id,
                storeId: testStore.id
            }
        });

        // Mock token (simplified for test)
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../src/config/secrets');
        token = jwt.sign({ 
            userId: testUser.id, 
            tenantId: tenant.id, 
            storeId: testStore.id,
            role: testUser.role 
        }, JWT_SECRET);
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.transactionItem.deleteMany({ where: { productId: testProduct.id } });
        await prisma.transaction.deleteMany({ where: { storeId: testStore.id } });
        await prisma.stock.deleteMany({ where: { storeId: testStore.id } });
        await prisma.product.deleteMany({ where: { id: testProduct.id } });
        await prisma.user.deleteMany({ where: { id: testUser.id } });
        await prisma.store.deleteMany({ where: { id: testStore.id } });
        await prisma.tenant.deleteMany({ where: { id: testUser.tenantId } });
        
        await prisma.$disconnect();
        server.close();
    });

    describe('POST /api/transactions/sync', () => {
        it('should sync a transaction and deduct stock', async () => {
            const offlineId = `offline_${Date.now()}`;
            const res = await request(app)
                .post('/api/transactions/sync')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    offlineId: offlineId,
                    occurredAt: new Date().toISOString(),
                    totalAmount: 1500,
                    paymentMethod: 'CASH',
                    items: [
                        {
                            productId: testProduct.id,
                            quantity: 2,
                            price: 1500
                        }
                    ]
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify stock deduction
            const updatedProduct = await prisma.product.findUnique({
                where: { id: testProduct.id }
            });
            expect(updatedProduct.stock).toBe(8); // 10 - 2
        });

        it('should handle idempotency (duplicate offlineId)', async () => {
            const offlineId = `duplicate_${Date.now()}`;
            const payload = {
                offlineId: offlineId,
                occurredAt: new Date().toISOString(),
                totalAmount: 1500,
                items: [{ productId: testProduct.id, quantity: 1, price: 1500 }]
            };

            // First sync
            await request(app)
                .post('/api/transactions/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(payload);

            // Second sync (duplicate)
            const res = await request(app)
                .post('/api/transactions/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(payload);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.data.status).toBe('ALREADY_SYNCED');
        });
    });
});
