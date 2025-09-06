/**
 * Supabase Server Client for Next.js App Router
 *
 * This client is designed for server-side operations including:
 * - Server Components
 * - API Routes
 * - Server Actions
 * - Middleware
 *
 * It properly handles cookie-based session management and provides
 * both authenticated user operations and service role operations.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/supabase";

/**
 * Create server client for authenticated operations
 * Uses cookies for session management in App Router
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Enhanced cookie options for better security and App Router compatibility
            const cookieOptions = {
              ...options,
              // Ensure cookies work across App Router navigation
              path: "/",
              // Enhanced security settings
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite:
                process.env.NODE_ENV === "production"
                  ? ("lax" as const)
                  : ("lax" as const),
              // Longer expiry for session persistence
              maxAge: options?.maxAge || 60 * 60 * 24 * 7, // 1 week default
            };

            cookieStore.set(name, value, cookieOptions);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
          console.warn("Failed to set cookies in Server Component:", error);
        }
      },
    },
    auth: {
      // Enable automatic session persistence via cookies
      persistSession: true,
      // Automatically refresh tokens when they expire
      autoRefreshToken: true,
      // Don't detect OAuth callbacks on server (handled by our callback route)
      detectSessionInUrl: false,
      // Store session in cookies for App Router compatibility
      storage: undefined, // Use default cookie storage
      // Enable debug logging in development
      debug: process.env.NODE_ENV === "development",
    },
    global: {
      headers: {
        "X-Client-Info": "adventure-log-server",
        "X-Client-Version": "1.0.0",
      },
    },
  });
}

/**
 * Create service role client for admin operations
 * Bypasses RLS for server-side operations that need admin access
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase service role key. Please check SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "adventure-log-service-role",
      },
    },
  });
}

/**
 * Cached function to get current user session
 * Prevents multiple calls to Supabase in the same request
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return null;
    }

    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
});

/**
 * Cached function to get current user
 * Prevents multiple calls to Supabase in the same request
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting user:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
});

/**
 * Check if user is authenticated
 */
export const isAuthenticated = cache(async () => {
  const user = await getUser();
  return !!user;
});

/**
 * Get user ID if authenticated
 */
export const getUserId = cache(async () => {
  const user = await getUser();
  return user?.id || null;
});

/**
 * Server-side auth helpers
 */
export const serverAuth = {
  /**
   * Require authentication - throws if not authenticated
   */
  requireAuth: async () => {
    const user = await getUser();
    if (!user) {
      throw new Error("Authentication required");
    }
    return user;
  },

  /**
   * Require specific user ID - throws if not matching
   */
  requireUser: async (userId: string) => {
    const user = await serverAuth.requireAuth();
    if (user.id !== userId) {
      throw new Error("Access denied");
    }
    return user;
  },

  /**
   * Get user with error handling
   */
  getUserSafe: async () => {
    try {
      return await getUser();
    } catch (error) {
      console.error("Error getting user safely:", error);
      return null;
    }
  },

  /**
   * Get session with error handling
   */
  getSessionSafe: async () => {
    try {
      return await getSession();
    } catch (error) {
      console.error("Error getting session safely:", error);
      return null;
    }
  },
};

/**
 * Database helpers with authentication context
 */
export const serverDb = {
  /**
   * Get albums for authenticated user
   */
  getAlbums: async (userId?: string) => {
    const supabase = await createClient();
    const currentUserId = userId || (await getUserId());

    if (!currentUserId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("albums")
      .select(
        `
        *,
        photos:album_photos(count)
      `
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get album by ID with ownership check
   */
  getAlbum: async (id: string, userId?: string) => {
    const supabase = await createClient();
    const currentUserId = userId || (await getUserId());

    if (!currentUserId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("albums")
      .select(
        `
        *,
        photos:album_photos(*)
      `
      )
      .eq("id", id)
      .eq("user_id", currentUserId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create album for authenticated user
   */
  createAlbum: async (albumData: any) => {
    const supabase = await createClient();
    const userId = await getUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("albums")
      .insert({
        ...albumData,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update album with ownership check
   */
  updateAlbum: async (id: string, updates: any) => {
    const supabase = await createClient();
    const userId = await getUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await (supabase as any)
      .from("albums")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete album with ownership check
   */
  deleteAlbum: async (id: string) => {
    const supabase = await createClient();
    const userId = await getUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("albums")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },
};

/**
 * Storage helpers with authentication
 */
export const serverStorage = {
  /**
   * Upload file with user context
   */
  uploadFile: async (
    bucket: string,
    path: string,
    file: File | Buffer,
    options?: any
  ) => {
    const supabase = await createClient();
    const userId = await getUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Ensure path includes user ID for security
    const securePath = path.startsWith(`${userId}/`)
      ? path
      : `${userId}/${path}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(securePath, file, {
        ...options,
        upsert: false, // Prevent overwrites by default
      });

    if (error) throw error;
    return data;
  },

  /**
   * Get signed upload URL
   */
  getSignedUploadUrl: async (bucket: string, path: string, options?: any) => {
    const supabase = await createClient();
    const userId = await getUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Ensure path includes user ID for security
    const securePath = path.startsWith(`${userId}/`)
      ? path
      : `${userId}/${path}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(securePath, options);

    if (error) throw error;
    return data;
  },

  /**
   * Delete files with ownership check
   */
  deleteFiles: async (bucket: string, paths: string[]) => {
    const supabase = await createClient();
    const userId = await getUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Verify all paths belong to user
    const securePaths = paths.filter((path) => path.startsWith(`${userId}/`));

    if (securePaths.length !== paths.length) {
      throw new Error("Access denied: Some files do not belong to user");
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(securePaths);

    if (error) throw error;
    return data;
  },
};

/**
 * Service role operations (admin functions)
 */
export const adminDb = {
  /**
   * Get user profile by ID (admin)
   */
  getUserProfile: async (userId: string) => {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create user profile (admin)
   */
  createUserProfile: async (profile: any) => {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("profiles")
      .insert(profile as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update user profile (admin)
   */
  updateUserProfile: async (userId: string, updates: any) => {
    const supabase = createServiceRoleClient();

    const { data, error } = await (supabase as any)
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete user and all associated data (admin)
   */
  deleteUser: async (userId: string) => {
    const supabase = createServiceRoleClient();

    // This would typically involve deleting from multiple tables
    // due to foreign key constraints
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;
  },
};

/**
 * Error handling helpers
 */
export const handleServerError = (error: any) => {
  console.error("Supabase server error:", error);

  if (error?.code === "PGRST301") {
    return "Authentication required";
  }

  if (error?.code === "PGRST116") {
    return "Resource not found or access denied";
  }

  if (error?.message?.includes("JWT")) {
    return "Session expired";
  }

  return error?.message || "Internal server error";
};

/**
 * Development helpers
 */
export const serverDev = {
  /**
   * Test server auth status
   */
  testAuth: async () => {
    try {
      const user = await getUser();
      const session = await getSession();

      return {
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        email: user?.email,
        sessionExpiry: session?.expires_at,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: handleServerError(error),
      };
    }
  },

  /**
   * Get server info
   */
  getServerInfo: () => {
    return {
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      timestamp: new Date().toISOString(),
    };
  },
};

// Export the main function as default
export { createClient as default };
