const { rateLimit: redisRateLimit } = require('../db/redis');
const logger = require('../utils/logger');
const { query } = require('../db/connection');

/**
 * Rate limiting middleware using Redis
 */
function createRateLimiter(options = {}) {
    const {
        windowMs = 60000, // 1 minute
        maxRequests = 100,
        keyPrefix = 'ratelimit',
        message = 'Too many requests, please try again later',
        skipSuccessfulRequests = false,
        skip = null
    } = options;

    return async (req, res, next) => {
        // Skip if condition provided
        if (skip && skip(req)) {
            return next();
        }

        // Generate rate limit key
        const identifier = req.user?.userId || req.ip;
        const key = `${keyPrefix}:${identifier}`;

        try {
            // Check rate limit
            const result = await redisRateLimit.check(key, maxRequests, Math.floor(windowMs / 1000));

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

            if (!result.allowed) {
                // Log violation
                logRateLimitViolation(req, identifier, req.path);

                res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));

                return res.status(429).json({
                    error: message,
                    retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
                });
            }

            next();
        } catch (error) {
            // If Redis fails, allow request but log error
            logger.error('Rate limiter error:', error);
            next();
        }
    };
}

/**
 * Log rate limit violations to database
 */
async function logRateLimitViolation(req, identifier, endpoint) {
    try {
        await query(
            `INSERT INTO rate_limit_violations (user_id, ip_address, endpoint, first_attempt_at, last_attempt_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (ip_address, endpoint)
             DO UPDATE SET
                 attempts = rate_limit_violations.attempts + 1,
                 last_attempt_at = CURRENT_TIMESTAMP`,
            [req.user?.userId, req.ip, endpoint]
        );
    } catch (error) {
        logger.error('Failed to log rate limit violation:', error);
    }
}

/**
 * Predefined rate limiters for common use cases
 */
const rateLimiters = {
    // General API rate limit - 100 requests per minute
    api: createRateLimiter({
        windowMs: 60000,
        maxRequests: 100,
        keyPrefix: 'api'
    }),

    // Stricter limit for authentication endpoints - 5 requests per 15 minutes
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        keyPrefix: 'auth',
        message: 'Too many authentication attempts, please try again later'
    }),

    // File upload limit - 10 uploads per hour
    upload: createRateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        keyPrefix: 'upload',
        message: 'Too many uploads, please try again later'
    }),

    // Export limit - 20 exports per hour
    export: createRateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
        keyPrefix: 'export',
        message: 'Too many export requests, please try again later'
    }),

    // Email limit - 10 emails per hour
    email: createRateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        keyPrefix: 'email',
        message: 'Too many email requests, please try again later'
    }),

    // Create diagram limit - 50 per hour
    createDiagram: createRateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: 50,
        keyPrefix: 'create-diagram'
    }),

    // Public API - 1000 requests per hour
    publicApi: createRateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: 1000,
        keyPrefix: 'public-api'
    })
};

module.exports = {
    createRateLimiter,
    rateLimiters
};
