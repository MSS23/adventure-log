import { log } from '@/lib/utils/logger'

/**
 * Server-only helpers for turning a pasted link (TikTok / Google Maps) into a
 * place. No secrets required — TikTok oEmbed and OSM Nominatim are both keyless.
 *
 * Everything here is defensive: helpers resolve to null rather than throwing so
 * the extract route can degrade to "couldn't detect — add manually".
 */

// Nominatim's usage policy requires an identifying User-Agent with contact info.
const NOMINATIM_UA = `AdventureLog/1.0 (+${
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://adventure-log.app'
})`

export type LinkPlatform = 'tiktok' | 'google_maps' | 'instagram' | 'other'

export interface GeoResult {
  locationName: string
  city: string | null
  countryCode: string | null
  latitude: number
  longitude: number
}

export function detectPlatform(rawUrl: string): LinkPlatform {
  let host: string
  try {
    host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'other'
  }

  if (host.endsWith('tiktok.com')) return 'tiktok'
  if (
    host === 'google.com' ||
    host.endsWith('.google.com') ||
    host === 'maps.app.goo.gl' ||
    host === 'goo.gl' ||
    host === 'maps.google.com'
  ) {
    return 'google_maps'
  }
  if (host.endsWith('instagram.com')) return 'instagram'
  return 'other'
}

/**
 * Hosts we're willing to make a server-side request to when expanding a pasted
 * link. This is an allow-list (not a deny-list) precisely because the input is
 * user-controlled: without it, a user could paste a "google maps" URL that
 * redirects to `http://169.254.169.254/...` (cloud metadata) or an internal
 * service and turn this expander into an SSRF probe.
 */
function isHostAllowedForLinkFetch(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '')
  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return true
  if (h === 'google.com' || h.endsWith('.google.com') || h === 'maps.google.com') return true
  if (h === 'goo.gl' || h === 'maps.app.goo.gl') return true
  return false
}

/** Block requests to IP literals in private/loopback/link-local/metadata ranges. */
function isPrivateIpLiteral(host: string): boolean {
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 0 || a === 10 || a === 127) return true // this-host, private, loopback
    if (a === 169 && b === 254) return true // link-local (incl. 169.254.169.254 metadata)
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    return false
  }
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === '::1' || h === '::') return true // IPv6 loopback / unspecified
  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true // link-local / ULA
  return false
}

/** Parse + validate a URL is a public, http(s), allow-listed link target. */
function safeLinkUrl(raw: string): URL | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (isPrivateIpLiteral(u.hostname)) return null
  if (!isHostAllowedForLinkFetch(u.hostname)) return null
  return u
}

/**
 * Follow redirects (short links) and return the final URL. Falls back to input.
 *
 * SSRF-hardened: only fetches allow-listed public hosts, follows redirects
 * MANUALLY (re-validating each hop so a 30x can't smuggle the request to an
 * internal address), and times out so a hanging upstream can't pin the function.
 */
export async function followRedirects(url: string): Promise<string> {
  let current = safeLinkUrl(url)
  if (!current) {
    log.warn('followRedirects rejected unsafe/non-allowlisted URL', {
      component: 'LinkResolve',
      action: 'follow-rejected',
    })
    return url
  }

  try {
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdventureLogBot/1.0)' },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) return current.toString()
        const next = safeLinkUrl(new URL(location, current).toString())
        if (!next) {
          log.warn('followRedirects stopped at non-allowlisted redirect target', {
            component: 'LinkResolve',
            action: 'follow-redirect-blocked',
          })
          return current.toString()
        }
        current = next
        continue
      }

      return current.toString()
    }
    return current.toString()
  } catch (error) {
    log.warn('followRedirects failed', { component: 'LinkResolve', action: 'follow' }, error as Error)
    return current.toString()
  }
}

const COORD_RE = /^-?\d+(\.\d+)?$/

/**
 * Parse a (fully expanded) Google Maps URL for a place name and/or coordinates.
 * Handles the common shapes:
 *   /maps/place/<Name>/@lat,lng,zz
 *   ...!3d<lat>!4d<lng>...
 *   ?q=<lat>,<lng>  |  ?q=<Name>  |  ?query=<...>  |  /search/<lat>,<lng>
 */
