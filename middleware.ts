import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  () => {
    // Simplified middleware - let NextAuth handle the heavy lifting
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow public routes
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup', 
          '/auth/error',
          '/api/auth', // NextAuth routes
          '/api/health', // Health check endpoints
        ];

        // Allow public routes
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // Define protected routes that require authentication
        const protectedRoutes = [
          '/dashboard',
          '/albums',
          '/globe', 
          '/social',
          '/profile',
          '/settings',
          '/badges'
        ];

        // Check if this is a protected route
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname.startsWith(route)
        );

        // For protected routes, require authentication
        if (isProtectedRoute) {
          return !!token;
        }

        // Allow all other routes by default
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
    // Only apply middleware to protected routes
    '/dashboard/:path*',
    '/albums/:path*', 
    '/globe/:path*',
    '/social/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/badges/:path*'
  ],
};
