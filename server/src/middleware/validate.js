const { errorResponse } = require('../utils/response');

/**
 * Middleware factory to validate request body using Zod schema
 * @param {import('zod').ZodSchema} schema 
 */
const validate = (schema) => (req, res, next) => {
    try {
        // Parse and validate
        // We use req.body as the primary target for these validations
        schema.parse(req.body);
        next();
    } catch (error) {
        // ZodError structure: [{ path: ['field'], message: '...' }]
        const errors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));

        return errorResponse(res, "Validation Error", 400, { errors });
    }
};

module.exports = validate;
