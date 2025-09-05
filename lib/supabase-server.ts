import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Session } from "next-auth";

import { clientEnv } from "./env";
import { logger } from "./logger";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to get optimized storage URL
function getStorageUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    // For better performance, use direct storage hostname
    if (url.hostname.includes(".supabase.co")) {
      url.hostname = url.hostname.replace(
        ".supabase.co",
        ".storage.supabase.co"
      );
    }
    return url.toString();
  } catch {
    // Fallback to original URL if parsing fails
    return baseUrl;
  }
}

// Server-side client for SSR with cookies
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

// Server-side client with cookie-based authentication for SSR
export async function createAuthenticatedServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getStorageUrl(supabaseUrl), supabaseAnonKey, {
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
}

/**
 * Creates a Supabase client with NextAuth session integration
 * This ensures proper user context for RLS policies
 */
export async function createSessionAwareSupabaseClient(
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
    global: {
      headers: {
        // Pass user context for RLS policies
        ...(session?.user?.id && { "x-user-id": session.user.id }),
        ...(session?.user?.email && { "x-user-email": session.user.email }),
      },
    },
  });

  // Log session integration for debugging
  if (session?.user?.id) {
    logger.debug("Supabase client created with session context", {
      userId: session.user.id,
      email: session.user.email,
    });
  }

  return client;
}

/**
 * Helper to validate user access to resources
 */
export async function validateUserAccess(
  client: ReturnType<typeof createSessionAwareSupabaseClient>,
  resourceType: string,
  resourceId: string,
  userId: string
) {
  try {
    const { data, error } = await client
      .from(resourceType)
      .select("id, user_id")
      .eq("id", resourceId)
      .single();

    if (error || !data) {
      return { hasAccess: false, error: `${resourceType} not found` };
    }

    const hasAccess = data.user_id === userId;
    return { hasAccess, isOwner: hasAccess };
  } catch (error) {
    logger.error(`${resourceType} access validation failed`, {
      error,
      resourceId,
      userId,
    });
    return { hasAccess: false, error: "Validation error" };
  }
}

// Note: Import supabaseAdmin from lib/supabaseAdmin.ts for admin operations
// This consolidates admin client usage and prevents multiple instances
