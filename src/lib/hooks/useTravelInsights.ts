'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

interface Album {
  id: string
  title: string
  location_name?: string
  country_code?: string
  latitude?: number
  longitude?: number
  date_start?: string
  date_end?: string
  created_at: string
  status?: string
}

interface SeasonalData {
  label: string
  value: number
  color: string
}

interface ContinentData {
  label: string
  value: number
}

interface TravelInsightsData {
  seasonalTravel: SeasonalData[]
  continentTravel: ContinentData[]
  travelFrequency: number
  photosPerAlbum: number
  explorerLevel: number
  milesTraveled: number
  daysTraveling: number
}

// Mapping of countries to continents
const countryToContinent: Record<string, string> = {
  // Europe
  'Spain': 'Europe',
  'France': 'Europe',
  'Germany': 'Europe',
  'Italy': 'Europe',
  'United Kingdom': 'Europe',
  'UK': 'Europe',
  'Portugal': 'Europe',
  'Greece': 'Europe',
  'Netherlands': 'Europe',
  'Belgium': 'Europe',
  'Switzerland': 'Europe',
  'Austria': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'Poland': 'Europe',
  'Czech Republic': 'Europe',
  'Ireland': 'Europe',
  'Croatia': 'Europe',

  // North America
  'United States': 'North America',
  'USA': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',

  // South America
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Peru': 'South America',
  'Colombia': 'South America',
  'Ecuador': 'South America',

  // Asia
  'China': 'Asia',
  'Japan': 'Asia',
  'South Korea': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Singapore': 'Asia',
  'Malaysia': 'Asia',
  'Indonesia': 'Asia',
  'Philippines': 'Asia',
  'India': 'Asia',
  'United Arab Emirates': 'Asia',
  'UAE': 'Asia',

  // Africa
  'South Africa': 'Africa',
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'Kenya': 'Africa',
  'Tanzania': 'Africa',

  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'Fiji': 'Oceania',
}

function getContinent(countryName: string): string {
  // Try exact match first
  if (countryToContinent[countryName]) {
    return countryToContinent[countryName]
  }

  // Try partial match
  for (const [country, continent] of Object.entries(countryToContinent)) {
    if (countryName.includes(country) || country.includes(countryName)) {
      return continent
    }
  }

  // Default to showing as unknown
  return 'Other'
}

function getSeason(dateString: string): string {
  const date = new Date(dateString)
  const month = date.getMonth() // 0-11

  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

export function useTravelInsights() {
  const { user } = useAuth()
  const [data, setData] = useState<TravelInsightsData>({
    seasonalTravel: [],
    continentTravel: [],
    travelFrequency: 0,
    photosPerAlbum: 0,
    explorerLevel: 0,
    milesTraveled: 0,
    daysTraveling: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchInsights = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch all albums with photos count
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          location_name,
          country_code,
          latitude,
          longitude,
          date_start,
          date_end,
          created_at,
          status
        `)
        .eq('user_id', user.id)
        .neq('status', 'draft')

      if (albumsError) throw albumsError

      // Fetch total photos
      const { count: photoCount, error: photosError } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (photosError) throw photosError

      const albumsData = (albums || []) as Album[]
      const totalPhotos = photoCount || 0

      // Calculate seasonal travel
      const seasonCounts: Record<string, number> = {
        Spring: 0,
        Summer: 0,
        Fall: 0,
        Winter: 0,
      }

      albumsData.forEach(album => {
        const dateToUse = album.date_start || album.created_at
        if (dateToUse) {
          const season = getSeason(dateToUse)
          seasonCounts[season]++
        }
      })

      const seasonalTravel: SeasonalData[] = [
        { label: 'Spring', value: seasonCounts.Spring, color: '#10B981' },
        { label: 'Summer', value: seasonCounts.Summer, color: '#F59E0B' },
        { label: 'Fall', value: seasonCounts.Fall, color: '#EF4444' },
        { label: 'Winter', value: seasonCounts.Winter, color: '#3B82F6' },
      ]

      // Calculate continent travel
      const continentCounts: Record<string, number> = {}

      albumsData.forEach(album => {
        if (album.location_name) {
          // Extract country from location_name (last part after comma)
          const parts = album.location_name.split(',').map(p => p.trim())
          const country = parts[parts.length - 1]
          const continent = getContinent(country)
          continentCounts[continent] = (continentCounts[continent] || 0) + 1
        }
      })

      const continentTravel: ContinentData[] = [
        { label: 'Europe', value: continentCounts['Europe'] || 0 },
        { label: 'Asia', value: continentCounts['Asia'] || 0 },
        { label: 'North America', value: continentCounts['North America'] || 0 },
        { label: 'South America', value: continentCounts['South America'] || 0 },
        { label: 'Africa', value: continentCounts['Africa'] || 0 },
        { label: 'Oceania', value: continentCounts['Oceania'] || 0 },
      ].filter(c => c.value > 0) // Only show continents with visits

      // Calculate travel frequency (trips per year)
      let travelFrequency = 0
      if (albumsData.length > 0) {
        const oldestAlbum = albumsData.reduce((oldest, album) => {
          const albumDate = new Date(album.date_start || album.created_at)
          const oldestDate = new Date(oldest.date_start || oldest.created_at)
          return albumDate < oldestDate ? album : oldest
        })

        const yearsSinceFirst = Math.max(
          (Date.now() - new Date(oldestAlbum.date_start || oldestAlbum.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365),
          1
        )
        travelFrequency = parseFloat((albumsData.length / yearsSinceFirst).toFixed(1))
      }

      // Calculate photos per album
      const photosPerAlbum = albumsData.length > 0
        ? parseFloat((totalPhotos / albumsData.length).toFixed(1))
        : 0

      // Calculate explorer level (1-100 based on countries and cities visited)
      const uniqueCountries = new Set(
        albumsData
          .filter(a => a.location_name)
          .map(a => {
            const parts = a.location_name!.split(',').map(p => p.trim())
            return parts[parts.length - 1]
          })
      ).size

      const uniqueCities = new Set(
        albumsData
          .filter(a => a.location_name)
          .map(a => {
            const parts = a.location_name!.split(',').map(p => p.trim())
            return parts[0]
          })
      ).size

      const explorerLevel = Math.min(
        Math.round((uniqueCountries * 10 + uniqueCities * 2) / 10),
        100
      )

      // Estimate miles traveled (rough estimate: 500 miles per country visited)
      const milesTraveled = uniqueCountries * 500 + uniqueCities * 100

      // Estimate days traveling (average 3-4 days per album)
      const daysTraveling = Math.round(albumsData.length * 3.5)

      setData({
        seasonalTravel,
        continentTravel,
        travelFrequency,
        photosPerAlbum,
        explorerLevel,
        milesTraveled,
        daysTraveling,
      })
    } catch (error) {
      log.error('Error fetching travel insights', { userId: user.id }, error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchInsights()
    }
  }, [user?.id, fetchInsights])

  return { data, loading, refresh: fetchInsights }
}
