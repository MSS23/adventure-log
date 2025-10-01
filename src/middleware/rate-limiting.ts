/**
 * Rate Limiting Middleware for Adventure Log
 *
 * Implements intelligent rate limiting for different routes with Redis-like storage fallback
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitConfig } from '@/lib/config/security'

// Simple in-memory store for rate limiting (in production, use Redis)
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map()

  constructor() {
    // Note: Removed setInterval cleanup for Edge Runtime compatibility
    // Cleanup now happens on-demand during increment operations
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key)
      }
    }
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now()

    // Perform on-demand cleanup to avoid memory leaks
    this.cleanup()

    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      const newEntry = { count: 1, resetTime: now + windowMs }
      this.store.set(key, newEntry)
      return newEntry
    }

    // Increment existing entry
    entry.count++
    this.store.set(key, entry)
    return entry
  }

  clear() {
    this.store.clear()
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore()

// Rate limit configurations by route pattern
const routeConfigs = {
  // API routes
  '/api/': rateLimitConfig.api,

  // Auth routes (stricter)
  '/api/auth/': rateLimitConfig.auth,
  '/auth/': rateLimitConfig.auth,

  // Upload routes
  '/api/upload/': rateLimitConfig.upload,
  '/api/albums/': rateLimitConfig.upload,

  // Story creation (moderate)
  '/api/stories/': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 story operations per 5 minutes
  },

  // Search routes
  '/api/search/': {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from headers (if authenticated)
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() :
             request.headers.get('x-real-ip') ||
             'unknown'

  return `ip:${ip}`
}

/**
 * Get rate limit config for a route
 */
function getRateLimitConfig(pathname: string): typeof rateLimitConfig.api {
  // Find the most specific matching route config
  const matchingRoutes = Object.keys(routeConfigs).filter(route =>
    pathname.startsWith(route)
  ).sort((a, b) => b.length - a.length) // Sort by specificity

  if (matchingRoutes.length > 0) {
    return routeConfigs[matchingRoutes[0] as keyof typeof routeConfigs]
  }

  // Default config for unmatched routes
  return {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
  }
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(request: NextRequest): {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
} {
  const { pathname } = request.nextUrl
  const clientId = getClientId(request)
  const config = getRateLimitConfig(pathname)

  // Create unique key for this client and route
  const key = `${clientId}:${pathname}`

  // Check current count
  const { count, resetTime } = rateLimitStore.increment(key, config.windowMs)

  const allowed = count <= config.max
  const remaining = Math.max(0, config.max - count)
  const retryAfter = allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000)

  return {
    allowed,
    limit: config.max,
    remaining,
    resetTime,
    retryAfter
  }
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(rateLimit: ReturnType<typeof checkRateLimit>): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
  }

  if (rateLimit.retryAfter) {
    headers['Retry-After'] = rateLimit.retryAfter.toString()
  }

  return headers
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(request: NextRequest): NextResponse | null {
  // Skip rate limiting for certain routes
  const { pathname } = request.nextUrl

  // Skip static assets
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|css|js)$/)) {
    return null
  }

  // Skip health checks
  if (pathname === '/api/health') {
    return null
  }

  // Check rate limit
  const rateLimit = checkRateLimit(request)
  const headers = createRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    // Rate limit exceeded
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimit.retryAfter} seconds.`,
        retryAfter: rateLimit.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    )
  }

  // Allow request but add rate limit headers
  const response = NextResponse.next()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Enhanced rate limiting with burst protection
 */
export function checkBurstProtection(request: NextRequest): boolean {
  const clientId = getClientId(request)

  // Check for burst activity (more than 10 requests in 10 seconds)
  const burstKey = `burst:${clientId}`
  const burstWindow = 10 * 1000 // 10 seconds
  const burstLimit = 10

  const burstEntry = rateLimitStore.increment(burstKey, burstWindow)

  return burstEntry.count <= burstLimit
}

/**
 * Adaptive rate limiting based on server load
 */
export function getAdaptiveRateLimit(baseConfig: typeof rateLimitConfig.api): typeof rateLimitConfig.api {
  // In production, this could check server metrics
  // For now, return base config
  return baseConfig
}

/**
 * Log rate limit violations for monitoring
 */
export function logRateLimitViolation(request: NextRequest, rateLimit: ReturnType<typeof checkRateLimit>) {
  const clientId = getClientId(request)
  const { pathname } = request.nextUrl

  // In production, send to monitoring service
  console.warn(`Rate limit exceeded: ${clientId} on ${pathname}`, {
    limit: rateLimit.limit,
    remaining: rateLimit.remaining,
    retryAfter: rateLimit.retryAfter,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  })
}

// Note: Removed process.on('exit') for Edge Runtime compatibility
// Cleanup now happens on-demand during rate limit operations