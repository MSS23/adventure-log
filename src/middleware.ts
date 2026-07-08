import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit as redisRateLimit } from '@/lib/utils/rate-limit-redis'

// ============================================
// Expired-session log noise filter
// ============================================
//
// When a returning user's refresh token has expired, auth-js's
// _recoverAndRefresh does a raw `console.error(AuthApiError: Invalid Refresh
// Token: ...)` from inside `supabase.auth.getUser()` — there's no option to
// lower it and no way to catch it (the promise itself resolves normally).
// That's a routine "please sign in again", not a fault, but every hit lands
// in the production error stream watched during launch. Downgrade exactly
// that signature to a warn; everything else passes through untouched.
const EXPIRED_REFRESH_TOKEN_SNIPPETS = ['refresh_token_not_found', 'Invalid Refresh Token']
function isExpiredRefreshTokenArg(arg: unknown): boolean {
  const text =
    typeof arg === 'string'
      ? arg
      : arg instanceof Error
        ? `${(arg as Error & { code?: string }).code ?? ''} ${arg.message}`
        : ''
  return EXPIRED_REFRESH_TOKEN_SNIPPETS.some((s) => text.includes(s))
}
const originalConsoleError = console.error.bind(console)
console.error = (...args: unknown[]) => {
  if (args.some(isExpiredRefreshTokenArg)) {
    console.warn('[middleware] session refresh token expired — user must sign in again')
    return
  }
  originalConsoleError(...args)
}

// ============================================
// Rate Limiting Configuration
// ============================================
//
// THE BOTTLENECK: the in-memory Map below lives in a single serverless
// instance's memory. On Vercel each concurrent instance has its own Map, so a
// client spread across N instances effectively gets N× the limit — the limit
// isn't enforced globally. When Upstash Redis is configured we use a
// distributed counter shared across all instances; otherwise we fall back to
// this in-memory limiter (fine for local dev / single-instance).
const REDIS_RATE_LIMIT_ENABLED =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

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
// PROTECTED_ROUTES require a signed-in Supabase user. Unauthenticated page
// navigations redirect to /login; data requests (fetch/img/API) get a JSON 401
// so their parsers don't choke on an HTML redirect.
//
// API routes are protected by default; only the explicitly listed public
// endpoints are exempt. Each public endpoint MUST verify its own auth
// (Bearer secret, signature, or anonymous-allowed telemetry).
const PUBLIC_API_PATHS = [
  '/api/health',
  '/api/manifest',
  '/api/maintenance/cleanup',
  '/api/email/notify',
  '/api/admin/apply-migrations',
  '/api/errors',
  '/api/monitoring/web-vitals',
] as const

const PUBLIC_API_PREFIXES = [
  '/api/webhooks/',
  '/api/public/',
] as const

function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_PATHS.includes(pathname as (typeof PUBLIC_API_PATHS)[number])) return true
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

const PROTECTED_PAGE_PREFIXES = [
  '/dashboard',
  '/albums',
  '/profile',
  '/settings',
  '/globe',
  '/feed',
  '/setup',
  '/passport',
  '/wishlist',
  '/trips',
  '/notifications',
  '/saved',
  '/activity',
  '/explore',
  '/achievements',
  '/countries',
  '/followers',
  '/following',
  '/leaderboard',
  '/organize',
  '/search',
  '/analytics',
  '/travel-twins',
]

// Public share surfaces that live UNDER protected prefixes. '/albums' is
// auth-gated, but an album's public share page and token-shared albums must
// stay reachable logged-out — that's the whole point of sharing them.
const PUBLIC_PAGE_PATTERNS = [
  /^\/albums\/[^/]+\/public$/,
  /^\/albums\/shared\//,
]

