/**
 * Native (Capacitor) route mapping.
 *
 * The mobile app is a static export: dynamic segments (`/albums/[id]`,
 * `/profile/[userId]`, `/trips/[id]`, ...) cannot be generated at build time,
 * so those routes are excluded from the bundle (see scripts/mobile-build.mjs)
 * and every navigation to them would dead-end in the WebView.
 *
 * Each excluded detail route has a static, query-param twin that IS in the
 * bundle (`/albums/view?id=...`, `/profile/view?u=...`, ...). This module maps
 * a canonical web path to its native twin. Web builds return paths unchanged.
 *
 * Two consumers:
 *   - `NativeNavigationAdapter` intercepts <a> clicks app-wide and rewrites
 *     them on the fly, so the ~90 existing <Link href="/albums/${id}"> call
 *     sites keep building canonical web URLs (correct for sharing/SEO).
 *   - Programmatic navigations (router.push / window.location) call
 *     `localizePath()` directly.
 *
 * Routes with no static twin (public share pages like /t/[slug]) map to an
 * absolute URL on the deployed web origin; `localizeHref()` flags these so
 * callers open them externally (the WebView hands off origins that are not in
 * capacitor.config.ts allowNavigation to the system browser).
 */

import { getApiBaseUrl, isNativePlatform } from '@/lib/api/client'

/** Static sub-paths under /albums that must never be treated as an album id. */
const ALBUM_STATIC_SEGMENTS = new Set(['new', 'import', 'view', 'edit', 'upload', 'shared'])
const PROFILE_STATIC_SEGMENTS = new Set(['edit', 'view'])
const TRIP_STATIC_SEGMENTS = new Set(['view'])
const PLACE_STATIC_SEGMENTS = new Set(['view'])
const BLEND_STATIC_SEGMENTS = new Set(['view'])

export interface LocalizedHref {
  href: string
  /** true → absolute URL on the web origin; open in the system browser. */
  external: boolean
}

/**
 * Map a canonical app path to its native-bundle equivalent.
 * Returns the input unchanged when it already resolves inside the bundle.
 * Only call on native (callers gate on `isNativePlatform()`), but calling on
 * web is harmless for relative results.
 */
export function mapPathForNative(path: string): LocalizedHref {
  // Split off query + hash so segment matching only sees the pathname.
  const hashIdx = path.indexOf('#')
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : ''
  const noHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path
  const queryIdx = noHash.indexOf('?')
  const query = queryIdx >= 0 ? noHash.slice(queryIdx + 1) : ''
  const pathname = queryIdx >= 0 ? noHash.slice(0, queryIdx) : noHash

  const segs = pathname.split('/').filter(Boolean)

  const withQuery = (base: string, params: Record<string, string>): LocalizedHref => {
    const sp = new URLSearchParams(query)
    for (const [k, v] of Object.entries(params)) sp.set(k, v)
    return { href: `${base}?${sp.toString()}${hash}`, external: false }
  }

  // /albums/{id}[/edit|/upload] — but never the static /albums/* pages,
  // and /albums/{id}/public is a web-only share page (external).
  if (segs[0] === 'albums' && segs.length >= 2 && !ALBUM_STATIC_SEGMENTS.has(segs[1])) {
    const id = segs[1]
    if (segs.length === 2) return withQuery('/albums/view', { id })
    if (segs[2] === 'edit') return withQuery('/albums/edit', { id })
    if (segs[2] === 'upload') return withQuery('/albums/upload', { id })
    if (segs[2] === 'public') return externalHref(path)
  }

  // /albums/shared/{token} — web-only share-token page.
  if (segs[0] === 'albums' && segs[1] === 'shared' && segs.length >= 3) {
    return externalHref(path)
  }

  // /profile/{userIdOrUsername}
  if (segs[0] === 'profile' && segs.length === 2 && !PROFILE_STATIC_SEGMENTS.has(segs[1])) {
    return withQuery('/profile/view', { u: segs[1] })
  }

  // /trips/{id}
  if (segs[0] === 'trips' && segs.length === 2 && !TRIP_STATIC_SEGMENTS.has(segs[1])) {
    return withQuery('/trips/view', { id: segs[1] })
  }

  // /places/{slug}
  if (segs[0] === 'places' && segs.length === 2 && !PLACE_STATIC_SEGMENTS.has(segs[1])) {
    return withQuery('/places/view', { slug: segs[1] })
  }

  // /blend/{username}
  if (segs[0] === 'blend' && segs.length === 2 && !BLEND_STATIC_SEGMENTS.has(segs[1])) {
    return withQuery('/blend/view', { u: segs[1] })
  }

  // /u/{username} and /u/{username}/passport (public profile / passport).
  // The passport connect flow (QR scan deep link) must keep working natively.
  if (segs[0] === 'u' && segs.length >= 2) {
    if (segs.length === 2) return withQuery('/profile/view', { u: segs[1] })
    if (segs[2] === 'passport') return withQuery('/passport/view', { u: segs[1] })
  }

  // /t/{slug} (public trip share) and /embed/* — web-only, open externally.
  if ((segs[0] === 't' && segs.length === 2) || segs[0] === 'embed') {
    return externalHref(path)
  }

  return { href: path, external: false }
}

function externalHref(path: string): LocalizedHref {
  const base = getApiBaseUrl()
  // Without a configured web origin we cannot open externally; stay in-app
  // (the 404 page has escape links) rather than produce a broken URL.
  if (!base) return { href: path, external: false }
  return { href: `${base}${path.startsWith('/') ? path : `/${path}`}`, external: true }
}

/**
 * Platform-aware path for programmatic navigation (router.push etc.).
 * On web returns the path unchanged. On native returns the in-bundle twin.
 * External-only targets are returned as absolute URLs — pass the result to
 * `openHref()` (or window.open) rather than router.push if it may be external.
 */
export function localizePath(path: string): string {
  if (!isNativePlatform()) return path
  return mapPathForNative(path).href
}

/** Full localized result, for callers that need the external flag. */
export function localizeHref(path: string): LocalizedHref {
  if (!isNativePlatform()) return { href: path, external: false }
  return mapPathForNative(path)
}

/**
 * The public web origin for building shareable URLs (share sheets, QR codes,
 * clipboard). On native, `window.location.origin` is `capacitor://localhost`
 * or `https://localhost` — never embed that in anything that leaves the
 * device. Falls back to the WebView origin when the web origin is unknown.
 */
export function getWebOrigin(): string {
  if (isNativePlatform()) {
    const base = getApiBaseUrl()
    if (base) return base
  }
  return typeof window !== 'undefined' ? window.location.origin : ''
}
