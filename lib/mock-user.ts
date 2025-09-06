/**
 * Mock User System for Development Testing
 *
 * This provides a consistent mock user for testing features without authentication.
 * Only active when NEXT_PUBLIC_DISABLE_AUTH="true" and in development mode.
 */

import type { User, Session } from "@supabase/supabase-js";

export const MOCK_USER_ID = "mock-user-12345-dev-testing";
export const MOCK_USER_EMAIL = "tester@adventurelog.com";

/**
 * Check if authentication is disabled for development
 */
export function isAuthDisabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DISABLE_AUTH === "true"
  );
}

/**
 * Create a mock user object compatible with Supabase User type
 */
export function createMockUser(): User {
  return {
    id: MOCK_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: MOCK_USER_EMAIL,
    email_confirmed_at: new Date().toISOString(),
    phone: undefined,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: "mock",
      providers: ["mock"],
    },
    user_metadata: {
      name: "Test User",
      full_name: "Test User",
      avatar_url:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      email: MOCK_USER_EMAIL,
      email_verified: true,
      phone_verified: false,
      sub: MOCK_USER_ID,
    },
    identities: [
      {
        identity_id: "mock-identity-123",
        id: MOCK_USER_ID,
        user_id: MOCK_USER_ID,
        identity_data: {
          email: MOCK_USER_EMAIL,
          email_verified: true,
          phone_verified: false,
          sub: MOCK_USER_ID,
        },
        provider: "mock",
        last_sign_in_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  };
}

/**
 * Create a mock session object compatible with Supabase Session type
 */
export function createMockSession(): Session {
  const mockUser = createMockUser();

  return {
    access_token: "mock-access-token-dev-only",
    refresh_token: "mock-refresh-token-dev-only",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: mockUser,
  };
}

/**
 * Get mock user if auth is disabled, null otherwise
 */
export function getMockUser(): User | null {
  return isAuthDisabled() ? createMockUser() : null;
}

/**
 * Get mock session if auth is disabled, null otherwise
 */
export function getMockSession(): Session | null {
  return isAuthDisabled() ? createMockSession() : null;
}

/**
 * Mock auth functions for development testing
 */
export const mockAuthFunctions = {
  signIn: async () => {
    console.log("[Mock Auth] Sign in simulated - auth is disabled");
    return Promise.resolve();
  },

  signInWithPassword: async (email: string, _password: string) => {
    console.log(`[Mock Auth] Sign in with password simulated: ${email}`);
    return Promise.resolve();
  },

  signUp: async (
    email: string,
    _password: string,
    _metadata?: { name?: string }
  ) => {
    console.log(`[Mock Auth] Sign up simulated: ${email}`);
    return Promise.resolve();
  },

  signOut: async () => {
    console.log("[Mock Auth] Sign out simulated - auth is disabled");
    return Promise.resolve();
  },

  resetPassword: async (email: string) => {
    console.log(`[Mock Auth] Password reset simulated: ${email}`);
    return Promise.resolve();
  },

  refreshSession: async () => {
    console.log("[Mock Auth] Session refresh simulated - auth is disabled");
    return Promise.resolve();
  },
};

/**
 * Mock user info for debugging
 */
export function logMockUserInfo() {
  if (isAuthDisabled()) {
    console.log("[Mock User] Authentication disabled for development", {
      userId: MOCK_USER_ID,
      email: MOCK_USER_EMAIL,
      mode: "TESTING",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Utility to check if current context is using mock user
 */
export function isMockUser(userId?: string): boolean {
  return userId === MOCK_USER_ID;
}

/**
 * Get consistent mock headers for API requests
 */
export function getMockHeaders(): Record<string, string> {
  if (!isAuthDisabled()) return {};

  return {
    "x-user-id": MOCK_USER_ID,
    "x-user-email": MOCK_USER_EMAIL,
    "x-user-role": "user",
    "x-mock-auth": "true",
  };
}

/**
 * Development-only warning
 */
if (isAuthDisabled()) {
  console.warn(
    "🚨 [DEVELOPMENT] Authentication is DISABLED for feature testing. " +
      "Set NEXT_PUBLIC_DISABLE_AUTH=false to re-enable authentication."
  );
}
