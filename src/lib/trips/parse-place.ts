/**
 * Parse a pasted Google Maps URL or raw place text into structured place data.
 * Supports:
 *   - Full google.com/maps URLs with @lat,lng or !3dlat!4dlng patterns
 *   - maps.app.goo.gl / goo.gl/maps short links (resolved via HEAD redirect)
 *   - Raw text ("Eiffel Tower, Paris") — falls back to Nominatim forward geocode
 */

export interface ParsedPlace {
  name: string
  latitude: number
  longitude: number
  address: string | null
  source_url: string | null
}

const COORDS_AT_REGEX = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
const COORDS_BANG_REGEX = /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/
const COORDS_QUERY_REGEX = /[?&](?:q|ll|center|destination)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
const RAW_COORDS_REGEX = /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/

function extractNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const placeMatch = parsed.pathname.match(/\/place\/([^/@]+)/)
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim()
    }
    const q = parsed.searchParams.get('q')
    if (q && !RAW_COORDS_REGEX.test(q)) return q
    return null
  } catch {
    return null
  }
}

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const bang = url.match(COORDS_BANG_REGEX)
  if (bang) return { lat: parseFloat(bang[1]), lng: parseFloat(bang[2]) }
  const at = url.match(COORDS_AT_REGEX)
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) }
  const q = url.match(COORDS_QUERY_REGEX)
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) }
  return null
}

async function resolveShortUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' })
    return res.url
  } catch {
    return null
  }
}

async function geocodeText(origin: string, text: string): Promise<ParsedPlace | null> {
  try {
    const res = await fetch(`${origin}/api/geocode?q=${encodeURIComponent(text)}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    const lat = parseFloat(first.lat)
    const lng = parseFloat(first.lon)
    if (!isFinite(lat) || !isFinite(lng)) return null
    return {
      name: text.length > 60 ? text.slice(0, 60) : text,
      latitude: lat,
      longitude: lng,
      address: first.display_name || null,
      source_url: null,
    }
  } catch {
    return null
  }
}

/**
 * Main parser. `originUrl` is the host for internal fetches (to /api/geocode).
 */
export async function parsePlaceInput(
  input: string,
  originUrl: string
): Promise<ParsedPlace | null> {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Case 1: raw "lat, lng"
  const raw = trimmed.match(RAW_COORDS_REGEX)
  if (raw) {
    return {
      name: `Pin (${raw[1]}, ${raw[2]})`,
      latitude: parseFloat(raw[1]),
      longitude: parseFloat(raw[2]),
      address: null,
      source_url: null,
    }
  }

  // Case 2: URL
  const isUrl = /^https?:\/\//i.test(trimmed)
  if (isUrl) {
    let targetUrl = trimmed
    const isShort = /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmed)
    if (isShort) {
      const resolved = await resolveShortUrl(trimmed)
      if (resolved) targetUrl = resolved
    }

    const coords = extractCoordsFromUrl(targetUrl)
    const nameFromUrl = extractNameFromUrl(targetUrl)

    if (coords) {
      return {
        name: nameFromUrl || `Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
        latitude: coords.lat,
        longitude: coords.lng,
        address: nameFromUrl,
        source_url: trimmed,
      }
    }

    // URL but no coords — try geocoding the extracted name
    if (nameFromUrl) {
      const geo = await geocodeText(originUrl, nameFromUrl)
      if (geo) return { ...geo, source_url: trimmed }
    }

    return null
  }

  // Case 3: plain text → geocode
  return geocodeText(originUrl, trimmed)
}
