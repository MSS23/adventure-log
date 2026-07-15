/**
 * API client helpers for the web/Capacitor split.
 *
 * On web, the Next.js server hosts both the UI and `/api/*` route handlers, so
 * a relative `/api/foo` fetch is correct.
 *
 * On Capacitor (iOS/Android), the WebView is a thin client that loads the
 * statically-exported bundle. There is no Next.js server inside the app — the
 * UI calls back to the deployed web URL for `/api/*`. We resolve that URL
 * from `NEXT_PUBLIC_API_BASE_URL` at build/runtime and prepend it to every
 * `/api/*` request on native.
 *
 * Use `apiUrl(path)` when you need to construct the URL yourself (e.g. to put
 * it in an `<img src>`), and `apiFetch(path, init)` when you'd otherwise call
 * `fetch('/api/...', init)` directly.
 *
 * Required env:
 *   - `NEXT_PUBLIC_API_BASE_URL` — fully-qualified origin of the deployed web
 *     app, e.g. `https://roamkeep.net`. Required on mobile builds.
 *     Falls back to same-origin (relative path) if unset, which is correct for
 *     the web build and fails-loud on mobile (the request 404s against the
 *     local file:// origin) so the misconfiguration surfaces immediately.
 */

import { Capacitor } from '@capacitor/core'

/**
 * Returns true if the current runtime is a Capacitor native shell (iOS/Android
 * WebView). Returns false in the browser, during SSR, and in Node test
 * environments. Wrapped in try/catch because `Capacitor.isNativePlatform()`
 * can throw if the bridge is unavailable for some reason.
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/**
 * Resolve the base URL for `/api/*` calls.
 *
 * On web: returns `''` so that `apiUrl('/api/foo')` produces `/api/foo` (a
 * same-origin relative path — exactly what fetch() wants).
 *
 * On Capacitor: returns the configured `NEXT_PUBLIC_API_BASE_URL` with any
 * trailing slash stripped, so `apiUrl('/api/foo')` produces
 * `https://roamkeep.net/api/foo`.
 *
 * If `NEXT_PUBLIC_API_BASE_URL` is missing on a native build, returns `''` —
 * the request will fail fast against `capacitor://localhost/api/foo`, making
 * the misconfiguration visible. We deliberately do NOT silently fall back to a
 * hardcoded production URL — that would mask configuration mistakes and
 * potentially leak dev traffic into production data.
 */
export function getApiBaseUrl(): string {
  if (!isNativePlatform()) return ''
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!raw) return ''
  return raw.replace(/\/+$/, '')
}

/**
 * Resolve `/api/foo` → either `/api/foo` (web) or
 * `https://roamkeep.net/api/foo` (mobile).
 *
 * Accepts either an absolute path starting with `/` or a path without the
 * leading slash. Anything that already looks like a fully-qualified URL is
 * returned unchanged so callers can pass through external URLs safely.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = getApiBaseUrl()
  const normalised = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalised}`
}

/**
 * Drop-in replacement for `fetch('/api/...', init)` that resolves the URL via
 * `apiUrl()` and, on Capacitor native, authenticates the cross-origin request
 * with the on-device Supabase session.
 *
 * The WebView origin (capacitor://localhost / https://localhost) has no
 * cookies for the deployed web origin, so cookie auth cannot work. Instead we
 * attach the session as headers:
 *   - `Authorization: Bearer <access_token>`
 *   - `X-Refresh-Token: <refresh_token>` (lets the server refresh an expired
 *     access token instead of failing the request)
 *
 * The server side of this contract lives in:
 *   - `src/lib/supabase/server.ts` — synthesizes a Supabase session from
 *     these headers when no auth cookie is present, so every existing
 *     route handler's `supabase.auth.getUser()` works unchanged.
 *   - `src/middleware.ts` — CORS for the native origins, preflight handling,
 *     bearer pass-through in the auth gate, CSRF exemption.
 *
 * If you see 401s on mobile that work on web, check those two files first.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path)
  if (!isNativePlatform()) return fetch(url, init)

  const headers = new Headers(init?.headers)
  if (!headers.has('Authorization')) {
    try {
      // Dynamic import keeps the supabase client out of this tiny module's
      // dependency graph on web and avoids any import-cycle risk.
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
        if (session.refresh_token) {
          headers.set('X-Refresh-Token', session.refresh_token)
        }
      }
    } catch {
      // No session — let the request proceed unauthenticated (public routes).
    }
  }

  return fetch(url, { ...init, headers })
}
