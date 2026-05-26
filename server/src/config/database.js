/**
 * Prisma Client Singleton
 * Prevents connection pool exhaustion in production (PM2 cluster mode).
 * All controllers/middleware MUST import prisma from this file.
 */
const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        log: ['warn', 'error'],
    });
} else {
    // In development, reuse the same instance across hot-reloads
    if (!global.__prisma) {
        global.__prisma = new PrismaClient({
            log: ['query', 'warn', 'error'],
        });
    }
    prisma = global.__prisma;
}

module.exports = prisma;