function isProtectedPage(pathname: string): boolean {
  if (PUBLIC_PAGE_PATTERNS.some((re) => re.test(pathname))) return false
  return PROTECTED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

// ============================================
// Data-request detection
// ============================================
// fetch(), <img>, EventSource, and the service worker can't follow a 307→/login
// HTML redirect — they parse the response as JSON and explode. Detect data
// requests and return a JSON 401 instead.
function isDataRequest(request: NextRequest): boolean {
  const headers = request.headers

  // RSC navigation & prefetch requests (fired by next/link clicks and
  // router.push) are client-side *navigations*, not data fetches: the App
  // Router transparently follows a 307 redirect on them (to /login), but it
  // cannot parse a JSON 401 — the navigation silently fails and the target
  // page never loads, leaving the user on a dead shell.
  //
  // Next.js strips the `RSC` / `Next-Router-*` headers before middleware runs,
  // so we can't key off those. The reliable signal that survives is the RSC
  // payload content type, `Accept: text/x-component`. Treat it as a navigation
  // and let the redirect path below handle it.
  if ((headers.get('accept') ?? '').includes('text/x-component')) {
    return false
  }

  // A request that explicitly accepts HTML is a page navigation regardless of
  // its fetch metadata. This matters for PWA users: Chromium recomputes the
  // Sec-Fetch-* headers for requests re-issued by a service worker's
  // fetch(event.request) pass-through (dest becomes 'empty'), so an
  // SW-mediated navigation to a protected page would otherwise be
  // misclassified as a data request and get raw JSON 401 instead of the
  // /login redirect. Programmatic fetch()/XHR default to `Accept: */*` and
  // never claim text/html, so this can't misroute real data requests.
  if ((headers.get('accept') ?? '').includes('text/html')) {
    return false
  }

  const dest = headers.get('sec-fetch-dest')
  if (dest && dest !== 'document' && dest !== 'iframe') {
    return true
  }

  const mode = headers.get('sec-fetch-mode')
  if (mode === 'cors' || mode === 'no-cors' || mode === 'same-origin') {
    return true
  }

  if (headers.get('x-requested-with') === 'fetch' || headers.get('x-requested-with') === 'XMLHttpRequest') {
    return true
  }

  const accept = headers.get('accept') ?? ''
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
        'Cache-Control': 'no-store',
      },
    },
  )
}

// ============================================
// CORS for the Capacitor app
// ============================================
// The native WebView calls /api/* cross-origin from one of these origins
// (Android default is https://localhost, iOS is capacitor://localhost). It
// authenticates via Authorization/X-Refresh-Token headers (see
// src/lib/supabase/server.ts), which makes every such request preflighted.
// CORS headers must also ride on error responses (401/403/429) — without
// them the WebView sees an opaque network error instead of the status.
const NATIVE_APP_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
  'http://localhost',
])

function nativeCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  return origin && NATIVE_APP_ORIGINS.has(origin) ? origin : null
}

function applyNativeCors(response: NextResponse, origin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, X-Refresh-Token, Content-Type, X-Requested-With',
  )
  response.headers.set('Access-Control-Max-Age', '86400')
  response.headers.append('Vary', 'Origin')
  return response
}

