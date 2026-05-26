const logger = require('../config/logger');
const { errorResponse } = require('../utils/response');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    // 1. Log the error for internal tracking
    logger.error({
        msg: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        user: req.user ? req.user.userId : 'anonymous'
    });

    // 2. Handle specific known errors (e.g. Prisma, JWT, Zod)
    
    // Prisma Errors
    if (err.code && err.code.startsWith('P')) {
        return errorResponse(res, "Database Error", 500, {
            code: err.code,
            meta: err.meta
        });
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return errorResponse(res, "Authentication failed", 401);
    }

    // 3. Fallback for unhandled errors
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? "Internal Server Error" 
        : err.message;

    return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;
