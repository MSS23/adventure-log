'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { computeTravelStats } from '@/lib/utils/travel-stats'
import { parseLocalDate } from '@/lib/utils/travel-date'

export interface WrappedData {
  year: number | 'all'
  totalTrips: number
  totalPhotos: number
  countryCodes: string[]
  /** Share of the world's ~195 countries visited, 0–100 (rounded). */
  countryPercentage: number
  cities: string[]
  topAlbums: { id: string; title: string; location_name?: string; cover_photo_url?: string; photo_count: number }[]
  firstTrip: { title: string; location_name?: string; date_start?: string } | null
  lastTrip: { title: string; location_name?: string; date_start?: string } | null
  travelMonths: number[]
  personality: string
  loading: boolean
  /** Number of distinct years with at least one trip */
  yearsActive: number
  /** Total distance between consecutive pins in km (great-circle) */
  totalDistanceKm: number
  /** Whether the account has ANY photo-bearing trips at all (all-time),
   *  regardless of the selected year — drives empty-state messaging without
   *  a second all-time query. */
  hasAnyTrips: boolean
  /** Chronologically sorted locations used for the flight-reel playback. */
  locations: {
    lat: number
    lng: number
    name: string
    date: string
    albumId?: string
    /** Cover photo URL — used by the flight-reel overlay to showcase each
     *  album as the plane lands. Resolved via getPhotoUrl() server-side. */
    coverUrl?: string
    /** Album title (the user-given name; `name` above is the city/short label). */
    albumTitle?: string
    /** ISO 2-letter country code, when known. */
    country?: string
  }[]
}

interface WrappedAlbum {
  id: string
  title: string
  location_name: string | null
  country_code: string | null
  date_start: string | null
  created_at: string
  cover_photo_url: string | null
  latitude: number | null
  longitude: number | null
  photos: { id: string; file_path: string }[] | null
}

const EMPTY_DATA: Omit<WrappedData, 'year' | 'loading' | 'hasAnyTrips'> = {
  totalTrips: 0,
  totalPhotos: 0,
  countryCodes: [],
  countryPercentage: 0,
  cities: [],
  topAlbums: [],
  firstTrip: null,
  lastTrip: null,
  travelMonths: [],
  personality: 'Future Explorer',
  yearsActive: 0,
  totalDistanceKm: 0,
  locations: [],
}

/**
 * Fetch wrapped data for a user.
 * Pass `year` as a number for a specific year, or `'all'` for all-time stats.
 *
 * Fetches the user's albums ONCE (keyed by userId) and derives the selected
 * view in memory — switching between "this year" and "all-time" is instant
 * and costs no extra queries. (The previous version ran the full album query
 * once per mode, and the page mounted it twice.)
 */
export function useWrappedData(userId: string | undefined, year?: number | 'all'): WrappedData {
  const mode = year ?? new Date().getFullYear()
  const [albums, setAlbums] = useState<WrappedAlbum[] | null>(null)

  useEffect(() => {
    // Keep loading true while waiting for auth
    if (!userId) return

    let cancelled = false
    setAlbums(null)

    const fetchData = async () => {
      const supabase = createClient()

      const { data: allAlbums } = await supabase
        .from('albums')
        .select('id, title, location_name, country_code, date_start, created_at, cover_photo_url, latitude, longitude, photos(id, file_path)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (cancelled) return

      // Filter out empty albums (drafts with no photos)
      setAlbums((allAlbums || []).filter(a => (a.photos?.length || 0) > 0))
    }

    fetchData()

    return () => { cancelled = true }
  }, [userId])

  return useMemo<WrappedData>(() => {
    if (albums === null) {
      return { ...EMPTY_DATA, year: mode, loading: true, hasAnyTrips: false }
    }

    const hasAnyTrips = albums.length > 0

    // Filter by year if not "all" — check both date_start and created_at
    const selected = mode === 'all'
      ? albums
      : albums.filter(a => parseLocalDate(a.date_start || a.created_at)?.getFullYear() === mode)

    if (selected.length === 0) {
      return { ...EMPTY_DATA, year: mode, loading: false, hasAnyTrips }
    }

    const stats = computeTravelStats(selected)

    const totalPhotos = selected.reduce((sum, a) => sum + (a.photos?.length || 0), 0)

    const topAlbums = [...selected]
      .map(a => ({
        id: a.id,
        title: a.title,
        location_name: a.location_name || undefined,
        cover_photo_url: getPhotoUrl(a.cover_photo_url || a.photos?.[0]?.file_path),
        photo_count: a.photos?.length || 0,
      }))
      .sort((a, b) => b.photo_count - a.photo_count)
      .slice(0, 3)

    const locations: WrappedData['locations'] = []
    for (const a of stats.sortedAlbums) {
      if (a.latitude != null && a.longitude != null) {
        locations.push({
          lat: a.latitude,
          lng: a.longitude,
          name: a.location_name?.split(',')[0]?.trim() || a.title,
          date: a.date_start || a.created_at || '',
          albumId: a.id,
          coverUrl: getPhotoUrl(a.cover_photo_url || a.photos?.[0]?.file_path),
          albumTitle: a.title,
          country: a.country_code || undefined,
        })
      }
    }

    const first = stats.sortedAlbums[0]
    const last = stats.sortedAlbums[stats.sortedAlbums.length - 1]

    return {
      year: mode,
      totalTrips: stats.totalTrips,
      totalPhotos,
      countryCodes: stats.countryCodes,
      countryPercentage: stats.countryPercentage,
      cities: stats.cities,
      topAlbums,
      firstTrip: first
        ? { title: first.title, location_name: first.location_name || undefined, date_start: first.date_start || undefined }
        : null,
      lastTrip: last
        ? { title: last.title, location_name: last.location_name || undefined, date_start: last.date_start || undefined }
        : null,
      travelMonths: stats.travelMonths,
      personality: stats.personality.type,
      loading: false,
      yearsActive: stats.yearsActive,
      totalDistanceKm: stats.totalDistanceKm,
      hasAnyTrips,
      locations,
    }
  }, [albums, mode])
}
