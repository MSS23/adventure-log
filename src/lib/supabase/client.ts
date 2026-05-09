import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Auth is owned by Clerk. Supabase is data only — every request piggybacks
// the Clerk session token (issued from the "supabase" JWT template) so that
// RLS policies using public.clerk_user_id() can identify the caller.
//
// Reads window.Clerk at request time. SSR-safe because the accessToken
// callback only runs in the browser; on the server use src/lib/supabase/server.ts.

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken: (opts?: { template?: string }) => Promise<string | null>
    }
    loaded?: boolean
  }
}

async function getClerkSupabaseToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const clerk = (window as unknown as ClerkWindow).Clerk
  if (!clerk?.session) return null
  try {
    return await clerk.session.getToken({ template: 'supabase' })
  } catch {
    return null
  }
}

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(MISSING_ENV_MESSAGE)
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    // Disable Supabase's own session machinery — Clerk owns the session.
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    // Supabase JS reads this on every request and sets Authorization: Bearer …
    // Returning null here makes the request anonymous, which is fine for
    // public reads (e.g. unauth landing-page queries).
    accessToken: getClerkSupabaseToken,
  })
}

/** Whether Supabase env vars are configured. Safe to call at any time. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
