require('dotenv').config();
const logger = require('./config/logger');

// [SECURITY] Default to development if not set for easier local debugging
if (!process.env.NODE_ENV) {
    logger.warn('⚠️ NODE_ENV not set, defaulting to development');
    process.env.NODE_ENV = 'development';
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path'); // [FIX] Added path module
const bcrypt = require('bcrypt');

const compression = require('compression');
const rateLimit = require('express-rate-limit');

const reportRoutes = require('./routes/reportRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const authRoutes = require('./routes/authRoutes');
const referralRoutes = require('./routes/referralRoutes');
const prisma = require('./config/database'); // [FIX] Singleton Prisma
const { corsOptions } = require('./config/cors'); // [FIX] CORS whitelist

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
// Middleware
app.use(cors(corsOptions)); // [FIX] Whitelist origins from config
app.options('*', cors(corsOptions)); // [FIX] Enable Pre-Flight for all routes with credentials

app.use(helmet({
    crossOriginResourcePolicy: false, // [FIX] Allow resources to be loaded cross-origin
}));
app.use(compression()); // Gzip Compression

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // Limit each IP to 3000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// [SECURITY] Stricter limit for Auth (Login/Register)
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 attempts per minute
    message: { error: 'Too many login attempts, please try again after a minute' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.json({ limit: '50mb' })); // [FIX] Increase limit for Base64 uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // [FIX] Serve server/uploads
app.use('/docs', express.static(path.join(__dirname, '../../docs'))); // [NEW] Serve documentation

// Routes
app.get('/', (req, res) => {
    res.send('Rana POS Server is Running');
});

// API Root Check
app.get('/api', (req, res) => {
    res.json({ message: 'Rana POS API is ready', version: '1.0.0' });
});

// [NEW] Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            database: 'connected',
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
});

// Public Routes
try {
    app.use('/api/auth', authLimiter, authRoutes);
    logger.info('✅ Auth routes mounted');
} catch (e) { logger.error('❌ Failed to mount auth routes', e); }

