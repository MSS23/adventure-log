import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define public routes that should bypass authentication entirely
  const publicRoutes = [
    '/api/manifest',
    '/api/health',
    '/manifest.json',
    '/manifest.webmanifest',
    '/sw.js',
    '/service-worker.js',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/login',
    '/signup',
    '/',
    '/about'
  ]

  // Check if current path is a public route or static asset
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$/)

  // For public routes, skip authentication entirely
  if (isPublicRoute) {
    return NextResponse.next({
      request,
    })
  }

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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only redirect to login for protected routes without authentication
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Simplified matcher that excludes public routes explicitly
     * This ensures PWA manifest and other public endpoints work correctly
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.)(?!api/manifest|api/health).*)',
  ],
}