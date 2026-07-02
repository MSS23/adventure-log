import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'

/**
 * Geocoding proxy with provider fallback.
 *
 * Mapbox is the PRIMARY provider when a token is configured: Nominatim's
 * public instance aggressively throttles/blocks shared datacenter IPs
 * (Vercel's egress IPs included), which in production manifested as the
 * location search never returning results — users could only pick the
 * hard-coded "popular destinations" and couldn't add new places.
 *
 * Nominatim remains the fallback (and the only provider when no Mapbox token
 * is set, e.g. local dev), so the endpoint degrades instead of dying.
 *
 * Both providers are normalized to the Nominatim response shape the client
 * components already consume:
 *   search:  Array<{ display_name, lat, lon, place_id, type, importance,
 *                    address?: { country_code } }>
 *   reverse: { display_name, lat, lon, place_id, address?: { country_code } }
 */

interface NormalizedResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  type: string
  importance: number
  address?: { country_code?: string }
}

// Server-only token preferred; falls back to the public one (same key —
// Mapbox tokens are publishable, but a server-only var lets you scope it).
const MAPBOX_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

/** ISO-2 country code from a Mapbox feature ('us', 'US-NY', 'gb-eng' → 'US'/'GB'). */
function mapboxCountryCode(feature: {
  place_type?: string[]
  properties?: { short_code?: string }
  context?: Array<{ id?: string; short_code?: string }>
}): string | undefined {
  const shortCode = feature.place_type?.includes('country')
    ? feature.properties?.short_code
    : feature.context?.find(c => c.id?.startsWith('country.'))?.short_code
  const iso2 = shortCode?.split('-')[0]?.toUpperCase()
  return iso2 && /^[A-Z]{2}$/.test(iso2) ? iso2 : undefined
}

function normalizeMapboxFeature(feature: {
  id?: string
  place_name?: string
  center?: [number, number]
  place_type?: string[]
  relevance?: number
  properties?: { short_code?: string }
  context?: Array<{ id?: string; short_code?: string }>
}): NormalizedResult | null {
  const [lon, lat] = feature.center ?? []
  if (typeof lat !== 'number' || typeof lon !== 'number' || !feature.place_name) {
    return null
  }
  const country_code = mapboxCountryCode(feature)
  return {
    display_name: feature.place_name,
    lat: String(lat),
    lon: String(lon),
    place_id: feature.id || `${lat},${lon}`,
    type: feature.place_type?.[0] || 'place',
    importance: feature.relevance ?? 0.5,
    ...(country_code ? { address: { country_code: country_code.toLowerCase() } } : {}),
  }
}

async function mapboxSearch(query: string): Promise<NormalizedResult[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
    new URLSearchParams({
      access_token: MAPBOX_TOKEN!,
      limit: '8',
      language: 'en',
      // Travel-relevant result types; keeps noise (addresses, POI spam) down.
      types: 'country,region,place,locality,district',
    }).toString()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Mapbox search error: ${response.status}`)

  const data = await response.json()
  return (data.features ?? [])
    .map(normalizeMapboxFeature)
    .filter((r: NormalizedResult | null): r is NormalizedResult => r !== null)
}

async function mapboxReverse(lat: string, lon: string): Promise<NormalizedResult | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(lon)},${encodeURIComponent(lat)}.json?` +
    new URLSearchParams({
      access_token: MAPBOX_TOKEN!,
      limit: '1',
      language: 'en',
      types: 'place,locality,region,country',
    }).toString()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Mapbox reverse error: ${response.status}`)

  const data = await response.json()
  return data.features?.[0] ? normalizeMapboxFeature(data.features[0]) : null
}

async function nominatimFetch(nominatimUrl: string): Promise<unknown> {
  // Nominatim's usage policy requires a valid identifying User-Agent with a
  // way to contact us (app URL or email).
  const contact =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://adventure-log.app'
  const response = await fetch(nominatimUrl, {
    headers: { 'User-Agent': `AdventureLog/1.0 (+${contact})` },
  })
  if (!response.ok) throw new Error(`OpenStreetMap API error: ${response.status}`)
  return response.json()
}

function nominatimSearchUrl(query: string): string {
  return (
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q: query,
      format: 'json',
      limit: '8',
      dedupe: '1',
      'accept-language': 'en',
      addressdetails: '1',
    }).toString()
  )
}

function nominatimReverseUrl(lat: string, lon: string): string {
  return (
    `https://nominatim.openstreetmap.org/reverse?` +
    new URLSearchParams({ lat, lon, format: 'json', 'accept-language': 'en' }).toString()
  )
}

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for geocoding
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.geocode, keyPrefix: 'geocode' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  // SECURITY: Require authentication to prevent unauthorized API access
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - authentication required' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim().slice(0, 200)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const reverse = searchParams.get('reverse')

  const isReverse = reverse === 'true' && !!lat && !!lon
  if (isReverse) {
    // Coordinates must be plain finite numbers in range — they get
    // interpolated into upstream URLs.
    const latNum = Number(lat)
    const lonNum = Number(lon)
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) ||
        Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }
  } else if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  const cacheHeaders = { 'Cache-Control': 'public, max-age=300' } // 5 minutes

  // Primary: Mapbox (reliable from datacenter egress IPs).
  if (MAPBOX_TOKEN) {
    try {
      const data = isReverse
        ? await mapboxReverse(lat!, lon!)
        : await mapboxSearch(query!)
      return NextResponse.json(data ?? (isReverse ? {} : []), { headers: cacheHeaders })
    } catch (error) {
      log.warn('Mapbox geocoding failed, falling back to Nominatim', {
        component: 'GeocodeAPI',
        action: isReverse ? 'reverse' : 'search',
        error: error instanceof Error ? error.message : String(error),
      })
      // fall through to Nominatim
    }
  }

  // Fallback (or primary when no Mapbox token is configured).
  try {
    const data = await nominatimFetch(
      isReverse ? nominatimReverseUrl(lat!, lon!) : nominatimSearchUrl(query!)
    )
    return NextResponse.json(data, { headers: cacheHeaders })
  } catch (error) {
    log.error(
      'All geocoding providers failed',
      { component: 'GeocodeAPI', action: isReverse ? 'reverse' : 'search' },
      error as Error
    )
    // 503 (not 500): the failure is upstream availability, and the client
    // can meaningfully retry.
    return NextResponse.json(
      { error: 'Location search is temporarily unavailable. Please try again.' },
      { status: 503 }
    )
  }
}
