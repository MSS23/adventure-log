import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = (req as any).nextauth.token;

    // Admin-only routes
    const adminRoutes = ["/admin", "/api/admin"];
    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute) {
      if (!token || token.role !== "ADMIN") {
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
    ];

    const isProtectedApi = protectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtectedApi && !token) {
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
          return !!token;
        }

        // Allow all other routes by default (including API routes - handled in middleware)
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
  ],
};
