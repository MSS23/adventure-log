/**
 * Authentication Helper Functions for API Routes
 *
 * Handles both real Supabase authentication and mock authentication
 * when NEXT_PUBLIC_DISABLE_AUTH is enabled for development testing.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthDisabled } from "@/lib/mock-user";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
  isMockAuth: boolean;
}

/**
 * Get authenticated user from request - handles both real auth and mock auth
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // Check if auth is disabled for development
    if (isAuthDisabled()) {
      // Check for mock auth headers (injected by middleware)
      const mockUserHeader = request.headers.get("x-mock-auth");
      const userIdHeader = request.headers.get("x-user-id");
      const emailHeader = request.headers.get("x-user-email");

      if (mockUserHeader === "true" && userIdHeader && emailHeader) {
        console.log("[Auth Helper] Using mock authentication for development");
        return {
          user: {
            id: userIdHeader,
            email: emailHeader,
            user_metadata: {
              name: "Test User",
              full_name: "Test User",
              avatar_url:
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
            },
          },
          error: null,
          isMockAuth: true,
        };
      }

      // If mock auth is enabled but headers are missing, return error
      return {
        user: null,
        error: "Mock authentication headers missing",
        isMockAuth: true,
      };
    }

    // Use real Supabase authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        error: authError?.message || "Authentication required",
        isMockAuth: false,
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email || "",
        user_metadata: user.user_metadata,
      },
      error: null,
      isMockAuth: false,
    };
  } catch (error) {
    console.error("[Auth Helper] Error getting authenticated user:", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Authentication error",
      isMockAuth: false,
    };
  }
}

/**
 * Middleware to check authentication and return 401 if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthResult | Response> {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return Response.json(
      {
        error: "Unauthorized",
        details: authResult.error,
        isMockAuth: authResult.isMockAuth,
      },
      { status: 401 }
    );
  }

  return authResult;
}

/**
 * Helper to log authentication status for debugging
 */
export function logAuthStatus(authResult: AuthResult) {
  if (authResult.isMockAuth) {
    console.log("[Auth] Using mock authentication for development", {
      userId: authResult.user?.id,
      email: authResult.user?.email,
    });
  } else {
    console.log("[Auth] Using real Supabase authentication", {
      userId: authResult.user?.id,
      email: authResult.user?.email,
    });
  }
}
