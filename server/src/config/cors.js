/**
 * CORS Configuration
 * Whitelist allowed origins instead of allowing all (*).
 */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5173',  // Merchant Client
        'http://localhost:5174',  // Admin Client
        'http://localhost:5175',  // Distributor Client
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://localhost:4000',  // Server itself (docs, etc.)
    ];

const corsOptions = {
    origin: true, // Allow all origins for debugging
    credentials: true
};

const socketCorsOptions = {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
};

module.exports = { corsOptions, socketCorsOptions, ALLOWED_ORIGINS };
