'use client'

/**
 * Travel Passport data hook.
 *
 * Extracted from the (900+ line) passport page so the aggregation logic is
 * testable and the page is presentation-only. Aggregation itself delegates to
 * the shared `computeTravelStats` — the same math the Wrapped recap, public
 * passport, and travel-card image use — so the passport can never drift from
 * the numbers shown on the other surfaces again.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { computeTravelStats } from '@/lib/utils/travel-stats'
import type { TravelPersonality } from '@/lib/utils/travel-personality'

export interface PassportAlbum {
  id: string
  title: string
  location_name: string | null
  country_code: string | null
  latitude: number
  longitude: number
  date_start: string | null
  created_at: string
  cover_photo_url: string | null
}

export interface PassportData {
  albums: PassportAlbum[]
  photoCount: number
  countryCodes: string[]
  cityCount: number
  totalDistanceKm: number
  personality: TravelPersonality
  continentProgress: { name: string; visited: number; total: number }[]
  firstTrip: { date: string; location: string } | null
  latestTrip: { date: string; location: string } | null
}

/**
 * Reverse-geocode albums that are missing a `country_code` and persist the
 * result. Nominatim is rate-limited (1 req/s, keyed by the caller's IP), so:
 *  - at most 8 albums are attempted per visit (converges over a few visits),
 *  - requests are spaced ~1.1s apart,
 *  - after 3 consecutive failures the whole pass aborts (offline / blocked /
 *    rate-limited — no point burning through the rest of the batch),
 *  - the `isCancelled` check stops the loop as soon as the page unmounts.
 */
async function backfillMissingCountryCodes(
  albums: PassportAlbum[],
  supabase: ReturnType<typeof createClient>,
  isCancelled: () => boolean
): Promise<Record<string, string>> {
  const missing = albums
    .filter(a => !a.country_code && a.latitude != null && a.longitude != null)
    .slice(0, 8)
  if (missing.length === 0) return {}

  const resolved: Record<string, string> = {}
  let consecutiveFailures = 0

  for (let i = 0; i < missing.length; i++) {
    if (isCancelled() || consecutiveFailures >= 3) break
    const album = missing[i]

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: album.latitude.toString(),
          lon: album.longitude.toString(),
          format: 'json',
          addressdetails: '1',
          'accept-language': 'en',
        }),
        { headers: { 'User-Agent': 'AdventureLog/1.0' } }
      )
      if (resp.ok) {
        consecutiveFailures = 0
        const data = await resp.json()
        const code = data?.address?.country_code?.toUpperCase()
        if (code && code.length === 2) {
          resolved[album.id] = code
          await supabase
            .from('albums')
            .update({ country_code: code })
            .eq('id', album.id)
        }
      } else {
        consecutiveFailures++
      }
      if (i < missing.length - 1) {
        await new Promise(r => setTimeout(r, 1100))
      }
    } catch {
      consecutiveFailures++
    }
  }

  return resolved
}

export function computePassportData(validAlbums: PassportAlbum[], photoCount: number): PassportData {
  const stats = computeTravelStats(validAlbums)

  return {
    albums: validAlbums,
    photoCount,
    countryCodes: stats.countryCodes,
    cityCount: stats.cities.length,
    totalDistanceKm: stats.totalDistanceKm,
    personality: stats.personality,
    continentProgress: stats.continentProgress,
    firstTrip: stats.firstTrip
      ? {
          date: stats.firstTrip.date_start || stats.firstTrip.created_at,
          location: stats.firstTrip.location_name || stats.firstTrip.title,
        }
      : null,
    // Only a distinct "latest" when there's more than one album — otherwise the
    // single album is both first and latest and the UI shows two identical cards.
    // (computeTravelStats already applies this convention.)
    latestTrip: stats.latestTrip
      ? {
          date: stats.latestTrip.date_start || stats.latestTrip.created_at,
          location: stats.latestTrip.location_name || stats.latestTrip.title,
        }
      : null,
  }
}

export function useTravelPassport() {
  const { user } = useAuth()
  const [data, setData] = useState<PassportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const supabase = createClient()
        const { data: albums } = await supabase
          .from('albums')
          .select('id, title, location_name, country_code, latitude, longitude, date_start, created_at, cover_photo_url')
          .eq('user_id', user.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .neq('status', 'draft')
          .order('date_start', { ascending: true, nullsFirst: false })

        const { count: photoCount } = await supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (cancelled) return

        const validAlbums = (albums || []) as PassportAlbum[]

        // Render immediately with the data we have — don't block the whole page
        // behind slow, rate-limited reverse-geocoding.
        setData(computePassportData(validAlbums, photoCount || 0))
        setLoading(false)

        // Backfill any missing country codes in the background, then merge the
        // results in with a second, non-blocking update.
        const backfilled = await backfillMissingCountryCodes(validAlbums, supabase, () => cancelled)
        if (cancelled || Object.keys(backfilled).length === 0) return
        for (const album of validAlbums) {
          if (!album.country_code && backfilled[album.id]) {
            album.country_code = backfilled[album.id]
          }
        }
        setData(computePassportData(validAlbums, photoCount || 0))
      } catch (err) {
        if (cancelled) return
        log.error('Failed to load passport', { component: 'TravelPassport', action: 'fetch' }, err as Error)
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is the identity that matters
  }, [user?.id])

  return { data, loading }
}
