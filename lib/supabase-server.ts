import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { clientEnv, getServerEnv } from "./env";

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

// Service client for server-side admin operations (re-exported for convenience)
export const supabaseAdmin = createClient(
  supabaseUrl,
  getServerEnv().SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Admin storage client for server-side storage operations (re-exported for convenience)
export const supabaseStorageAdmin = createClient(
  getStorageUrl(supabaseUrl),
  getServerEnv().SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