// ============================================
// Middleware
// ============================================
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  // ----------------------------------------------------------------
  // Capacitor app CORS (native origins only)
  // ----------------------------------------------------------------
  const corsOrigin = pathname.startsWith('/api/') ? nativeCorsOrigin(request) : null

  // Preflight: answer before auth/rate limiting — OPTIONS carries no
  // credentials and must succeed for the real request to ever be sent.
  if (corsOrigin && request.method === 'OPTIONS') {
    return applyNativeCors(new NextResponse(null, { status: 204 }), corsOrigin)
  }
  // Every non-preflight API response (success or error) gets CORS headers so
  // the WebView can actually read it.
  const withCors = <T extends NextResponse>(res: T): T => {
    if (corsOrigin) applyNativeCors(res, corsOrigin)
    return res
  }

  // Refresh the Supabase session (sets cookies on `response`) and read the user.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // A getUser() failure with session cookies present is a transient Supabase
  // problem (network blip, 5xx, statement timeout), not a logged-out user —
  // AuthApiError with status 401/403 is the genuine invalid/expired-session
  // case. Bouncing a logged-in user to /login on a blip logs them out
  // mid-session; let the request through instead and rely on the page's own
  // client-side auth gate (ProtectedRoute) / the API route's own auth check.
  const hasSessionCookies = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  const authIsTransientFailure =
    !user &&
    !!authError &&
    hasSessionCookies &&
    authError.status !== 400 &&
    authError.status !== 401 &&
    authError.status !== 403

  const isApiRoute = pathname.startsWith('/api/')
  const apiIsPublic = isApiRoute && isPublicApiPath(pathname)

  // Native (Capacitor) callers authenticate via Authorization bearer headers,
  // not cookies — the middleware client above can't see them. Let the request
  // through to the route handler, whose own `supabase.auth.getUser()`
  // validates the token (see src/lib/supabase/server.ts). An invalid token
  // still yields the handler's 401; this only skips the cookie-based gate.
  const hasBearerAuth =
    isApiRoute && (request.headers.get('authorization')?.startsWith('Bearer ') ?? false)

  // ----------------------------------------------------------------
  // Auth gate
  // ----------------------------------------------------------------
  if (isApiRoute && !apiIsPublic) {
    // Protected API: never redirect — return JSON 401.
    if (!user && !authIsTransientFailure && !hasBearerAuth) {
      return withCors(dataRequestUnauthorized())
    }
  } else if (!isApiRoute && isProtectedPage(pathname)) {
    if (!user && !authIsTransientFailure) {
      if (isDataRequest(request)) {
        return dataRequestUnauthorized()
      }
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Signed-in users shouldn't sit on the auth pages.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/feed'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
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

    // Same key shape for both backends: IP + first path segments.
    const rlKey = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`

    let allowed: boolean
    let remaining: number
    if (REDIS_RATE_LIMIT_ENABLED) {
      // Distributed counter shared across all serverless instances.
      const result = await redisRateLimit(
        rlKey,
        rateConfig.limit,
        Math.ceil(rateConfig.windowMs / 1000),
      )
      allowed = result.success
      remaining = result.remaining
    } else {
      // Per-instance fallback (local dev / single instance).
      ;({ allowed, remaining } = checkRateLimit(ip, pathname, rateConfig.limit, rateConfig.windowMs))
    }

    if (!allowed) {
      return withCors(
        NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(rateConfig.windowMs / 1000)),
              'X-RateLimit-Limit': String(rateConfig.limit),
              'X-RateLimit-Remaining': '0',
            },
          },
        ),
      )
    }

    response.headers.set('X-RateLimit-Limit', String(rateConfig.limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
  }

  // ----------------------------------------------------------------
  // Global security headers
  // ----------------------------------------------------------------
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  if (!pathname.startsWith('/embed')) {
    response.headers.set('X-Frame-Options', 'DENY')
  }

  // ----------------------------------------------------------------
  // CSRF protection for state-changing API calls.
  // Webhooks are exempt (verified via their own signature, origin won't match).
  // ----------------------------------------------------------------
  const CSRF_EXEMPT_WEBHOOKS = new Set<string>([
    // Add webhook paths here as they're created; each verifies its own signature.
  ])

  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    isApiRoute &&
    !CSRF_EXEMPT_WEBHOOKS.has(pathname) &&
    // The Capacitor app is a trusted first-party caller with a non-web origin.
    // CSRF targets ambient cookie credentials; native requests authenticate
    // via explicit bearer headers, which a cross-site attacker cannot forge.
    !corsOrigin
  ) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (origin && host) {
      let originHost: string | null = null
      try {
        originHost = new URL(origin).host
      } catch {
        originHost = null
      }
      if (originHost !== host) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }
  }

  return withCors(response)
}

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
