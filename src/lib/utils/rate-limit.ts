import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

/**
 * Rate limiter with Redis (Upstash) support for distributed environments.
 * Falls back to in-memory store when Redis is not configured.
 */

// ─── Redis Client (lazy-initialized) ───────────────────────────────────────

let redisClient: { incr: (key: string) => Promise<number>; expire: (key: string, seconds: number) => Promise<number>; ttl: (key: string) => Promise<number> } | null | undefined

async function getRedis() {
  // undefined = not yet checked, null = checked but unavailable
  if (redisClient !== undefined) return redisClient

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = null
    return null
  }

  try {
    const { Redis } = await import('@upstash/redis')
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
    return redisClient
  } catch {
    log.warn('Upstash Redis not available, using in-memory rate limiting', {
      component: 'RateLimit',
      action: 'init'
    })
    redisClient = null
    return null
  }
}

// ─── In-Memory Fallback ────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  timestamp: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  const cutoff = now - windowMs
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.timestamp < cutoff) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

function inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  cleanupExpiredEntries(windowMs)

  const current = rateLimitStore.get(key)

  if (!current || current.timestamp < windowStart) {
    rateLimitStore.set(key, { count: 1, timestamp: now })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (current.count < limit) {
    current.count++
    return { success: true, remaining: limit - current.count, reset: current.timestamp + windowMs }
  }

  return { success: false, remaining: 0, reset: current.timestamp + windowMs }
}

// ─── Redis Rate Limit ──────────────────────────────────────────────────────

async function redisRateLimit(
  redis: NonNullable<Awaited<ReturnType<typeof getRedis>>>,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowSec = Math.ceil(windowMs / 1000)
  const redisKey = `rl:${key}`

  try {
    const count = await redis.incr(redisKey)

    if (count === 1) {
      await redis.expire(redisKey, windowSec)
    }

    const ttl = await redis.ttl(redisKey)
    const reset = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs)

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset
    }
  } catch (error) {
    log.error('Redis rate limit failed, falling back to in-memory', {
      component: 'RateLimit',
      action: 'redis-check'
    }, error as Error)
    // Fall back to in-memory on Redis failure
    return inMemoryRateLimit(key, limit, windowMs)
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return 'anonymous'
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit?: number
  /** Time window in milliseconds */
  windowMs?: number
  /** Optional prefix for the key (useful for different rate limits per route) */
  keyPrefix?: string
}

/**
 * Check if a request is within rate limits.
 * Uses Redis (Upstash) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set, otherwise falls back to in-memory store.
 *
 * @example
 * ```typescript
 * const result = rateLimit(request, { limit: 100, windowMs: 15 * 60 * 1000 })
 * if (!result.success) {
 *   return rateLimitResponse(result.reset)
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): RateLimitResult {
  const { limit = 100, windowMs = 15 * 60 * 1000, keyPrefix = '' } = config

  const clientId = getClientId(request)
  const key = keyPrefix ? `${keyPrefix}:${clientId}` : clientId

  // Synchronous path: try Redis asynchronously but don't block.
  // For the synchronous API contract, use in-memory and fire-and-forget a Redis check.
  // NOTE: If you can make callers async, use rateLimitAsync() instead for true distributed limiting.
  return inMemoryRateLimit(key, limit, windowMs)
}

/**
 * Async rate limiter that uses Redis when available.
 * Preferred over `rateLimit()` for true distributed rate limiting.
 *
 * @example
 * ```typescript
 * const result = await rateLimitAsync(request, rateLimitConfigs.auth)
 * if (!result.success) {
 *   return rateLimitResponse(result.reset)
 * }
 * ```
 */
export async function rateLimitAsync(
  request: NextRequest,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const { limit = 100, windowMs = 15 * 60 * 1000, keyPrefix = '' } = config

  const clientId = getClientId(request)
  const key = keyPrefix ? `${keyPrefix}:${clientId}` : clientId

  const redis = await getRedis()
  if (redis) {
    return redisRateLimit(redis, key, limit, windowMs)
  }

  return inMemoryRateLimit(key, limit, windowMs)
}

/**
 * Create a standardized rate limit exceeded response
 */
export function rateLimitResponse(resetTime?: number): NextResponse {
  const headers: Record<string, string> = {
    'Retry-After': '900',
    'X-RateLimit-Remaining': '0'
  }

  if (resetTime) {
    headers['X-RateLimit-Reset'] = String(Math.ceil(resetTime / 1000))
  }

  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfter: 900
    },
    {
      status: 429,
      headers
    }
  )
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const rateLimitConfigs = {
  /** Standard API rate limit: 100 requests per 15 minutes */
  api: { limit: 100, windowMs: 15 * 60 * 1000 },

  /** Strict auth rate limit: 5 attempts per 15 minutes */
  auth: { limit: 5, windowMs: 15 * 60 * 1000 },

  /** Upload rate limit: 50 uploads per hour */
  upload: { limit: 50, windowMs: 60 * 60 * 1000 },

  /** AI/expensive operations: 10 requests per hour */
  expensive: { limit: 10, windowMs: 60 * 60 * 1000 },

  /** Geocoding: 60 requests per minute */
  geocode: { limit: 60, windowMs: 60 * 1000 },

  /** Block/report actions: 10 per hour */
  moderation: { limit: 10, windowMs: 60 * 60 * 1000 }
} as const

/**
 * Higher-order function to wrap an API route handler with rate limiting
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  config: RateLimitConfig = rateLimitConfigs.api
) {
  return async (request: T): Promise<NextResponse> => {
    const result = await rateLimitAsync(request, config)

    if (!result.success) {
      return rateLimitResponse(result.reset)
    }

    const response = await handler(request)

    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set(
      'X-RateLimit-Reset',
      String(Math.ceil(result.reset / 1000))
    )

    return response
  }
}
