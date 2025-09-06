/**
 * Supabase Middleware for Next.js App Router
 *
 * This middleware handles:
 * - Session refresh on every request
 * - Route protection based on authentication
 * - OAuth callback handling
 * - Cookie management for session persistence
 * - API route authentication
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Create Supabase client for middleware usage
 */
function createMiddlewareClient(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables in middleware");
    return { supabase: null, response: supabaseResponse };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response: supabaseResponse };
}

/**
 * Main middleware function
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client
  const { supabase, response } = createMiddlewareClient(request);

  if (!supabase) {
    return response;
  }

  try {
    // Refresh session if expired
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Middleware session error:", error);
      // Clear invalid session cookies
      response.cookies.delete("sb-access-token");
      response.cookies.delete("sb-refresh-token");
    }

    // Handle OAuth callback routes
    if (pathname.startsWith("/auth/callback")) {
      const { data, error: callbackError } =
        await supabase.auth.exchangeCodeForSession(
          request.nextUrl.searchParams.get("code") || ""
        );

      if (callbackError) {
        console.error("OAuth callback error:", callbackError);
        return NextResponse.redirect(
          new URL("/auth/error?error=callback_error", request.url)
        );
      }

      if (data.session) {
        // Redirect to dashboard after successful login
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Public routes that don't require authentication - handled implicitly
    // by checking for protected routes instead

    // API routes that require authentication
    const protectedApiRoutes = [
      "/api/albums",
      "/api/photos",
      "/api/comments",
      "/api/likes",
      "/api/follow",
      "/api/uploads",
      "/api/storage",
      "/api/social",
      "/api/notifications",
      "/api/gamification",
    ];

    const isProtectedApiRoute = protectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Protected pages that require authentication
    const protectedPageRoutes = [
      "/dashboard",
      "/albums",
      "/globe",
      "/social",
      "/profile",
      "/settings",
      "/badges",
    ];

    const isProtectedPageRoute = protectedPageRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Check authentication for protected routes
    if (isProtectedApiRoute || isProtectedPageRoute) {
      if (!session) {
        if (isProtectedApiRoute) {
          // Return 401 for API routes
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        } else {
          // Redirect to signin for page routes
          const redirectUrl = new URL("/auth/signin", request.url);
          redirectUrl.searchParams.set("redirectTo", pathname);
          return NextResponse.redirect(redirectUrl);
        }
      }

      // Add user information to headers for API routes
      if (isProtectedApiRoute && session.user) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-user-id", session.user.id);
        requestHeaders.set("x-user-email", session.user.email || "");

        // Add user role if available in user metadata
        const userRole = session.user.user_metadata?.role || "user";
        requestHeaders.set("x-user-role", userRole);

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }

    // Redirect authenticated users away from auth pages
    if (
      session &&
      (pathname.startsWith("/auth/signin") ||
        pathname.startsWith("/auth/signup"))
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin-only routes (optional)
    const adminRoutes = ["/admin"];
    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute) {
      if (!session) {
        const redirectUrl = new URL("/auth/signin", request.url);
        redirectUrl.searchParams.set("error", "admin_required");
        return NextResponse.redirect(redirectUrl);
      }

      const userRole = session.user.user_metadata?.role;
      if (userRole !== "admin") {
        return NextResponse.redirect(
          new URL("/dashboard?error=access_denied", request.url)
        );
      }
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return response;
  }
}

/**
 * Configuration for which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

/**
 * Helper function to check if user is authenticated in middleware
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const { supabase } = createMiddlewareClient(request);

  if (!supabase) return false;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Helper function to get user from middleware
 */
export async function getUser(request: NextRequest) {
  const { supabase } = createMiddlewareClient(request);

  if (!supabase) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Helper function to get session from middleware
 */
export async function getSession(request: NextRequest) {
  const { supabase } = createMiddlewareClient(request);

  if (!supabase) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Helper to create custom redirect responses with proper session handling
 */
export function createAuthRedirect(request: NextRequest, destination: string) {
  const url = new URL(destination, request.url);
  const response = NextResponse.redirect(url);

  // Preserve any session cookies in the redirect
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, cookie.value);
    }
  });

  return response;
}

/**
 * Helper to create API error responses
 */
export function createAPIError(message: string, status: number = 401) {
  return NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
      code: status,
    },
    { status }
  );
}
