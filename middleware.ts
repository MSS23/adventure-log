import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value, options: _options }) => request.cookies.set(name, value))
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
    data: { user },
    error: _error
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

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