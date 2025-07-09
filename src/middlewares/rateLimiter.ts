import { Request, Response, NextFunction } from 'express'
import { createClient } from 'redis';
import { customRequest } from '../types/customRequest';

// Rate limit configuration
interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    maxRequests: number;  // Max requests per window
    skipSuccessfulRequests?: boolean;
}

// Default rate limit: 100 requests per 15 minutes
const DEFAULT_CONFIG: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false
};

// Create Redis client
const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined
    }
});

// Initialize Redis connection
let isRedisConnected = false;

const initRedis = async () => {
    if (!isRedisConnected) {
        client.on('error', err => console.log('Redis Client Error', err));
        client.on('connect', () => console.log('Redis client connected'));
        client.on('ready', () => {
            console.log('Redis client ready');
            isRedisConnected = true;
        });
        client.on('end', () => {
            console.log('Redis client disconnected');
            isRedisConnected = false;
        });

        await client.connect();
    }
};

// Rate limiter factory function
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    return async function rateLimiter(req: customRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            // Initialize Redis if not connected
            await initRedis();

            // Check if user is authenticated
            if (!req.user?.id) {
                res.status(401).json({
                    error: 'Authentication required for rate limiting'
                });
                return;
            }

            const userId = req.user.id;
            const key = `rate_limit:${userId}`;
            const now = Date.now();
            const windowStart = now - finalConfig.windowMs;

            // Use Redis pipeline for atomic operations
            const pipeline = client.multi();

            // Remove expired entries
            pipeline.zRemRangeByScore(key, 0, windowStart);

            // Count current requests in window
            pipeline.zCard(key);

            // Add current request
            pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

            // Set expiration on the key
            pipeline.expire(key, Math.ceil(finalConfig.windowMs / 1000));

            const results = await pipeline.exec();

            if (!results) {
                throw new Error('Redis pipeline execution failed');
            }

            // Get the count after removing expired entries but before adding current request
            const currentCount = results[1][1] as number;

            // Check if limit exceeded
            if (currentCount >= finalConfig.maxRequests) {            // Calculate reset time
                const oldestRequestScore = await client.zRange(key, 0, 0, { REV: true, BY: 'SCORE' });
                const resetTime = oldestRequestScore.length > 0
                    ? Math.ceil((parseFloat(oldestRequestScore[0].toString()) + finalConfig.windowMs) / 1000)
                    : Math.ceil((now + finalConfig.windowMs) / 1000);

                // Set rate limit headers
                res.set({
                    'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': resetTime.toString(),
                    'Retry-After': Math.ceil(finalConfig.windowMs / 1000).toString()
                });

                res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Try again in ${Math.ceil(finalConfig.windowMs / 1000)} seconds.`,
                    retryAfter: Math.ceil(finalConfig.windowMs / 1000)
                });
                return;
            }

            // Set rate limit headers for successful requests
            const remaining = Math.max(0, finalConfig.maxRequests - currentCount - 1);
            const resetTime = Math.ceil((now + finalConfig.windowMs) / 1000);

            res.set({
                'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': resetTime.toString()
            });

            next();

        } catch (error) {
            console.error('Rate limiter error:', error);
            // In case of Redis errors, allow the request to proceed
            // You might want to implement different behavior based on your requirements
            next();
        }
    };
}

// Export default rate limiter with default config
export const rateLimiter = createRateLimiter();

// Export rate limiter with custom configs for different endpoints
export const strictRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 20 // 20 requests per 10 minutes
});

export const lenientRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000 // 1000 requests per hour
});

// Cleanup function to close Redis connection
export const closeRedisConnection = async () => {
    if (isRedisConnected) {
        await client.quit();
        isRedisConnected = false;
    }
};