export function parseGoogleMapsUrl(finalUrl: string): {
  name: string | null
  latitude: number | null
  longitude: number | null
} {
  let name: string | null = null
  let latitude: number | null = null
  let longitude: number | null = null

  let parsed: URL
  try {
    parsed = new URL(finalUrl)
  } catch {
    return { name, latitude, longitude }
  }

  const decode = (s: string) => {
    try {
      return decodeURIComponent(s.replace(/\+/g, ' ')).trim()
    } catch {
      return s.replace(/\+/g, ' ').trim()
    }
  }

  // Place name from /place/<Name>/
  const placeMatch = parsed.pathname.match(/\/place\/([^/@]+)/)
  if (placeMatch) {
    const candidate = decode(placeMatch[1])
    // Skip when the "name" is actually a coordinate pair.
    if (candidate && !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(candidate)) {
      name = candidate
    }
  }

  // Precise coords: !3d<lat>!4d<lng> (most accurate when present)
  const d3 = finalUrl.match(/!3d(-?\d+(?:\.\d+)?)/)
  const d4 = finalUrl.match(/!4d(-?\d+(?:\.\d+)?)/)
  if (d3 && d4) {
    latitude = parseFloat(d3[1])
    longitude = parseFloat(d4[1])
  }

  // Fallback: viewport centre /@lat,lng,zoom
  if (latitude === null || longitude === null) {
    const at = parsed.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (at) {
      latitude = parseFloat(at[1])
      longitude = parseFloat(at[2])
    }
  }

  // Fallback: ?q= / ?query= can be coords or a place name
  const q = parsed.searchParams.get('q') || parsed.searchParams.get('query')
  if (q) {
    const coordPair = q.split(',').map((s) => s.trim())
    if (coordPair.length === 2 && coordPair.every((s) => COORD_RE.test(s))) {
      if (latitude === null || longitude === null) {
        latitude = parseFloat(coordPair[0])
        longitude = parseFloat(coordPair[1])
      }
    } else if (!name) {
      name = decode(q)
    }
  }

  return { name, latitude, longitude }
}

export interface TikTokOEmbed {
  title: string
  authorName: string | null
  thumbnailUrl: string | null
}

/** Fetch TikTok oEmbed metadata (caption lives in `title`). Keyless. */
export async function fetchTikTokOEmbed(videoUrl: string): Promise<TikTokOEmbed | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdventureLogBot/1.0)' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    return {
      title: typeof data.title === 'string' ? data.title : '',
      authorName: typeof data.author_name === 'string' ? data.author_name : null,
      thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
    }
  } catch (error) {
    log.warn('fetchTikTokOEmbed failed', { component: 'LinkResolve', action: 'tiktok-oembed' }, error as Error)
    return null
  }
}

function pickCity(address: Record<string, unknown> | undefined): string | null {
  if (!address) return null
  for (const key of ['city', 'town', 'village', 'municipality', 'county', 'state']) {
    const v = address[key]
    if (typeof v === 'string' && v) return v
  }
  return null
}

function buildLocationName(displayName: string | undefined, city: string | null, countryName: string | null): string {
  if (city && countryName) return `${city}, ${countryName}`
  if (displayName) {
    // Trim a long Nominatim display_name to "first, …, country".
    const parts = displayName.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length <= 2) return parts.join(', ')
    return `${parts[0]}, ${parts[parts.length - 1]}`
  }
  return city || countryName || 'Unknown location'
}

/** Forward geocode a free-text query via Nominatim. */
export async function forwardGeocode(query: string): Promise<GeoResult | null> {
  const q = query?.trim()
  if (!q) return null
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q,
        format: 'json',
        limit: '1',
        dedupe: '1',
        'accept-language': 'en',
        addressdetails: '1',
      }).toString()

    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } })
    if (!res.ok) return null
    const arr = (await res.json()) as Array<{
      lat: string
      lon: string
      display_name?: string
      address?: Record<string, unknown>
    }>
    if (!Array.isArray(arr) || arr.length === 0) return null

    const top = arr[0]
    const latitude = parseFloat(top.lat)
    const longitude = parseFloat(top.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    const cc = top.address?.country_code
    const countryCode = typeof cc === 'string' ? cc.toUpperCase() : null
    const countryName = typeof top.address?.country === 'string' ? (top.address.country as string) : null
    const city = pickCity(top.address)

    return {
      latitude,
      longitude,
      countryCode,
      city,
      locationName: buildLocationName(top.display_name, city, countryName),
    }
  } catch (error) {
    log.warn('forwardGeocode failed', { component: 'LinkResolve', action: 'forward-geocode' }, error as Error)
    return null
  }
}

/** Reverse geocode coordinates via Nominatim (fills in city/country for a known lat/lng). */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?` +
      new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: 'json',
        'accept-language': 'en',
      }).toString()

    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } })
    if (!res.ok) return null
    const data = (await res.json()) as {
      display_name?: string
      address?: Record<string, unknown>
    }
    const cc = data.address?.country_code
    const countryCode = typeof cc === 'string' ? cc.toUpperCase() : null
    const countryName = typeof data.address?.country === 'string' ? (data.address.country as string) : null
    const city = pickCity(data.address)

    return {
      latitude,
      longitude,
      countryCode,
      city,
      locationName: buildLocationName(data.display_name, city, countryName),
    }
  } catch (error) {
    log.warn('reverseGeocode failed', { component: 'LinkResolve', action: 'reverse-geocode' }, error as Error)
    return null
  }
}
