import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = (req as any).nextauth.token;
    
    // Debug logging for authentication issues
    console.log("Middleware - Path:", pathname, "Has token:", !!token);
    if (token) {
      console.log("Middleware - Token info:", { 
        userId: token.userId, 
        email: token.email,
        role: token.role 
      });
    }

    // Admin-only routes
    const adminRoutes = ["/admin", "/api/admin"];
    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute) {
      if (!token || token.role !== "ADMIN") {
        console.log("Middleware - Admin access denied for:", pathname);
        return NextResponse.redirect(
          new URL("/auth/signin?error=AdminRequired", req.url)
        );
      }
    }

    // Protected API routes - require authentication
    const protectedApiRoutes = [
      "/api/albums",
      "/api/photos",
      "/api/comments",
      "/api/likes",
      "/api/follow",
      "/api/uploads",
      "/api/storage", // Add storage routes protection
      "/api/social",
      "/api/notifications",
      "/api/gamification",
    ];

    const isProtectedApi = protectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtectedApi && !token) {
      console.log("Middleware - 401 returned for protected API:", pathname, "No token available");
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    // Add user info to headers for API routes
    if (token && pathname.startsWith("/api/")) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", token.userId as string);
      requestHeaders.set("x-user-role", token.role as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        console.log("NextAuth Authorized Callback:", {
          pathname,
          hasToken: !!token,
          tokenDetails: token ? {
            userId: token.userId,
            email: token.email,
            iat: token.iat,
            exp: token.exp
          } : null,
          userAgent: req.headers.get('user-agent')?.substring(0, 100)
        });

        // Always allow public routes
        const publicRoutes = [
          "/",
          "/auth/signin",
          "/auth/signup",
          "/auth/error",
          "/auth/verify-request",
          "/api/auth", // NextAuth routes
          "/api/health", // Health check endpoints
          "/api/signup", // Public signup endpoint
        ];

        // Allow public routes
        if (publicRoutes.some((route) => pathname.startsWith(route))) {
          console.log("NextAuth - Allowing public route:", pathname);
          return true;
        }

        // Define protected routes that require authentication
        const protectedRoutes = [
          "/dashboard",
          "/albums",
          "/globe",
          "/social",
          "/profile",
          "/settings",
          "/badges",
          "/app", // Catch-all for app routes
        ];

        // Check if this is a protected route
        const isProtectedRoute = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        // For protected routes, require authentication
        if (isProtectedRoute) {
          const hasAccess = !!token;
          console.log("NextAuth - Protected route access:", { 
            pathname, 
            hasAccess,
            tokenExists: !!token 
          });
          return hasAccess;
        }

        // Allow all other routes by default (including API routes - handled in middleware)
        console.log("NextAuth - Allowing other route:", pathname);
        return true;
      },
    },
    pages: {
      signIn:
        "/auth/signin?callbackUrl=" + encodeURIComponent("{{callbackUrl}}"),
      error: "/auth/error",
    },
  }
);

export const config = {
  matcher: [
    // Only apply middleware to protected routes
    "/dashboard/:path*",
    "/albums/:path*",
    "/globe/:path*",
    "/social/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/badges/:path*",
    "/api/albums/:path*",
    "/api/photos/:path*",
    "/api/uploads/:path*",
    "/api/storage/:path*", // Add storage routes to matcher
    "/api/social/:path*",
    "/api/notifications/:path*",
    "/api/gamification/:path*",
  ],
};
