import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================
// Rate Limiting Configuration
// ============================================
interface RateLimitRecord {
  count: number
  timestamp: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up old entries every 5 minutes to prevent memory leaks
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

// Rate limits by route type
const RATE_LIMITS = {
  api: { limit: 100, windowMs: 15 * 60 * 1000 },      // 100 requests per 15 minutes
  auth: { limit: 5, windowMs: 15 * 60 * 1000 },       // 5 auth attempts per 15 minutes
  upload: { limit: 50, windowMs: 60 * 60 * 1000 },    // 50 uploads per hour
}

function checkRateLimit(
  ip: string,
  pathname: string,
  limit: number,
  windowMs: number
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

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/api/health',
  '/api/manifest',
  '/_next',
  '/favicon.ico',
  '/sitemap.xml',
  '/robots.txt',
  '/offline'
]

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/albums',
  '/profile',
  '/settings',
  '/globe',
  '/setup'
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ============================================
  // Rate Limiting for API Routes
  // ============================================
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Determine rate limit based on route type
    let rateConfig = RATE_LIMITS.api

    if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/signup') {
      rateConfig = RATE_LIMITS.auth
    } else if (pathname.includes('/upload')) {
      rateConfig = RATE_LIMITS.upload
    }

    const { allowed, remaining } = checkRateLimit(ip, pathname, rateConfig.limit, rateConfig.windowMs)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateConfig.windowMs / 1000)),
            'X-RateLimit-Limit': String(rateConfig.limit),
            'X-RateLimit-Remaining': '0',
          }
        }
      )
    }

    // Add rate limit headers to response (will be added later when response is created)
    // We'll add these headers to the supabaseResponse at the end
  }

  // Handle auth redirects
  if (isPublicRoute(pathname)) {
    // If user is logged in and tries to access auth pages, redirect to dashboard
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // Allow access to public routes
    return supabaseResponse
  }

  if (isProtectedRoute(pathname)) {
    // If user is not logged in, redirect to login
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Profile setup is optional - users can edit their profile later via /profile/edit
    // No forced redirect to setup page

    // Add security headers for protected routes
    supabaseResponse.headers.set('X-Frame-Options', 'DENY')
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
    supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }

  // Add CSRF protection for file uploads
  if (request.method === 'POST' && pathname.includes('/upload')) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (origin && host && !origin.includes(host)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}