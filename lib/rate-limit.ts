import { getServerEnv, isRedisConfigured } from "./env";
import { logger } from "./logger";

// Rate limit configuration
export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

// Rate limit result
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

// In-memory store (fallback)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Redis client (if available)
interface RedisClient {
  eval(
    script: string,
    keys: string[],
    args: (string | number)[]
  ): Promise<unknown>;
  get(key: string): Promise<number | null>;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

let redisClient: RedisClient | null = null;

// Initialize Redis if configured
async function initializeRedis() {
  if (isRedisConfigured() && !redisClient) {
    try {
      const env = getServerEnv();
      if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        // Use REST-based Redis client for serverless compatibility
        const { Redis } = await import("@upstash/redis");
        redisClient = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        }) as RedisClient;
        logger.info("Redis rate limiting initialized (Upstash REST)");
      } else if (env.REDIS_URL) {
        // Standard Redis connection for traditional hosting
        logger.warn(
          "Standard Redis URL detected but no client implementation available. Using memory store."
        );
        logger.info(
          "To use Redis, add @upstash/redis package and configure UPSTASH_REDIS_REST_URL"
        );
      } else {
        logger.info("Redis not configured, using memory store");
      }
    } catch (error) {
      logger.warn("Failed to initialize Redis, falling back to memory store:", {
        error: error instanceof Error ? error.message : String(error),
      });
      redisClient = null;
    }
  }
}

// Default rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  auth: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many authentication attempts. Please try again in 1 minute.",
  },
  comments: {
    limit: 20,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many comments. Please slow down.",
  },
  uploads: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many uploads. Please wait before uploading more photos.",
  },
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    message: "API rate limit exceeded. Please slow down.",
  },
  likes: {
    limit: 50,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many likes. Please slow down.",
  },
  follows: {
    limit: 20,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many follow/unfollow actions. Please slow down.",
  },
} as const;

/**
 * Redis-based rate limiter implementation
 */
async function redisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const script = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local current_time = tonumber(ARGV[3])
    
    local current = redis.call('INCR', key)
    
    if current == 1 then
      redis.call('EXPIRE', key, window / 1000)
    end
    
    local ttl = redis.call('TTL', key)
    local reset_time = current_time + (ttl * 1000)
    
    return {current, limit - current, reset_time}
  `;

  try {
    if (!redisClient) {
      throw new Error("Redis client not available");
    }
    const result = (await redisClient.eval(
      script,
      [key],
      [config.limit, config.windowMs, Date.now()]
    )) as [number, number, number];

    const [totalRequests, remaining, resetTime] = result;

    return {
      success: totalRequests <= config.limit,
      remaining: Math.max(0, remaining),
      resetTime,
      totalRequests,
    };
  } catch (error) {
    logger.error("Redis rate limit error, falling back to memory:", { error });
    return memoryRateLimit(key, config);
  }
}

/**
 * In-memory rate limiter implementation (fallback)
 */
function memoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();

  // Clean up expired entries periodically
  if (memoryStore.size > 10000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetTime < now) {
        memoryStore.delete(k);
      }
    }
  }

  const record = memoryStore.get(key);

  if (!record || record.resetTime < now) {
    // First request or expired window
    const newRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    memoryStore.set(key, newRecord);

    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: newRecord.resetTime,
      totalRequests: 1,
    };
  }

  // Increment existing record
  record.count++;
  memoryStore.set(key, record);

  return {
    success: record.count <= config.limit,
    remaining: Math.max(0, config.limit - record.count),
    resetTime: record.resetTime,
    totalRequests: record.count,
  };
}

/**
 * Apply rate limiting with automatic Redis/Memory fallback
 */
export async function rateLimit(
  type: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  // Initialize Redis on first use
  if (!redisClient && isRedisConfigured()) {
    await initializeRedis();
  }

  const baseConfig = RATE_LIMIT_CONFIGS[type];
  const config = { ...baseConfig, ...customConfig };

  const keyGenerator =
    config.keyGenerator || ((id: string) => `rate_limit:${type}:${id}`);
  const key = keyGenerator(identifier);

  let result: RateLimitResult;

  if (redisClient) {
    result = await redisRateLimit(key, config);
  } else {
    result = memoryRateLimit(key, config);
  }

  // Log rate limit violations
  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    logger.warn("Rate limit exceeded:", {
      type,
      identifier,
      totalRequests: result.totalRequests,
      limit: config.limit,
      retryAfter,
    });
  }

  return result;
}

/**
 * Rate limit middleware helper
 * Throws an error if rate limit is exceeded
 */
export async function enforceRateLimit(
  type: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<void> {
  const result = await rateLimit(type, identifier, customConfig);

  if (!result.success) {
    const config = { ...RATE_LIMIT_CONFIGS[type], ...customConfig };
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    const error = new Error(config.message || "Rate limit exceeded");
    (error as any).retryAfter = retryAfter;
    (error as any).rateLimitType = type;
    (error as any).remaining = result.remaining;

    throw error;
  }
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  type: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string
): Promise<RateLimitResult | null> {
  const keyGenerator = (id: string) => `rate_limit:${type}:${id}`;
  const key = keyGenerator(identifier);

  try {
    if (redisClient) {
      const current = await redisClient.get(key);
      if (!current) return null;

      const ttl = await redisClient.ttl(key);
      const config = RATE_LIMIT_CONFIGS[type];

      return {
        success: current <= config.limit,
        remaining: Math.max(0, config.limit - current),
        resetTime: Date.now() + ttl * 1000,
        totalRequests: current,
      };
    } else {
      const record = memoryStore.get(key);
      if (!record) return null;

      const config = RATE_LIMIT_CONFIGS[type];
      return {
        success: record.count <= config.limit,
        remaining: Math.max(0, config.limit - record.count),
        resetTime: record.resetTime,
        totalRequests: record.count,
      };
    }
  } catch (error) {
    logger.error("Failed to get rate limit status:", { error: error });
    return null;
  }
}

/**
 * Clear rate limit for identifier (useful for testing or admin operations)
 */
export async function clearRateLimit(
  type: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string
): Promise<boolean> {
  const keyGenerator = (id: string) => `rate_limit:${type}:${id}`;
  const key = keyGenerator(identifier);

  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      memoryStore.delete(key);
    }

    logger.info("Rate limit cleared:", { type, identifier });
    return true;
  } catch (error) {
    logger.error("Failed to clear rate limit:", { error: error });
    return false;
  }
}

/**
 * Get rate limiting statistics (for monitoring)
 */
export async function getRateLimitStats(): Promise<{
  activeKeys: number;
  backend: "redis" | "memory";
  redisConnected: boolean;
}> {
  const stats = {
    activeKeys: 0,
    backend: (redisClient ? "redis" : "memory") as "redis" | "memory",
    redisConnected: !!redisClient,
  };

  try {
    if (redisClient) {
      // Count keys matching our pattern
      const keys = await redisClient.keys("rate_limit:*");
      stats.activeKeys = keys.length;
    } else {
      stats.activeKeys = memoryStore.size;
    }
  } catch (error) {
    logger.error("Failed to get rate limit stats:", { error: error });
  }

  return stats;
}

// Export for backward compatibility
export { rateLimit as checkRateLimit };

// Initialize on module load in production
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  initializeRedis().catch((err) =>
    logger.warn("Failed to initialize Redis on startup:", { error: err })
  );
}
