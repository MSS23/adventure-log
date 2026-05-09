import { NextResponse, type NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// ============================================
// Rate Limiting Configuration
// ============================================
interface RateLimitRecord {
  count: number
  timestamp: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupRateLimitStore(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.timestamp > windowMs) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

const RATE_LIMITS = {
  api: { limit: 100, windowMs: 15 * 60 * 1000 },
  auth: { limit: 5, windowMs: 15 * 60 * 1000 },
  upload: { limit: 50, windowMs: 60 * 60 * 1000 },
  webhook: { limit: 1000, windowMs: 60 * 1000 },
}

function checkRateLimit(
  ip: string,
  pathname: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  cleanupRateLimitStore(windowMs)

  const key = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now - record.timestamp > windowMs) {
    rateLimitStore.set(key, { count: 1, timestamp: now })
    return { allowed: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count }
}

// ============================================
// Routes Configuration
// ============================================
//
// PROTECTED_ROUTES gets gated by Clerk's auth.protect() — unauthenticated
// requests redirect to Clerk's hosted sign-in. Everything else (landing,
// public profiles, embeds, the webhook itself) is open.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/albums(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/globe(.*)',
  '/feed(.*)',
  '/setup(.*)',
  '/passport(.*)',
  '/wishlist(.*)',
  '/trips(.*)',
  '/notifications(.*)',
  '/saved(.*)',
  '/activity(.*)',
  '/explore(.*)',
  '/achievements(.*)',
  '/countries(.*)',
  '/followers(.*)',
  '/following(.*)',
  '/leaderboard(.*)',
  '/organize(.*)',
  '/search(.*)',
  '/analytics(.*)',
  '/travel-twins(.*)',
])

// ============================================
// Clerk + custom middleware
// ============================================
export default clerkMiddleware(async (auth, request: NextRequest) => {
  const response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  // Auth gate — Clerk redirects to its sign-in page when needed.
  if (isProtectedRoute(request)) {
    await auth.protect()
  }

  // ----------------------------------------------------------------
  // Rate limiting (API only)
  // ----------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    let rateConfig = RATE_LIMITS.api
    if (pathname.startsWith('/api/webhooks/')) {
      rateConfig = RATE_LIMITS.webhook
    } else if (pathname.startsWith('/api/auth')) {
      rateConfig = RATE_LIMITS.auth
    } else if (pathname.includes('/upload')) {
      rateConfig = RATE_LIMITS.upload
    }

    const { allowed, remaining } = checkRateLimit(
      ip,
      pathname,
      rateConfig.limit,
      rateConfig.windowMs,
    )

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateConfig.windowMs / 1000)),
            'X-RateLimit-Limit': String(rateConfig.limit),
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    response.headers.set('X-RateLimit-Limit', String(rateConfig.limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
  }

  // ----------------------------------------------------------------
  // Global security headers
  // ----------------------------------------------------------------
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload',
  )
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
  )
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // X-Frame-Options: allow embedding only on /embed routes
  if (!pathname.startsWith('/embed')) {
    response.headers.set('X-Frame-Options', 'DENY')
  }

  // ----------------------------------------------------------------
  // CSRF protection for state-changing API calls.
  // Webhooks are exempt — they're verified via Svix signature instead.
  // ----------------------------------------------------------------
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/webhooks/')
  ) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (origin && host && !origin.includes(host)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  return response
})

export const config = {
  matcher: [
    /*
     * Skip Next.js internals and all static files, unless found in search params.
     * Always run for API routes.
     */
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
