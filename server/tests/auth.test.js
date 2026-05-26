const request = require('supertest');
const { app, server } = require('../src/index');
const prisma = require('../src/config/database');

describe('Auth Integration Tests', () => {
    
    // Cleanup after all tests
    afterAll(async () => {
        await prisma.$disconnect();
        server.close();
    });

    describe('POST /api/auth/login', () => {
        it('should return 400 if validation fails (empty body)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Validation Error');
        });

        it('should return 401 for non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@rana.id',
                    password: 'Password123!'
                });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'Password123!'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.data.errors[0].field).toBe('email');
        });
    });

    describe('POST /api/auth/register', () => {
        it('should validate password strength', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    businessName: 'Toko Test',
                    ownerName: 'Owner Test',
                    email: 'test@rana.id',
                    password: '123' // too short and weak
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('Validation Error');
        });
    });
});
