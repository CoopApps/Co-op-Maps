const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

/**
 * Connect to Redis
 */
async function connectRedis() {
    // Skip if Redis is not configured
    if (!process.env.REDIS_HOST) {
        logger.info('Redis not configured, caching disabled');
        return null;
    }

    try {
        redisClient = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Too many Redis reconnection attempts, giving up');
                        return new Error('Too many retries');
                    }
                    const delay = Math.min(retries * 100, 3000);
                    logger.info(`Reconnecting to Redis in ${delay}ms...`);
                    return delay;
                }
            },
            password: process.env.REDIS_PASSWORD || undefined
        });

        redisClient.on('error', (err) => {
            logger.error('Redis error:', err);
            isConnected = false;
        });

        redisClient.on('connect', () => {
            logger.info('Connected to Redis');
            isConnected = true;
        });

        redisClient.on('disconnect', () => {
            logger.warn('Redis disconnected');
            isConnected = false;
        });

        await redisClient.connect();

        return redisClient;
    } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        redisClient = null;
        isConnected = false;
        return null;
    }
}

/**
 * Get Redis client
 */
function getRedisClient() {
    return redisClient;
}

/**
 * Check if Redis is connected
 */
function isRedisConnected() {
    return isConnected && redisClient !== null;
}

/**
 * Disconnect from Redis
 */
async function disconnectRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Disconnected from Redis');
        } catch (error) {
            logger.error('Error disconnecting from Redis:', error);
        }
        redisClient = null;
        isConnected = false;
    }
}

/**
 * Cache helper functions
 */
const cache = {
    /**
     * Get a value from cache
     */
    async get(key) {
        if (!isRedisConnected()) {
            return null;
        }

        try {
            const value = await redisClient.get(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Set a value in cache with optional TTL (in seconds)
     */
    async set(key, value, ttl = 3600) {
        if (!isRedisConnected()) {
            return false;
        }

        try {
            const serialized = JSON.stringify(value);
            if (ttl > 0) {
                await redisClient.setEx(key, ttl, serialized);
            } else {
                await redisClient.set(key, serialized);
            }
            return true;
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Delete a value from cache
     */
    async del(key) {
        if (!isRedisConnected()) {
            return false;
        }

        try {
            await redisClient.del(key);
            return true;
        } catch (error) {
            logger.error(`Cache del error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Delete multiple keys matching a pattern
     */
    async delPattern(pattern) {
        if (!isRedisConnected()) {
            return false;
        }

        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return true;
        } catch (error) {
            logger.error(`Cache delPattern error for pattern ${pattern}:`, error);
            return false;
        }
    },

    /**
     * Check if a key exists
     */
    async exists(key) {
        if (!isRedisConnected()) {
            return false;
        }

        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Set expiration on a key
     */
    async expire(key, ttl) {
        if (!isRedisConnected()) {
            return false;
        }

        try {
            await redisClient.expire(key, ttl);
            return true;
        } catch (error) {
            logger.error(`Cache expire error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Increment a counter
     */
    async incr(key) {
        if (!isRedisConnected()) {
            return 0;
        }

        try {
            return await redisClient.incr(key);
        } catch (error) {
            logger.error(`Cache incr error for key ${key}:`, error);
            return 0;
        }
    },

    /**
     * Get or set pattern - try to get from cache, if not found run callback and cache result
     */
    async getOrSet(key, callback, ttl = 3600) {
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Not in cache, execute callback
        try {
            const result = await callback();
            // Cache the result
            await this.set(key, result, ttl);
            return result;
        } catch (error) {
            logger.error(`Cache getOrSet error for key ${key}:`, error);
            throw error;
        }
    }
};

/**
 * Rate limiting helper using Redis
 */
const rateLimit = {
    /**
     * Check if action is allowed based on rate limit
     * @param {string} key - Unique identifier (e.g., user ID, IP)
     * @param {number} maxAttempts - Maximum allowed attempts
     * @param {number} windowSeconds - Time window in seconds
     * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
     */
    async check(key, maxAttempts, windowSeconds) {
        if (!isRedisConnected()) {
            // If Redis is not available, allow the action
            return { allowed: true, remaining: maxAttempts, resetAt: Date.now() + windowSeconds * 1000 };
        }

        try {
            const limiterKey = `ratelimit:${key}`;
            const current = await redisClient.incr(limiterKey);

            if (current === 1) {
                // First request in window
                await redisClient.expire(limiterKey, windowSeconds);
            }

            const ttl = await redisClient.ttl(limiterKey);
            const resetAt = Date.now() + (ttl * 1000);

            return {
                allowed: current <= maxAttempts,
                remaining: Math.max(0, maxAttempts - current),
                resetAt
            };
        } catch (error) {
            logger.error(`Rate limit check error for key ${key}:`, error);
            // On error, allow the action
            return { allowed: true, remaining: maxAttempts, resetAt: Date.now() + windowSeconds * 1000 };
        }
    },

    /**
     * Reset rate limit for a key
     */
    async reset(key) {
        if (!isRedisConnected()) {
            return true;
        }

        try {
            await redisClient.del(`ratelimit:${key}`);
            return true;
        } catch (error) {
            logger.error(`Rate limit reset error for key ${key}:`, error);
            return false;
        }
    }
};

module.exports = {
    connectRedis,
    disconnectRedis,
    getRedisClient,
    isRedisConnected,
    cache,
    rateLimit
};
