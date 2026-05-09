import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'

// Server-side Supabase client. Auth is owned by Clerk — every request carries
// the Clerk session token (issued from the "supabase" JWT template) so RLS
// policies using public.clerk_user_id() identify the caller.
//
// Cookies are still wired through next/headers because Supabase SSR uses them
// for things like realtime presence; without the cookie methods @supabase/ssr
// throws.

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(MISSING_ENV_MESSAGE)
  }

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
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
          // outside route handlers / actions. Safe to swallow.
        }
      },
    },
    // Returns the Clerk-issued Supabase JWT, or null when unauthenticated.
    // Public reads still work — they fall under RLS policies that allow
    // anon/authenticated SELECT (e.g. users_public_read).
    accessToken: async () => {
      try {
        const { getToken } = await auth()
        return await getToken({ template: 'supabase' })
      } catch {
        return null
      }
    },
  })
}
