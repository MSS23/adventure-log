import { createClient } from "@supabase/supabase-js";

import { clientEnv, serverEnv } from "../src/env";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

// Client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});