// Protected Routes
try {
    app.use('/api/reports', reportRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/products', require('./routes/productRoutes'));
    app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
    app.use('/api/purchases', require('./routes/purchaseRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));
    app.use('/api/market', require('./routes/marketRoutes'));
    app.use('/api/system', require('./routes/systemRoutes'));
    app.use('/api/admin', require('./routes/adminRoutes'));
    app.use('/api/wallet', require('./routes/walletRoutes'));
    app.use('/api/inventory', require('./routes/inventoryRoutes'));
    app.use('/api/tickets', require('./routes/merchantTicketRoutes'));
    app.use('/api/wholesale', require('./routes/wholesaleRoutes'));
    app.use('/api/distributor', require('./routes/distributorRoutes'));
    app.use('/api/ppob', require('./routes/ppobRoutes'));
    app.use('/api/blog', require('./routes/blogRoutes'));
    app.use('/api/referral', referralRoutes);
    app.use('/api/community', require('./routes/communityRoutes'));
    app.use('/api/chat', require('./routes/chatRoutes'));
    app.use('/api/contact', require('./routes/contact'));
    app.use('/api/careers', require('./routes/careers'));
    app.use('/api/driver', require('./routes/driverRoutes'));
    app.use('/api/service-requests', require('./routes/serviceRequestRoutes'));
    logger.info('✅ All API modules mounted');
} catch (e) {
    logger.error('❌ Critical error mounting API modules', e);
}


const errorHandler = require('./middleware/errorHandler');

// Error Handler
app.use(errorHandler);

const http = require('http');
const { initSocket } = require('./socket');

const server = http.createServer(app);
initSocket(server);

async function ensureBlogSeed() {
    const count = await prisma.blogPost.count();
    if (count === 0) {
        await prisma.blogPost.createMany({
            data: [
                {
                    title: 'Memperkenalkan Rana POS: Kecerdasan Keuangan untuk UMKM',
                    slug: 'memperkenalkan-rana-pos',
                    summary: 'Platform POS modern dengan laporan keuangan otomatis dan manajemen stok real-time.',
                    content: '<h2>Kenapa Rana POS?</h2><p>Rana POS membantu UMKM mengambil keputusan berdasarkan data dengan laporan otomatis, manajemen stok, dan integrasi pembayaran.</p><p>Kami fokus pada kemudahan penggunaan dan performa.</p>',
                    imageUrl: 'https://images.unsplash.com/photo-1556742041-4b8b5cc5253f?q=80&w=1200&auto=format&fit=crop',
                    author: 'Tim Rana',
                    tags: ['product', 'umkm', 'pos'],
                    status: 'PUBLISHED',
                    publishedAt: new Date()
                },
                {
                    title: 'Tips Mengelola Stok Agar Tidak Kehabisan',
                    slug: 'tips-mengelola-stok',
                    summary: 'Strategi praktis untuk menjaga ketersediaan stok dan mengurangi dead stock.',
                    content: '<h2>Strategi Stok</h2><ul><li>Tetapkan min stock</li><li>Pantau pergerakan stok</li><li>Gunakan laporan harian</li></ul><p>Dengan Rana, semua insight tersedia secara otomatis.</p>',
                    imageUrl: 'https://images.unsplash.com/photo-1556767576-cfba2f8e7df5?q=80&w=1200&auto=format&fit=crop',
                    author: 'Operasional Rana',
                    tags: ['inventory', 'tips'],
                    status: 'PUBLISHED',
                    publishedAt: new Date()
                },
                {
                    title: 'Laporan Laba Rugi: Cara Membacanya untuk Aksi',
                    slug: 'laporan-laba-rugi',
                    summary: 'Memahami profit & loss agar bisa mengambil keputusan bisnis yang tepat.',
                    content: '<h2>Laba Rugi</h2><p>Ketahui pendapatan, biaya, dan margin. Rana menyediakan grafik dan ringkasan otomatis yang mudah dipahami.</p>',
                    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop',
                    author: 'Finance Rana',
                    tags: ['finance', 'reports'],
                    status: 'PUBLISHED',
                    publishedAt: new Date()
                }
            ]
        });
    }
}

async function ensureSuperAdminSeed() {
    const existing = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (existing > 0) return;
    const email = (process.env.ADMIN_EMAIL || 'admin@rana.id').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin!12345';
    const hashed = await bcrypt.hash(password, 10);
    const adminTenant = await prisma.tenant.upsert({
        where: { id: 'rana_admin_tenant' },
        update: {},
        create: {
            id: 'rana_admin_tenant',
            name: 'Rana Platform',
            plan: 'ENTERPRISE',
            subscriptionStatus: 'ACTIVE'
        }
    });
    await prisma.user.create({
        data: {
            email,
            passwordHash: hashed,
            name: 'Platform Admin',
            role: 'SUPER_ADMIN',
            tenantId: adminTenant.id,
            storeId: null
        }
    });
    logger.info(`[Seed] SUPER_ADMIN created: ${email}`);
}

async function cleanupOldChatMessages() {
    const CHAT_RETENTION_HOURS = parseInt(process.env.CHAT_RETENTION_HOURS || '168'); // [FIX] Default 7 days instead of 24h
    const cutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000);
    try {
        const deleted = await prisma.chatMessage.deleteMany({
            where: { createdAt: { lt: cutoff } }
        });
        if (deleted.count > 0) logger.info(`[Chat Retention] Cleaned up ${deleted.count} messages older than ${CHAT_RETENTION_HOURS}h`);
    } catch (_) {}
}

function scheduleChatRetention() {
    cleanupOldChatMessages().catch(() => {});
    setInterval(() => {
        cleanupOldChatMessages().catch(() => {});
    }, 60 * 60 * 1000);
}

process.on('uncaughtException', (err) => {
    const fs = require('fs');
    fs.writeFileSync('uncaught_exception.txt', err.stack || err.message);
    logger.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// [NEW] Graceful Shutdown
process.on('SIGTERM', async () => {
    logger.info('🛑 SIGTERM received. Shutting down gracefully...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('🛑 SIGINT received. Shutting down gracefully...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
});

if (require.main === module) {
    try {
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
            ensureBlogSeed().catch((e) => logger.error(e));
            ensureSuperAdminSeed().catch((e) => logger.error(e));
            scheduleChatRetention();
        });
    } catch (fatalError) {
        const fs = require('fs');
        fs.writeFileSync('fatal_startup_error.txt', fatalError.stack || fatalError.message);
        logger.error('FATAL STARTUP ERROR:', fatalError);
        process.exit(1);
    }
}

module.exports = { app, server };
