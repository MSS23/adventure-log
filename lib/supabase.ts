import { createClient } from "@supabase/supabase-js";

import { clientEnv, getServerEnv } from "./env";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Service client for server-side admin operations
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

// Optimized storage client using direct storage hostname for better performance
export const supabaseStorage = createClient(
  getStorageUrl(supabaseUrl),
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Admin storage client for server-side storage operations
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

// Authenticated client-side storage operations
export function createAuthenticatedStorageClient(accessToken: string) {
  return createClient(getStorageUrl(supabaseUrl), supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
