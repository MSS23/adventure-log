import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  (req) => {
    // Add debug logging for middleware execution
    const { pathname } = req.nextUrl;
    
    // Skip middleware for public routes and assets
    if (pathname.startsWith('/api/') || 
        pathname.startsWith('/_next/') || 
        pathname.startsWith('/favicon') ||
        pathname.includes('.')) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow API routes - they handle their own auth
        if (pathname.startsWith('/api/')) {
          return true;
        }

        // Always allow auth routes
        if (pathname.startsWith('/auth/')) {
          return true;
        }

        // Always allow public assets and Next.js internals
        if (pathname.startsWith('/_next/') || 
            pathname.startsWith('/favicon') ||
            pathname === '/' ||
            pathname.includes('.')) {
          return true;
        }

        // Define which routes require authentication
        const protectedRoutes = [
          "/dashboard",
          "/trips", 
          "/albums",
          "/globe",
          "/social",
          "/profile",
          "/settings",
          "/achievements",
          "/badges"
        ];

        const isProtectedRoute = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        // If accessing a protected route, require authentication
        if (isProtectedRoute) {
          return !!token;
        }

        // Allow access to all other routes by default
        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match protected routes only - more specific to avoid API interference
     * Include: /dashboard, /albums, /globe, /social, /profile, /settings, /badges
     * Exclude: /api/*, /_next/*, /favicon*, static files, auth routes
     */
    "/((?!api/|_next/|favicon|manifest|icon|auth/signin|auth/signup|auth/error|test-auth|.*\\.[a-zA-Z]+$).*)",
  ],
};
