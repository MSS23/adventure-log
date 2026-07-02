/**
 * Canonical travel-stats aggregation.
 *
 * Four surfaces show the same aggregate numbers — the Wrapped recap
 * (`useWrappedData`), the app Travel Passport, the public passport page, and
 * the shareable travel-card image route — and each used to carry its own copy
 * of the country/city/distance/personality math. The copies had already
 * drifted (the passport sorted with `new Date(...)`, which shifts date-only
 * strings a day in timezones behind UTC, while Wrapped used `parseLocalDate`).
 * This module is the single source of truth; callers pass whatever album rows
 * they are allowed to see (privacy filtering stays at the query, where it
 * belongs) and render from the result.
 *
 * Pure TypeScript, no client/server-only imports — safe in client components,
 * server components, and the nodejs travel-card route alike.
 */

import { haversineKm } from '@/lib/utils/geoCalculations'
import {
  getContinent,
  countContinents,
  CONTINENT_TOTALS,
  type Continent,
} from '@/lib/utils/continents'
import {
  getTravelPersonality,
  type TravelPersonality,
} from '@/lib/utils/travel-personality'
import { parseLocalDate } from '@/lib/utils/travel-date'

/** Standard world-country count used by travel apps (UN members + observers). */
export const WORLD_COUNTRY_COUNT = 195

/**
 * The minimal album row shape the aggregator needs. `id`/`title` are not used
 * by the aggregation itself — they're typically present on caller rows and
 * flow back out through the generic (`firstTrip`/`latestTrip`/`sortedAlbums`
 * return the caller's own row type).
 */
export interface TravelStatsAlbum {
  id?: string
  title?: string
  location_name?: string | null
  country_code?: string | null
  latitude?: number | null
  longitude?: number | null
  date_start?: string | null
  created_at?: string | null
}

export interface ContinentProgress {
  name: Continent
  visited: number
  total: number
}

export interface TravelStats<T extends TravelStatsAlbum = TravelStatsAlbum> {
  totalTrips: number
  /** Distinct ISO-2 codes, uppercased, in chronological first-visit order. */
  countryCodes: string[]
  /** Share of the world's countries visited, 0–100 (rounded, capped). */
  countryPercentage: number
  /** Distinct city names (first segment of `location_name`), chronological. */
  cities: string[]
  /** Great-circle km between consecutive located albums, rounded. */
  totalDistanceKm: number
  continentsVisited: Continent[]
  continentProgress: ContinentProgress[]
  /** Distinct travel months, 1–12. */
  travelMonths: number[]
  /** Distinct years with at least one trip. */
  yearsActive: number
  personality: TravelPersonality
  /** Chronologically first album, or null when there are none. */
  firstTrip: T | null
  /**
   * Chronologically last album — null unless there is MORE than one, so UIs
   * don't render the same trip as both "first" and "latest".
   */
  latestTrip: T | null
  /** The input albums sorted by effective travel date (ascending). */
  sortedAlbums: T[]
}

/**
 * Effective travel date of an album: the user-entered travel date when
 * present, else the record's creation time. Date-only strings are parsed as
 * LOCAL calendar dates (see {@link parseLocalDate}) so bucketing by
 * year/month never shifts across timezones.
 */
export function albumTravelTime(album: TravelStatsAlbum): number {
  return parseLocalDate(album.date_start || album.created_at)?.getTime() ?? 0
}

/** First segment of a location name — "Paris, France" → "Paris". */
export function cityOf(locationName: string | null | undefined): string | undefined {
  const city = locationName?.split(',')[0]?.trim()
  return city || undefined
}

/**
 * Aggregate travel stats from a set of album rows.
 *
 * The caller decides what is visible (own albums, public-only, year-filtered,
 * …) — this function only counts what it is given. Photo counts are also the
 * caller's job: they come from a separate scoped query on every surface
 * (counting by album ids, not user id, to avoid leaking private volume).
 */
export function computeTravelStats<T extends TravelStatsAlbum>(
  albums: T[]
): TravelStats<T> {
  const sortedAlbums = [...albums].sort(
    (a, b) => albumTravelTime(a) - albumTravelTime(b)
  )

  const countryCodes: string[] = []
  const seenCountries = new Set<string>()
  const cities: string[] = []
  const seenCities = new Set<string>()
  const months = new Set<number>()
  const years = new Set<number>()

  let totalDistanceKm = 0
  let prevCoord: { lat: number; lng: number } | null = null

  for (const album of sortedAlbums) {
    const code = album.country_code?.toUpperCase()
    if (code && !seenCountries.has(code)) {
      seenCountries.add(code)
      countryCodes.push(code)
    }

    const city = cityOf(album.location_name)
    if (city && !seenCities.has(city)) {
      seenCities.add(city)
      cities.push(city)
    }

    const date = parseLocalDate(album.date_start || album.created_at)
    if (date) {
      months.add(date.getMonth() + 1)
      years.add(date.getFullYear())
    }

    if (album.latitude != null && album.longitude != null) {
      if (prevCoord) {
        totalDistanceKm += haversineKm(
          prevCoord.lat,
          prevCoord.lng,
          album.latitude,
          album.longitude
        )
      }
      prevCoord = { lat: album.latitude, lng: album.longitude }
    }
  }

  const visitedByContinent = new Map<Continent, number>()
  for (const code of countryCodes) {
    const continent = getContinent(code)
    if (continent) {
      visitedByContinent.set(continent, (visitedByContinent.get(continent) ?? 0) + 1)
    }
  }

  const continentProgress: ContinentProgress[] = (
    Object.entries(CONTINENT_TOTALS) as [Continent, number][]
  ).map(([name, total]) => ({
    name,
    visited: visitedByContinent.get(name) ?? 0,
    total,
  }))

  return {
    totalTrips: sortedAlbums.length,
    countryCodes,
    countryPercentage: Math.min(
      100,
      Math.round((countryCodes.length / WORLD_COUNTRY_COUNT) * 100)
    ),
    cities,
    totalDistanceKm: Math.round(totalDistanceKm),
    continentsVisited: [...visitedByContinent.keys()],
    continentProgress,
    travelMonths: [...months],
    yearsActive: years.size,
    personality: getTravelPersonality({
      countries: countryCodes.length,
      trips: sortedAlbums.length,
      cities: cities.length,
      continents: countContinents(countryCodes),
    }),
    firstTrip: sortedAlbums[0] ?? null,
    latestTrip: sortedAlbums.length > 1 ? sortedAlbums[sortedAlbums.length - 1] : null,
    sortedAlbums,
  }
}
