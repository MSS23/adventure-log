import { log } from '@/lib/utils/logger'

/**
 * Server-only helpers for turning a pasted link (TikTok / Google Maps) into a
 * place. No secrets required — TikTok oEmbed and OSM Nominatim are both keyless.
 *
 * Everything here is defensive: helpers resolve to null rather than throwing so
 * the extract route can degrade to "couldn't detect — add manually".
 */

const NOMINATIM_UA = 'Adventure Log App (contact@example.com)'

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

/** Follow redirects (short links) and return the final URL. Falls back to input. */
export async function followRedirects(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdventureLogBot/1.0)' },
    })
    return res.url || url
  } catch (error) {
    log.warn('followRedirects failed', { component: 'LinkResolve', action: 'follow' }, error as Error)
    return url
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
