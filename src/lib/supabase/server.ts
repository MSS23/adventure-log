import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { log } from '@/lib/utils/logger'

// Server-side Supabase client. Auth is owned by Clerk — every request carries
// the Clerk session token (issued from the "supabase" JWT template) so RLS
// policies using public.clerk_user_id() identify the caller.
//
// Cookies are still wired through next/headers because Supabase SSR uses them
// for things like realtime presence; without the cookie methods @supabase/ssr
// throws.

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

const SUPABASE_JWT_TEMPLATE = 'supabase'

// Module-level dedupe — same idea as the browser client: the most common
// failure mode is "JWT template 'supabase' not found in Clerk Dashboard," and
// without dedupe we'd emit one error per Supabase call.
const reportedServerTokenErrors = new Set<string>()

function reportServerTokenError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined
  const dedupeKey = code ? `${code}:${message}` : message

  if (reportedServerTokenErrors.has(dedupeKey)) return
  reportedServerTokenErrors.add(dedupeKey)

  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    log.warn(
      'Clerk → Supabase JWT exchange failed (server); falling back to anonymous',
      {
        component: 'supabase-server',
        action: 'getToken',
        template: SUPABASE_JWT_TEMPLATE,
        errorCode: code,
      },
      err instanceof Error ? err : new Error(message),
    )
  } else {
    console.error(
      `[supabase-server] Failed to fetch Clerk Supabase JWT (template="${SUPABASE_JWT_TEMPLATE}"). ` +
        `Authenticated Supabase requests will be anonymous and RLS will deny them. ` +
        `Verify the "supabase" JWT template exists in Clerk Dashboard. Original error: ${message}`,
    )
  }
}

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
        return await getToken({ template: SUPABASE_JWT_TEMPLATE })
      } catch (err) {
        reportServerTokenError(err)
        return null
      }
    },
  })
}
