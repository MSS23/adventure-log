'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WrappedData {
  year: number
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

export function useWrappedData(userId: string | undefined, year?: number): WrappedData {
  const targetYear = year || new Date().getFullYear()
  const [data, setData] = useState<WrappedData>({
    year: targetYear,
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
  })

  useEffect(() => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }

    const fetchData = async () => {
      const supabase = createClient()
      const yearStart = `${targetYear}-01-01`
      const yearEnd = `${targetYear}-12-31`

      // Fetch albums with photos count for this year
      const { data: albums } = await supabase
        .from('albums')
        .select('id, title, location_name, country_code, date_start, cover_photo_url, photos(id)')
        .eq('user_id', userId)
        .gte('date_start', yearStart)
        .lte('date_start', yearEnd)
        .order('date_start', { ascending: true })

      if (!albums || albums.length === 0) {
        // Try created_at if no date_start results
        const { data: fallbackAlbums } = await supabase
          .from('albums')
          .select('id, title, location_name, country_code, date_start, created_at, cover_photo_url, photos(id)')
          .eq('user_id', userId)
          .gte('created_at', yearStart)
          .lte('created_at', yearEnd)
          .order('created_at', { ascending: true })

        if (!fallbackAlbums || fallbackAlbums.length === 0) {
          setData(prev => ({ ...prev, loading: false }))
          return
        }

        processAlbums(fallbackAlbums)
        return
      }

      processAlbums(albums)

      function processAlbums(albumList: typeof albums) {
        if (!albumList) return

        const totalPhotos = albumList.reduce((sum, a) => sum + (a.photos?.length || 0), 0)
        const countryCodes = [...new Set(albumList.filter(a => a.country_code).map(a => a.country_code as string))]
        const cities = [...new Set(albumList.filter(a => a.location_name).map(a => a.location_name!.split(',')[0]?.trim()))]

        // Get travel months (1-12)
        const months = albumList
          .map(a => {
            const dateStr = a.date_start || (a as Record<string, unknown>).created_at as string
            return dateStr ? new Date(dateStr).getMonth() + 1 : null
          })
          .filter((m): m is number => m !== null)
        const uniqueMonths = [...new Set(months)]

        // Top albums by like count (approximate by photo count for now)
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

        const personality = getTravelPersonality({ totalTrips: albumList.length, countryCodes, cities })

        setData({
          year: targetYear,
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
        })
      }
    }

    fetchData()
  }, [userId, targetYear])

  return data
}
