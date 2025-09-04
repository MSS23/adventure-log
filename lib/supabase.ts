import { createClient } from "@supabase/supabase-js";
<<<<<<< HEAD
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
=======
>>>>>>> oauth-upload-fixes

import { clientEnv, serverEnv } from "../src/env";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

// Client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

<<<<<<< HEAD
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

=======
>>>>>>> oauth-upload-fixes
// Service client for server-side admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to get optimized storage URL
function getStorageUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    // For better performance, use direct storage hostname
<<<<<<< HEAD
    if (url.hostname.includes('.supabase.co')) {
      url.hostname = url.hostname.replace('.supabase.co', '.storage.supabase.co');
=======
    if (url.hostname.includes(".supabase.co")) {
      url.hostname = url.hostname.replace(
        ".supabase.co",
        ".storage.supabase.co"
      );
>>>>>>> oauth-upload-fixes
    }
    return url.toString();
  } catch {
    // Fallback to original URL if parsing fails
    return baseUrl;
  }
}

// Optimized storage client using direct storage hostname for better performance
export const supabaseStorage = createClient(
<<<<<<< HEAD
  getStorageUrl(supabaseUrl), 
=======
  getStorageUrl(supabaseUrl),
>>>>>>> oauth-upload-fixes
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
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
<<<<<<< HEAD
);
=======
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
>>>>>>> oauth-upload-fixes
