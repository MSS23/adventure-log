'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { type TravelYearsApiResponse, type PhotoApiResponse } from '@/types/globe'

interface TravelLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  type: 'city' | 'island' | 'country'
  visitDate: Date
  albums: Album[]
  photos: Photo[]
  duration?: number // days spent at location
  airportCode?: string
  timezone?: string
  islandGroup?: string
}

interface Album {
  id: string
  title: string
  photoCount: number
}

interface Photo {
  id: string
  url: string
  caption?: string
}

interface YearTravelData {
  year: number
  locations: TravelLocation[]
  totalLocations: number
  totalPhotos: number
  countries: string[]
  totalDistance: number
  startDate: Date | null
  endDate: Date | null
}

interface UseTravelTimelineReturn {
  availableYears: number[]
  yearData: Record<number, YearTravelData>
  loading: boolean
  error: string | null
  selectedYear: number | null
  setSelectedYear: (year: number | null) => void
  refreshData: () => Promise<void>
  getYearData: (year: number) => YearTravelData | null
}

export function useTravelTimeline(): UseTravelTimelineReturn {
  const { user } = useAuth()
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [yearData, setYearData] = useState<Record<number, YearTravelData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const supabase = createClient()

  /**
   * Fetch available years with travel data
   */
  const fetchAvailableYears = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .rpc('get_user_travel_years', {
          user_id_param: user.id
        })

      if (error) throw error

      const years = data?.map((item: TravelYearsApiResponse) => item.year) || []
      setAvailableYears(years.sort((a: number, b: number) => b - a))

      // Auto-select most recent year
      if (years.length > 0 && !selectedYear) {
        setSelectedYear(years[0])
      }
    } catch (err) {
      console.error('Error fetching available years:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch available years')
    }
  }, [user?.id, selectedYear, supabase])

  /**
   * Fetch detailed travel data for a specific year
   */
  const fetchYearData = useCallback(async (year: number): Promise<YearTravelData | null> => {
    if (!user?.id) return null

    try {
      // Fetch travel timeline for the year
      const { data: timelineData, error: timelineError } = await supabase
        .rpc('get_user_travel_by_year', {
          user_id_param: user.id,
          year_param: year
        })

      if (timelineError) throw timelineError

      if (!timelineData || timelineData.length === 0) {
        return {
          year,
          locations: [],
          totalLocations: 0,
          totalPhotos: 0,
          countries: [],
          totalDistance: 0,
          startDate: null,
          endDate: null
        }
      }

      // Process timeline data into travel locations
      const locations: TravelLocation[] = []
      const countriesSet = new Set<string>()
      let totalPhotos = 0
      let startDate: Date | null = null
      let endDate: Date | null = null

      for (const item of timelineData) {
        const visitDate = new Date(item.visit_date)

        if (!startDate || visitDate < startDate) {
          startDate = visitDate
        }
        if (!endDate || visitDate > endDate) {
          endDate = visitDate
        }

        if (item.country_code) {
          countriesSet.add(item.country_code)
        }

        totalPhotos += item.photo_count || 0

        // Fetch album details for this location
        const { data: albumsData } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            photos(id, url, caption)
          `)
          .eq('id', item.album_id)

        const albums: Album[] = albumsData?.map(album => ({
          id: album.id,
          title: album.title,
          photoCount: album.photos?.length || 0
        })) || []

        const photos: Photo[] = albumsData?.flatMap(album =>
          album.photos?.map((photo: PhotoApiResponse) => ({
            id: photo.id,
            url: photo.url,
            caption: photo.caption
          })) || []
        ) || []

        const location: TravelLocation = {
          id: item.album_id,
          name: item.location_name || `Location ${item.sequence_order}`,
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
          type: item.location_type as 'city' | 'island' | 'country',
          visitDate,
          duration: item.duration_days,
          albums,
          photos,
          airportCode: item.airport_code,
          timezone: item.timezone,
          islandGroup: item.island_group
        }

        locations.push(location)
      }

      // Calculate total distance traveled
      let totalDistance = 0
      for (let i = 0; i < locations.length - 1; i++) {
        const start = locations[i]
        const end = locations[i + 1]
        const distance = calculateDistance(start, end)
        totalDistance += distance
      }

      const yearTravelData: YearTravelData = {
        year,
        locations,
        totalLocations: locations.length,
        totalPhotos,
        countries: Array.from(countriesSet),
        totalDistance,
        startDate,
        endDate
      }

      return yearTravelData
    } catch (err) {
      console.error(`Error fetching year data for ${year}:`, err)
      throw err
    }
  }, [user?.id, supabase])

  /**
   * Calculate distance between two locations
   */
  const calculateDistance = (loc1: TravelLocation, loc2: TravelLocation): number => {
    const R = 6371 // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      await fetchAvailableYears()

      // Clear existing year data to force refresh
      setYearData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [fetchAvailableYears, user?.id])

  /**
   * Get cached year data or fetch if not available
   */
  const getYearData = useCallback((year: number): YearTravelData | null => {
    return yearData[year] || null
  }, [yearData])

  // Load year data when selected year changes
  useEffect(() => {
    if (selectedYear && !yearData[selectedYear]) {
      setLoading(true)
      fetchYearData(selectedYear)
        .then(data => {
          if (data) {
            setYearData(prev => ({ ...prev, [selectedYear]: data }))
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to load year data')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [selectedYear, yearData, fetchYearData])

  // Initial data load
  useEffect(() => {
    if (user?.id) {
      refreshData()
    }
  }, [user?.id, refreshData])

  return {
    availableYears,
    yearData,
    loading,
    error,
    selectedYear,
    setSelectedYear,
    refreshData,
    getYearData
  }
}

export type {
  TravelLocation,
  YearTravelData,
  Album,
  Photo,
  UseTravelTimelineReturn
}