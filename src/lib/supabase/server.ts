import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client. Auth is owned by Supabase — the session lives in
// cookies (refreshed by middleware) and @supabase/ssr reads them here so RLS
// policies using auth.uid() identify the caller.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(MISSING_ENV_MESSAGE)
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — Next.js forbids cookie writes
          // outside route handlers / actions. Middleware refreshes the session,
          // so this is safe to swallow.
        }
      },
    },
  })
}
