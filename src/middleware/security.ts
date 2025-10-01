/**
 * Security Middleware for Adventure Log
 *
 * Implements security headers, rate limiting, and request validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { securityHeaders, rateLimitConfig } from '@/lib/config/security'

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Rate limiting implementation
 */
export function rateLimit(
  request: NextRequest,
  config: { windowMs: number; max: number }
): { limited: boolean; remainingRequests: number; resetTime: number } {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const key = `${ip}:${request.nextUrl.pathname}`
  const now = Date.now()

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
  }

  // Increment request count
  entry.count++

  return {
    limited: entry.count > config.max,
    remainingRequests: Math.max(0, config.max - entry.count),
    resetTime: entry.resetTime,
  }
}

/**
 * Validate request for suspicious activity
 */
export function validateRequest(request: NextRequest): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []
  const url = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''

  // Check for common attack patterns in URL
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /eval\(/i,        // Code injection
    /javascript:/i,   // JavaScript protocol
  ]

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(url) || pattern.test(userAgent)) {
      issues.push('Suspicious patterns detected in request')
    }
  })

  // Check for missing required headers
  if (!userAgent) {
    issues.push('Missing User-Agent header')
  }

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
  ]

  const isBot = suspiciousUserAgents.some(pattern => pattern.test(userAgent))
  if (isBot && !url.startsWith('/api/public')) {
    issues.push('Bot detected accessing protected routes')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(
  type: 'rate_limit' | 'suspicious_activity' | 'authentication_failure' | 'file_upload_error',
  details: {
    ip?: string
    userAgent?: string
    path?: string
    userId?: string
    message?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    type,
    severity: details.severity || 'medium',
    ...details,
  }

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.warn('🚨 Security Event:', logEntry)
  }

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // In production, integrate with monitoring service (e.g., Sentry, LogRocket)
    // monitoringService.captureSecurityEvent(logEntry)
  }
}

/**
 * Main security middleware function
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  const response = NextResponse.next()

  // Apply security headers to all responses
  applySecurityHeaders(response)

  // Validate request for suspicious activity
  const validation = validateRequest(request)
  if (!validation.valid) {
    logSecurityEvent('suspicious_activity', {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      path: request.nextUrl.pathname,
      message: validation.issues.join(', '),
      severity: 'high',
    })

    // Block suspicious requests
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Apply rate limiting based on route
  let rateLimitResult
  const path = request.nextUrl.pathname

  if (path.startsWith('/api/auth')) {
    rateLimitResult = rateLimit(request, rateLimitConfig.auth)
  } else if (path.startsWith('/api/upload')) {
    rateLimitResult = rateLimit(request, rateLimitConfig.upload)
  } else if (path.startsWith('/api/')) {
    rateLimitResult = rateLimit(request, rateLimitConfig.api)
  }

  if (rateLimitResult?.limited) {
    logSecurityEvent('rate_limit', {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      path: request.nextUrl.pathname,
      message: 'Rate limit exceeded',
      severity: 'medium',
    })

    const rateLimitResponse = new NextResponse('Too Many Requests', { status: 429 })
    rateLimitResponse.headers.set('X-RateLimit-Limit', String(rateLimitConfig.api.max))
    rateLimitResponse.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remainingRequests))
    rateLimitResponse.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
    rateLimitResponse.headers.set('Retry-After', String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)))

    return rateLimitResponse
  }

  // Add rate limit headers to successful responses
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.api.max))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remainingRequests))
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
  }

  return response
}

/**
 * Authentication middleware for protected routes
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('supabase-auth-token')?.value

  if (!token) {
    // Redirect to login for protected routes
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Future: Validate token with Supabase for enhanced security
  // const { data: user, error } = await supabase.auth.getUser(token)
  // if (error || !user) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url))
  // }

  return null // Continue to route
}

/**
 * CORS middleware for API routes
 */
export function corsMiddleware(request: NextRequest): NextResponse | null {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })

    // Allow specific origins in production
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001']

    const origin = request.headers.get('origin')
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours

    return response
  }

  return null // Continue to route
}

// Export individual middleware functions for testing
export const middlewareFunctions = {
  applySecurityHeaders,
  rateLimit,
  validateRequest,
  logSecurityEvent,
  securityMiddleware,
  authMiddleware,
  corsMiddleware,
}

export default securityMiddleware