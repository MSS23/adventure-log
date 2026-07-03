import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

// Server-side Supabase client. Auth is owned by Supabase — on web the session
// lives in cookies (refreshed by middleware) and @supabase/ssr reads them here
// so RLS policies using auth.uid() identify the caller.
//
// The Capacitor app cannot use cookies (its WebView origin is
// capacitor://localhost — no cookie jar for the deployed origin). apiFetch()
// sends the on-device session as `Authorization: Bearer <access_token>` +
// `X-Refresh-Token` headers instead. When those headers are present and no
// auth cookie is, we synthesize the session cookie @supabase/ssr expects, so
// every route handler's `supabase.auth.getUser()` / RLS-scoped query works
// unchanged for both callers. getUser() still validates the JWT against the
// Supabase auth server — the synthesized session grants nothing by itself.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const MISSING_ENV_MESSAGE =
  'Supabase is not configured. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'

interface JwtPayload {
  sub?: string
  email?: string
  phone?: string
  role?: string
  aud?: string
  exp?: number
}

function decodeJwtPayload(jwt: string): JwtPayload | null {
  try {
    const part = jwt.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Build the cookie list @supabase/ssr would have read for this session, from
 * the bearer headers a native client sends. Returns null when the headers
 * don't describe a plausible session.
 */
function bearerSessionCookie(
  authHeader: string | null,
  refreshToken: string | null,
): { name: string; value: string } | null {
  if (!supabaseUrl) return null
  if (!authHeader?.startsWith('Bearer ') || !refreshToken) return null

  const accessToken = authHeader.slice('Bearer '.length).trim()
  const payload = decodeJwtPayload(accessToken)
  if (!payload?.sub) return null

  let projectRef: string
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return null
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_at: payload.exp ?? nowSec + 3600,
    expires_in: Math.max(0, (payload.exp ?? nowSec + 3600) - nowSec),
    user: {
      id: payload.sub,
      aud: payload.aud ?? 'authenticated',
      role: payload.role ?? 'authenticated',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      app_metadata: {},
      user_metadata: {},
      created_at: '',
    },
  }

  return {
    name: `sb-${projectRef}-auth-token`,
    value: JSON.stringify(session),
  }
}

export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(MISSING_ENV_MESSAGE)
  }

  const cookieStore = await cookies()

  // Native (Capacitor) callers: no auth cookie, session in headers.
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  if (!hasAuthCookie) {
    const headerStore = await headers()
    const synthesized = bearerSessionCookie(
      headerStore.get('authorization'),
      headerStore.get('x-refresh-token'),
    )
    if (synthesized) {
      return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return [synthesized]
          },
          setAll() {
            // Token refreshes can't be persisted for a header-authenticated
            // caller — the native client refreshes its own session on-device.
          },
        },
      })
    }
  }

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
