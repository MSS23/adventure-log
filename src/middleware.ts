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

// Auth bucket removed — there are no Supabase auth endpoints under /api/auth*
// since the Clerk migration. Everything else stays bucketed by API class.
const RATE_LIMITS = {
  api: { limit: 100, windowMs: 15 * 60 * 1000 },
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
// requests redirect to Clerk's hosted sign-in (or, for fetch/XHR, get a JSON
// 401 — see dataRequestUnauthorized below). Everything else (landing, public
// profiles, embeds, the webhook itself) is open.
//
// API routes are protected by default; only the explicitly listed public
// endpoints are exempt. Without this, hand-rolled auth checks in each API
// route are the only thing standing between the public internet and our data —
// regressions in those checks (or missed checks in new routes) would silently
// expose endpoints.
// Each entry below MUST verify its own auth (Bearer secret, signature, or
// "anonymous-allowed" telemetry). The middleware-level Clerk gate is bypassed,
// so a missing per-route check = unauthenticated state-changing endpoint =
// cross-tenant data leak. Add new entries with the auth scheme noted inline.
const PUBLIC_API_PATHS = [
  '/api/health',                  // public health probe; no state
  '/api/manifest',                // public PWA manifest; no state
  '/api/maintenance/cleanup',     // Bearer CRON_SECRET (see route.ts)
  '/api/email/notify',            // Bearer CRON_SECRET (see route.ts)
  '/api/push/send',               // Bearer CRON_SECRET (see route.ts)
  '/api/admin/apply-migrations',  // Bearer SUPABASE_SERVICE_ROLE_KEY + IP rate limit (see route.ts)
  '/api/errors',                  // anonymous telemetry; userId may be null
  '/api/monitoring/web-vitals',   // anonymous telemetry; userId may be null
] as const

const PUBLIC_API_PREFIXES = [
  '/api/webhooks/', // verified via Svix signature, not Clerk session
  '/api/public/', // explicitly public endpoints
] as const

function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_PATHS.includes(pathname as (typeof PUBLIC_API_PATHS)[number])) return true
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

const isProtectedRoute = createRouteMatcher([
  // App pages
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
  // All API routes — public ones are filtered out by isPublicApiPath() before
  // we call auth.protect(). Listing /api/(.*) here catches future routes
  // automatically (defense-in-depth) instead of relying on each new route to
  // remember to call auth() server-side.
  '/api/(.*)',
])

// ============================================
// Data-request detection
// ============================================
//
// When auth.protect() fires for a sign-in redirect, navigation requests get a
// 307 to Clerk's hosted page (correct UX). But fetch(), <img>, EventSource,
// and the service worker can't follow that redirect into HTML — they parse
// the response as JSON and explode with "Unexpected token <". Detect data
// requests via Sec-Fetch-* (Chromium/Firefox) plus Accept fallbacks (Safari,
// older clients) and return JSON 401 directly.
function isDataRequest(request: NextRequest): boolean {
  const headers = request.headers

  const dest = headers.get('sec-fetch-dest')
  if (dest && dest !== 'document' && dest !== 'iframe') {
    // Anything that isn't a top-level navigation or iframe load: fetch
    // (`empty`), images, scripts, styles, workers, etc. all want JSON-or-empty
    // — never an HTML redirect.
    return true
  }

  const mode = headers.get('sec-fetch-mode')
  if (mode === 'cors' || mode === 'no-cors' || mode === 'same-origin') {
    // CORS / fetch-style requests. (Top-level navigations are 'navigate'.)
    return true
  }

  // Safari + older clients: rely on Accept and X-Requested-With.
  if (headers.get('x-requested-with') === 'fetch' || headers.get('x-requested-with') === 'XMLHttpRequest') {
    return true
  }

  const accept = headers.get('accept') ?? ''
  // Browsers send `Accept: text/html,…` for navigations. fetch() defaults to
  // `Accept: */*` and explicit JSON callers send `application/json`. Treat
  // anything that doesn't actively want HTML as a data request.
  if (accept.includes('application/json')) return true
  if (!accept.includes('text/html') && accept !== '') return true

  return false
}

function dataRequestUnauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    {
      status: 401,
      headers: {
        // Defense in depth: tell intermediaries this 401 isn't cacheable.
        'Cache-Control': 'no-store',
      },
    },
  )
}

// ============================================
// Clerk + custom middleware
// ============================================
export default clerkMiddleware(async (auth, request: NextRequest) => {
  const response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  // ----------------------------------------------------------------
  // Auth gate
  // ----------------------------------------------------------------
  // /api/* is included in isProtectedRoute; we skip explicitly-public APIs
  // (webhooks, health, manifest) here so they don't get sent to sign-in.
  const isApiRoute = pathname.startsWith('/api/')
  const apiIsPublic = isApiRoute && isPublicApiPath(pathname)

  if (isProtectedRoute(request) && !apiIsPublic) {
    if (isApiRoute || isDataRequest(request)) {
      // Pre-empt Clerk's redirect: data clients can't follow a 307→Clerk and
      // would see HTML in their JSON parser. Issue a clean 401 ourselves.
      const { userId } = await auth()
      if (!userId) return dataRequestUnauthorized()
    } else {
      await auth.protect()
    }
  }

  // ----------------------------------------------------------------
  // Rate limiting (API only)
  // ----------------------------------------------------------------
  if (isApiRoute) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    let rateConfig = RATE_LIMITS.api
    if (pathname.startsWith('/api/webhooks/')) {
      rateConfig = RATE_LIMITS.webhook
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
  //
  // Webhooks are exempt because they're verified via Svix signature, not the
  // browser session — origin/host won't match. Any new webhook MUST be added
  // to this allowlist explicitly *and* verify its own request signature
  // server-side. A blanket `startsWith('/api/webhooks/')` skip would mean
  // dropping a new webhook into the directory accidentally creates an
  // unauthenticated state-changing endpoint.
  // ----------------------------------------------------------------
  const CSRF_EXEMPT_WEBHOOKS = new Set<string>([
    '/api/webhooks/clerk',
    // Add new webhook paths here as they're created. Each handler is
    // responsible for verifying its own signature.
  ])

  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    isApiRoute &&
    !CSRF_EXEMPT_WEBHOOKS.has(pathname)
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
