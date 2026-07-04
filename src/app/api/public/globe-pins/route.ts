/**
 * GET /api/public/globe-pins
 *
 * Public, unauthenticated endpoint that returns anonymized lat/lng pins
 * from public-visibility albums. Used by the /discover page to show real
 * community travel on the marketing globe so visitors can see what they'd
 * be joining before signing up.
 *
 * No user IDs, no album IDs, no titles — just coordinates + country code
 * + ISO date. Cached aggressively (CDN s-maxage=300, stale-while-revalidate)
 * to keep load off the database.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'
import type { NextRequest } from 'next/server'

const MAX_PINS = 200

export const runtime = 'nodejs'
export const revalidate = 300 // ISR: re-fetch from DB at most every 5 minutes

interface PublicPin {
  lat: number
  lng: number
  country: string | null
  visitedAt: string | null
}

interface PublicGlobePinsResponse {
  pins: PublicPin[]
  stats: {
    countries: number
    travelers: number
    albums: number
  }
}

export async function GET(request: NextRequest) {
  const rl = await rateLimitAsync(request, { ...rateLimitConfigs.api, keyPrefix: 'public-globe-pins' })
  if (!rl.success) return rateLimitResponse(rl.reset)

  try {
    const supabase = await createClient()

    // Pull the most recent N public-visibility albums that have coordinates.
    // RLS allows anonymous reads of public albums per the existing policies.
    const { data: albums, error } = await supabase
      .from('albums')
      .select('latitude, longitude, country_code, date_start, created_at, user_id')
      .eq('visibility', 'public')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(MAX_PINS)

    if (error) {
      log.error(
        'Failed to fetch public globe pins',
        { component: 'PublicGlobePins', action: 'list' },
        error as Error,
      )
      return NextResponse.json(
        { error: 'Could not load community pins' },
        { status: 500 },
      )
    }

    const pins: PublicPin[] = (albums ?? []).map((a) => ({
      lat: Number(a.latitude),
      lng: Number(a.longitude),
      country: a.country_code ?? null,
      visitedAt: a.date_start ?? a.created_at ?? null,
    }))

    const countries = new Set(pins.map((p) => p.country).filter(Boolean) as string[])
    const travelers = new Set((albums ?? []).map((a) => a.user_id).filter(Boolean) as string[])

    const body: PublicGlobePinsResponse = {
      pins,
      stats: {
        countries: countries.size,
        travelers: travelers.size,
        albums: pins.length,
      },
    }

    return NextResponse.json(body, {
      headers: {
        // CDN caches for 5 min, serves stale up to 1 hour while revalidating.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    log.error(
      'Unexpected error in /api/public/globe-pins',
      { component: 'PublicGlobePins', action: 'list' },
      error as Error,
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
