import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, consider using Redis.
 */

interface RateLimitEntry {
  count: number
  timestamp: number
}

// In-memory store - Note: This won't work across multiple serverless instances
// For production scaling, integrate with Redis or a distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
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

/**
 * Get client identifier from request headers
 */
function getClientId(request: NextRequest): string {
  // Try various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a default identifier
  return 'anonymous'
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // Timestamp when the rate limit resets
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
 * Check if a request is within rate limits
 *
 * @param request - The Next.js request object
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and remaining requests
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
  const now = Date.now()
  const windowStart = now - windowMs

  // Cleanup expired entries periodically
  cleanupExpiredEntries(windowMs)

  const current = rateLimitStore.get(key)

  // No existing entry or entry is outside the window
  if (!current || current.timestamp < windowStart) {
    rateLimitStore.set(key, { count: 1, timestamp: now })
    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs
    }
  }

  // Within window but under limit
  if (current.count < limit) {
    current.count++
    return {
      success: true,
      remaining: limit - current.count,
      reset: current.timestamp + windowMs
    }
  }

  // Rate limited
  return {
    success: false,
    remaining: 0,
    reset: current.timestamp + windowMs
  }
}

/**
 * Create a standardized rate limit exceeded response
 *
 * @param resetTime - Optional timestamp when the rate limit resets
 * @returns NextResponse with 429 status and appropriate headers
 */
export function rateLimitResponse(resetTime?: number): NextResponse {
  const headers: Record<string, string> = {
    'Retry-After': '900', // 15 minutes in seconds
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
  geocode: { limit: 60, windowMs: 60 * 1000 }
} as const

/**
 * Higher-order function to wrap an API route handler with rate limiting
 *
 * @example
 * ```typescript
 * export const GET = withRateLimit(
 *   async (request) => {
 *     // Your route logic here
 *     return NextResponse.json({ data: 'success' })
 *   },
 *   rateLimitConfigs.api
 * )
 * ```
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  config: RateLimitConfig = rateLimitConfigs.api
) {
  return async (request: T): Promise<NextResponse> => {
    const result = rateLimit(request, config)

    if (!result.success) {
      return rateLimitResponse(result.reset)
    }

    const response = await handler(request)

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set(
      'X-RateLimit-Reset',
      String(Math.ceil(result.reset / 1000))
    )

    return response
  }
}
