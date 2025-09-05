import { createClient } from "@supabase/supabase-js";

import { clientEnv } from "./env";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Single client instance to avoid multiple GoTrueClient warnings
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabaseClient;
}

// Main client for browser usage - uses singleton pattern
export const supabase = getSupabaseClient();

// Note: Use supabaseAdmin from lib/supabaseAdmin.ts for admin operations
// This avoids multiple client instances and consolidates admin functionality

// Use the same client instance for storage operations to avoid multiple instances
export const supabaseStorage = supabase;

// Authenticated client-side storage operations
// Now returns configured client instead of creating new instances
export function createAuthenticatedStorageClient(_accessToken: string) {
  // Use the same client instance and let it handle authentication
  // The main client will already have the user's session
  return supabase;
}
