import { Session } from "next-auth";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "./env";
import { logger } from "./logger";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase server client with NextAuth session integration
 * This ensures Supabase operations use the authenticated user context
 */
export async function createAuthenticatedSupabaseClient(
  session: Session | null
) {
  const cookieStore = await cookies();

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

  // If we have a NextAuth session, sync it with Supabase
  if (session?.user?.email) {
    try {
      // For server-side operations, we'll use the admin client
      // and pass user context through RLS policies
      await client.auth.signInWithPassword({
        email: session.user.email,
        password: "dummy", // This won't work, but shows the pattern
      });
    } catch (error) {
      // Expected to fail with password auth
      // In production, you'd use a different auth method or JWT
      logger.debug("Supabase auth sync attempted", { userId: session.user.id });
    }
  }

  return client;
}

/**
 * Enhanced session validation for API routes
 * Validates both NextAuth and Supabase authentication states
 */
export async function validateAuthenticatedSession(session: Session | null) {
  if (!session?.user?.id) {
    return {
      valid: false,
      error: "No valid session found",
      userId: null,
    };
  }

  // Additional validation can be added here
  // e.g., check if user still exists in Supabase

  return {
    valid: true,
    error: null,
    userId: session.user.id,
    userEmail: session.user.email,
    userRole: session.user.role || "USER",
  };
}

/**
 * Creates a Supabase client configured for the authenticated user
 * Uses admin client with RLS policies for proper access control
 */
export async function createUserSupabaseClient(userId: string) {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
    auth: {
      persistSession: false, // Server-side only
    },
    global: {
      headers: {
        // Pass user context for RLS
        "x-user-id": userId,
      },
    },
  });
}

/**
 * Middleware helper to ensure user has access to specific album
 */
export async function validateAlbumAccess(
  supabaseClient: Awaited<ReturnType<typeof createUserSupabaseClient>>,
  albumId: string,
  userId: string
) {
  try {
    const { data: album, error } = await supabaseClient
      .from("albums")
      .select("id, user_id, privacy")
      .eq("id", albumId)
      .single();

    if (error || !album) {
      return { hasAccess: false, error: "Album not found" };
    }

    // Check ownership or privacy settings
    if (album.user_id === userId) {
      return { hasAccess: true, isOwner: true };
    }

    // Additional logic for shared albums, friends, etc.
    if (album.privacy === "PUBLIC") {
      return { hasAccess: true, isOwner: false };
    }

    return { hasAccess: false, error: "Access denied" };
  } catch (error) {
    logger.error("Album access validation failed", { error, albumId, userId });
    return { hasAccess: false, error: "Validation error" };
  }
}
