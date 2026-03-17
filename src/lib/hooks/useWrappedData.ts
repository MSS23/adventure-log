'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WrappedData {
  year: number | 'all'
  totalTrips: number
  totalPhotos: number
  countryCodes: string[]
  cities: string[]
  topAlbums: { id: string; title: string; location_name?: string; cover_photo_url?: string; like_count: number }[]
  firstTrip: { title: string; location_name?: string; date_start?: string } | null
  lastTrip: { title: string; location_name?: string; date_start?: string } | null
  travelMonths: number[]
  personality: string
  loading: boolean
  /** Number of distinct years with at least one trip */
  yearsActive: number
  /** Total distance between consecutive pins in km (great-circle) */
  totalDistanceKm: number
  locations: { lat: number; lng: number; name: string; date: string }[]
}

function getTravelPersonality(data: {
  totalTrips: number
  countryCodes: string[]
  cities: string[]
}): string {
  const { totalTrips, countryCodes, cities } = data
  if (countryCodes.length >= 10) return 'Globe Trotter'
  if (totalTrips >= 12) return 'Perpetual Nomad'
  if (cities.length >= 15) return 'City Explorer'
  if (countryCodes.length >= 5) return 'World Wanderer'
  if (totalTrips >= 6) return 'Adventure Seeker'
  if (totalTrips >= 3) return 'Weekend Explorer'
  if (totalTrips >= 1) return 'Rising Adventurer'
  return 'Future Explorer'
}

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const EMPTY_DATA: WrappedData = {
  year: 'all',
  totalTrips: 0,
  totalPhotos: 0,
  countryCodes: [],
  cities: [],
  topAlbums: [],
  firstTrip: null,
  lastTrip: null,
  travelMonths: [],
  personality: 'Future Explorer',
  loading: true,
  yearsActive: 0,
  totalDistanceKm: 0,
  locations: [],
}

/**
 * Fetch wrapped data for a user.
 * Pass `year` as a number for a specific year, or `'all'` for all-time stats.
 */
export function useWrappedData(userId: string | undefined, year?: number | 'all'): WrappedData {
  const mode = year ?? new Date().getFullYear()
  const [data, setData] = useState<WrappedData>({ ...EMPTY_DATA, year: mode })

  useEffect(() => {
    // Keep loading true while waiting for auth
    if (!userId) return

    let cancelled = false

    // Reset to loading when userId or mode changes
    setData(prev => ({ ...prev, loading: true, year: mode }))

    const fetchData = async () => {
      const supabase = createClient()

      let query = supabase
        .from('albums')
        .select('id, title, location_name, country_code, date_start, created_at, cover_photo_url, latitude, longitude, photos(id)')
        .eq('user_id', userId)

      if (mode !== 'all') {
        const yearStart = `${mode}-01-01`
        const yearEnd = `${mode}-12-31`
        query = query.gte('date_start', yearStart).lte('date_start', yearEnd)
      }

      query = query.order('date_start', { ascending: true })

      const { data: albums } = await query

      if (cancelled) return

      if (!albums || albums.length === 0) {
        // Fallback: try created_at if no date_start results
        let fallbackQuery = supabase
          .from('albums')
          .select('id, title, location_name, country_code, date_start, created_at, cover_photo_url, latitude, longitude, photos(id)')
          .eq('user_id', userId)

        if (mode !== 'all') {
          const yearStart = `${mode}-01-01`
          const yearEnd = `${mode}-12-31`
          fallbackQuery = fallbackQuery.gte('created_at', yearStart).lte('created_at', yearEnd)
        }

        fallbackQuery = fallbackQuery.order('created_at', { ascending: true })

        const { data: fallbackAlbums } = await fallbackQuery

        if (cancelled) return

        if (!fallbackAlbums || fallbackAlbums.length === 0) {
          setData({ ...EMPTY_DATA, year: mode, loading: false })
          return
        }

        processAlbums(fallbackAlbums)
        return
      }

      processAlbums(albums)

      function processAlbums(albumList: NonNullable<typeof albums>) {
        if (cancelled) return

        const totalPhotos = albumList.reduce((sum, a) => sum + (a.photos?.length || 0), 0)
        const countryCodes = [...new Set(albumList.filter(a => a.country_code).map(a => a.country_code as string))]
        const cities = [...new Set(albumList.filter(a => a.location_name).map(a => a.location_name!.split(',')[0]?.trim()))]

        const months = albumList
          .map(a => {
            const dateStr = a.date_start || a.created_at
            return dateStr ? new Date(dateStr).getMonth() + 1 : null
          })
          .filter((m): m is number => m !== null)
        const uniqueMonths = [...new Set(months)]

        const years = albumList
          .map(a => {
            const dateStr = a.date_start || a.created_at
            return dateStr ? new Date(dateStr).getFullYear() : null
          })
          .filter((y): y is number => y !== null)
        const yearsActive = new Set(years).size

        const topAlbums = albumList
          .map(a => ({
            id: a.id,
            title: a.title,
            location_name: a.location_name || undefined,
            cover_photo_url: a.cover_photo_url || undefined,
            like_count: a.photos?.length || 0,
          }))
          .sort((a, b) => b.like_count - a.like_count)
          .slice(0, 3)

        const firstTrip = albumList[0]
          ? { title: albumList[0].title, location_name: albumList[0].location_name || undefined, date_start: albumList[0].date_start || undefined }
          : null
        const lastTrip = albumList[albumList.length - 1]
          ? { title: albumList[albumList.length - 1].title, location_name: albumList[albumList.length - 1].location_name || undefined, date_start: albumList[albumList.length - 1].date_start || undefined }
          : null

        const locations: { lat: number; lng: number; name: string; date: string }[] = []
        let totalDistanceKm = 0
        for (const a of albumList) {
          if (a.latitude && a.longitude) {
            const dateStr = a.date_start || a.created_at || ''
            const loc = { lat: a.latitude, lng: a.longitude, name: a.location_name?.split(',')[0]?.trim() || a.title, date: dateStr }
            if (locations.length > 0) {
              const prev = locations[locations.length - 1]
              totalDistanceKm += haversineKm(prev.lat, prev.lng, loc.lat, loc.lng)
            }
            locations.push(loc)
          }
        }

        const personality = getTravelPersonality({ totalTrips: albumList.length, countryCodes, cities })

        setData({
          year: mode,
          totalTrips: albumList.length,
          totalPhotos,
          countryCodes,
          cities,
          topAlbums,
          firstTrip,
          lastTrip,
          travelMonths: uniqueMonths,
          personality,
          loading: false,
          yearsActive,
          totalDistanceKm: Math.round(totalDistanceKm),
          locations,
        })
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [userId, mode])

  return data
}
