import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

interface CityCount {
  city: string
  country_code: string | null
  count: number
}

// GET /api/place-recommendations/cities — distinct destinations with counts
// (public; works for anonymous users).
export async function GET() {
  const supabase = await createClient()

  try {
    // Aggregate in JS: a GROUP BY through the JS client is awkward, so we pull
    // the (indexed) city/country_code pairs and tally them.
    // Safety cap so the payload/memory can't grow unbounded as the table grows.
    // TODO: replace this JS aggregation with a Postgres GROUP BY view/RPC
    // (the eventual fix) so we never materialize every row client-side.
    const { data: rows, error } = await supabase
      .from('place_recommendations')
      .select('city, country_code')
      .limit(5000)

    if (error) throw error

    const counts = new Map<string, CityCount>()
    for (const row of rows || []) {
      const city = (row.city || '').trim()
      if (!city) continue
      const countryCode = row.country_code ?? null
      // Key on the case-insensitive city + country so "Paris" / "paris" merge.
      const key = `${city.toLowerCase()}|${(countryCode || '').toLowerCase()}`
      const existing = counts.get(key)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(key, { city, country_code: countryCode, count: 1 })
      }
    }

    const cities = Array.from(counts.values()).sort((a, b) => b.count - a.count)

    return NextResponse.json({ cities })
  } catch (error) {
    log.error(
      'Failed to list place recommendation cities',
      { component: 'api/place-recommendations/cities', action: 'list' },
      error as Error
    )
    return NextResponse.json({ error: 'Failed to load cities' }, { status: 500 })
  }
}
