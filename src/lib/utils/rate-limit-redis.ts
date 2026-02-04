import { Redis } from '@upstash/redis'

// Initialize Redis client (only if environment variables are set)
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
  }

  return redis
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Rate limit using Redis (distributed rate limiting)
 * Falls back gracefully if Redis is not configured
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  window: number // in seconds
): Promise<RateLimitResult> {
  const client = getRedisClient()

  // Fallback to in-memory if Redis not configured
  if (!client) {
    // Return success if Redis not configured (fail open)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + (window * 1000)
    }
  }

  const key = `ratelimit:${identifier}`

  try {
    const count = await client.incr(key)

    if (count === 1) {
      // First request, set expiration
      await client.expire(key, window)
    }

    const ttl = await client.ttl(key)
    const reset = Date.now() + (ttl * 1000)

    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open - allow request on error
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + (window * 1000)
    }
  }
}

/**
 * Sliding window rate limiter (more accurate)
 * Uses sorted sets to track requests within the window
 */
export async function rateLimitSlidingWindow(
  identifier: string,
  limit: number,
  window: number // in seconds
): Promise<RateLimitResult> {
  const client = getRedisClient()

  if (!client) {
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + (window * 1000)
    }
  }

  const key = `ratelimit:sliding:${identifier}`
  const now = Date.now()
  const clearBefore = now - (window * 1000)

  try {
    // Remove old entries
    await client.zremrangebyscore(key, 0, clearBefore)

    // Count recent requests
    const count = await client.zcard(key)

    if (count < limit) {
      // Add current request
      await client.zadd(key, { score: now, member: `${now}` })
      await client.expire(key, window)
    }

    const remaining = Math.max(0, limit - count - 1)

    return {
      success: count < limit,
      limit,
      remaining,
      reset: now + (window * 1000)
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: now + (window * 1000)
    }
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  reset: number
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', limit.toString())
  headers.set('X-RateLimit-Remaining', remaining.toString())
  headers.set('X-RateLimit-Reset', new Date(reset).toISOString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
