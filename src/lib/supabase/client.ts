import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/utils/logger'

// Auth is owned by Clerk. Supabase is data only — every request piggybacks
// the Clerk session token (issued from the "supabase" JWT template) so that
// RLS policies using public.clerk_user_id() can identify the caller.
//
// Reads window.Clerk at request time. SSR-safe because the accessToken
// callback only runs in the browser; on the server use src/lib/supabase/server.ts.
//
// On Capacitor (iOS/Android WebView) the Clerk browser bundle is fetched from
// the Clerk CDN at first paint, so window.Clerk may not exist for a brief
// window after the app boots. getClerkSupabaseToken waits up to
// CLERK_LOAD_TIMEOUT_MS for it to appear before falling back to anonymous,
// otherwise the very first authenticated query after a cold start would race
// the Clerk loader and 401.

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

const CLERK_LOAD_TIMEOUT_MS = 5_000
const CLERK_POLL_INTERVAL_MS = 50
const SUPABASE_JWT_TEMPLATE = 'supabase'

interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken: (opts?: { template?: string }) => Promise<string | null>
    } | null
    loaded?: boolean
  }
}

function readClerk(): ClerkWindow['Clerk'] | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as ClerkWindow).Clerk
}

// Module-level dedupe set — by far the most common failure mode is "JWT
// template 'supabase' not found in Clerk Dashboard," which would otherwise
// fire on every Supabase request. Log each unique error string at most once
// per page load so console isn't drowned but the misconfiguration is loud.
const reportedTokenErrors = new Set<string>()

function reportTokenError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined
  const dedupeKey = code ? `${code}:${message}` : message

  if (reportedTokenErrors.has(dedupeKey)) return
  reportedTokenErrors.add(dedupeKey)

  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    log.warn(
      'Clerk → Supabase JWT exchange failed; falling back to anonymous (RLS will deny authenticated queries)',
      {
        component: 'supabase-client',
        action: 'getClerkSupabaseToken',
        template: SUPABASE_JWT_TEMPLATE,
        errorCode: code,
      },
      err instanceof Error ? err : new Error(message),
    )
  } else {
    // In dev print the raw message — the most common causes are Dashboard
    // misconfig ("JWT template 'supabase' not found") which need to be
    // visible to the developer immediately, not buried in structured logs.
    console.error(
      `[supabase-client] Failed to fetch Clerk Supabase JWT (template="${SUPABASE_JWT_TEMPLATE}"). ` +
        `Authenticated Supabase requests will be anonymous and RLS will deny them. ` +
        `Verify the "supabase" JWT template exists in Clerk Dashboard. Original error: ${message}`,
    )
  }
}

/**
 * Wait until Clerk's browser bundle has finished loading. Resolves to the
 * Clerk handle or null on timeout. We poll instead of subscribing because the
 * SDK doesn't expose a stable "ready" event before the global is wired up.
 */
async function waitForClerk(timeoutMs = CLERK_LOAD_TIMEOUT_MS): Promise<NonNullable<ClerkWindow['Clerk']> | null> {
  if (typeof window === 'undefined') return null

  const start = Date.now()
  let clerk = readClerk()

  while (!clerk?.loaded) {
    if (Date.now() - start >= timeoutMs) return null
    await new Promise((resolve) => setTimeout(resolve, CLERK_POLL_INTERVAL_MS))
    clerk = readClerk()
  }

  return clerk
}

async function getClerkSupabaseToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  // Fast path: Clerk already loaded and a session exists.
  const immediate = readClerk()
  if (immediate?.loaded && immediate.session) {
    try {
      return await immediate.session.getToken({ template: SUPABASE_JWT_TEMPLATE })
    } catch (err) {
      reportTokenError(err)
      return null
    }
  }

  // Cold-start path (matters in Capacitor): wait for clerk.browser.js to land,
  // then ask for the token. If no session is established the user is anonymous
  // and we fall through to a null token (RLS allows public reads).
  const clerk = await waitForClerk()
  if (!clerk?.session) return null

  try {
    return await clerk.session.getToken({ template: SUPABASE_JWT_TEMPLATE })
  } catch (err) {
    reportTokenError(err)
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
