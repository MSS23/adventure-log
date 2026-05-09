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
 *     app, e.g. `https://adventurelog.com`. Required on mobile builds.
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
 * `https://adventurelog.com/api/foo`.
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
 * `https://adventurelog.com/api/foo` (mobile).
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
 * `apiUrl()` and, on Capacitor native, defaults `credentials: 'include'` so
 * the WebView ships the Clerk session cookie cross-origin to the deployed
 * web API.
 *
 * The cross-origin cookie behaviour requires the deployed API to:
 *   1. Send `Access-Control-Allow-Credentials: true`
 *   2. Echo back the WebView origin in `Access-Control-Allow-Origin` (cannot
 *      be `*` when credentials are included).
 *   3. Set its session cookie with `SameSite=None; Secure`.
 * On Clerk, this is the default for the production frontend API. If you see
 * 401s on mobile that work on web, this is the first thing to check.
 *
 * Callers can override `credentials` via `init` — we only set the default.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path)
  if (!isNativePlatform()) return fetch(url, init)

  const merged: RequestInit = {
    credentials: 'include',
    ...init,
  }
  return fetch(url, merged)
}
