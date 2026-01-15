'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { canViewContent, type VisibilityLevel } from '@/lib/utils/privacy'

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
  coverPhotoUrl?: string
  favoritePhotoUrls?: string[]
  userId?: string
  visibility?: string
  profilePrivacyLevel?: string
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

export function useTravelTimeline(filterUserId?: string, instanceId?: string): UseTravelTimelineReturn {
  const { user } = useAuth()
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [yearData, setYearData] = useState<Record<number, YearTravelData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Use filterUserId if provided, otherwise use current user's ID
  const targetUserId = filterUserId || user?.id

  /**
   * Fetch available years with travel data
   */
  const fetchAvailableYears = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false)
      return
    }

    try {
      // Build query with privacy filter
      let query = supabase
        .from('albums')
        .select('id, created_at, date_start, location_name, latitude, longitude, visibility')
        .eq('user_id', targetUserId)
        .neq('status', 'draft')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      // Apply privacy filters
      const isOwnProfile = user?.id === targetUserId
      if (!isOwnProfile) {
        // Viewing someone else's profile: only show public albums
        // (friends-only will be filtered in fetchYearData with full privacy check)
        query = query.eq('visibility', 'public')
      }
      // If viewing own profile, show all albums (no additional filter needed)

      const { data, error } = await query

      if (error) throw error

      // Extract unique years and count locations per year
      const yearLocationCounts = new Map<number, Set<string>>()

      data?.forEach(album => {
        // Prioritize date_start over created_at for travel year
        const dateField = album.date_start || album.created_at
        if (dateField) {
          const year = new Date(dateField).getFullYear()

          // Track unique locations per year (by location name or coordinates)
          if (!yearLocationCounts.has(year)) {
            yearLocationCounts.set(year, new Set())
          }

          // Use location name or coordinates as unique identifier
          const locationKey = album.location_name || `${album.latitude},${album.longitude}`
          yearLocationCounts.get(year)!.add(locationKey)
        }
      })

      const years = Array.from(yearLocationCounts.keys()).sort((a: number, b: number) => b - a)
      setAvailableYears(years)

      // Pre-populate yearData with basic counts so badges show correct numbers immediately
      const basicYearData: Record<number, YearTravelData> = {}
      yearLocationCounts.forEach((locations, year) => {
        basicYearData[year] = {
          year,
          locations: [], // Will be populated on-demand when year is selected
          totalLocations: locations.size,
          totalPhotos: 0, // Will be calculated on-demand
          countries: [],
          totalDistance: 0,
          startDate: null,
          endDate: null
        }
      })
      setYearData(basicYearData)

      setLoading(false)
    } catch (err) {
      log.error('Error fetching available years', { component: 'useTravelTimeline', userId: targetUserId }, err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to load travel timeline'
      setError(errorMsg)
      setLoading(false)
      // Don't throw - let the component display the error
    }
  }, [supabase, targetUserId, user?.id])

  /**
   * Fetch detailed travel data for a specific year
   */
  const fetchYearData = useCallback(async (year: number): Promise<YearTravelData | null> => {
    if (!user?.id) return null

    try {
      // Fetch albums for the year with location and photo data
      // const yearStart = new Date(year, 0, 1).toISOString()
      // const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString()

      // Fetch all albums for the user with location data (exclude drafts)
      const { data: allAlbums, error: timelineError } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          location_name,
          country_code,
          latitude,
          longitude,
          created_at,
          date_start,
          cover_photo_url,
          favorite_photo_urls,
          visibility,
          status,
          photos(id, file_path)
        `, { count: 'exact' })
        .eq('user_id', targetUserId)
        .neq('status', 'draft')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('date_start', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (timelineError) throw timelineError

      // Filter albums by privacy and year
      const privacyFilteredAlbums: typeof allAlbums = []
      for (const album of allAlbums || []) {
        // Exclude drafts (status='draft' OR no photos)
        const isDraft = album.status === 'draft' || !album.photos || album.photos.length === 0
        if (isDraft) continue

        // Filter by year
        const dateField = album.date_start || album.created_at
        if (!dateField) continue
        const albumYear = new Date(dateField).getFullYear()
        if (albumYear !== year) continue

        // Check privacy permissions
        const canView = await canViewContent({
          contentId: album.id,
          contentType: 'album',
          contentOwnerId: targetUserId || '',
          contentVisibility: (album.visibility || 'public') as VisibilityLevel,
          currentUserId: user?.id
        })

        if (canView) {
          privacyFilteredAlbums.push(album)
        }
      }

      const timelineData = privacyFilteredAlbums

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

      // Batch query photo counts for all albums
      const albumIds = timelineData.map(item => item.id)
      const photoCounts = new Map<string, number>()

      // Query photo counts in parallel
      const photoCountQueries = albumIds.map(async (albumId) => {
        const { count } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('album_id', albumId)
        return { albumId, count: count || 0 }
      })

      const photoCountResults = await Promise.all(photoCountQueries)
      photoCountResults.forEach(({ albumId, count }) => {
        photoCounts.set(albumId, count)
      })

      // Process timeline data into travel locations
      const locations: TravelLocation[] = []
      const countriesSet = new Set<string>()
      let totalPhotos = 0
      let startDate: Date | null = null
      let endDate: Date | null = null

      for (const item of timelineData) {
        // Safe date parsing - prioritize travel date over upload date
        const dateField = item.date_start || item.created_at
        const visitDate = dateField ? new Date(dateField) : new Date()
        // Check if the date is valid
        if (isNaN(visitDate.getTime())) {
          visitDate.setTime(new Date().getTime()) // Fallback to current date
        }

        if (!startDate || visitDate < startDate) {
          startDate = visitDate
        }
        if (!endDate || visitDate > endDate) {
          endDate = visitDate
        }

        if (item.country_code) {
          countriesSet.add(item.country_code)
        }

        // Get photo count from our batch query
        const photoCount = photoCounts.get(item.id) || 0
        totalPhotos += photoCount

        const locationName = [item.location_name, item.country_code]
          .filter(Boolean)
          .join(', ') || 'Unknown Location'

        // Get cover photo URL - use cover_photo_url or first photo
        let coverPhotoUrl: string | undefined = undefined

        // First, try the cover_photo_url field
        const coverPhotoPath = item.cover_photo_url
        if (coverPhotoPath) {
          // Convert file path to public URL
          const { data } = supabase.storage.from('photos').getPublicUrl(coverPhotoPath)
          if (data.publicUrl && data.publicUrl.startsWith('http')) {
            coverPhotoUrl = data.publicUrl
          }
        }

        // Fallback to first photo if no cover photo is set
        if (!coverPhotoUrl && item.photos && item.photos.length > 0 && item.photos[0].file_path) {
          const { data } = supabase.storage.from('photos').getPublicUrl(item.photos[0].file_path)
          if (data.publicUrl && data.publicUrl.startsWith('http')) {
            coverPhotoUrl = data.publicUrl
          }
        }

        // Get favorite photo URLs if available
        let favoritePhotoUrls: string[] | undefined = undefined
        if (item.favorite_photo_urls && Array.isArray(item.favorite_photo_urls)) {
          favoritePhotoUrls = item.favorite_photo_urls
            .map(path => {
              const { data } = supabase.storage.from('photos').getPublicUrl(path)
              return (data.publicUrl && data.publicUrl.startsWith('http')) ? data.publicUrl : ''
            })
            .filter(url => url) // Filter out invalid URLs
        }

        // Create album object with all necessary data
        const albumData: Album = {
          id: item.id,
          title: item.title || locationName,
          photoCount,
          coverPhotoUrl,
          favoritePhotoUrls,
          userId: targetUserId,
          visibility: item.visibility
        }

        // Create photo objects - convert file paths to public URLs
        const photoData: Photo[] = Array.isArray(item.photos)
          ? item.photos.slice(0, 5).map(photo => {
              const { data } = supabase.storage.from('photos').getPublicUrl(photo.file_path)
              // Validate the URL before using it
              const photoUrl = (data.publicUrl && data.publicUrl.startsWith('http')) ? data.publicUrl : ''
              return {
                id: photo.id,
                url: photoUrl,
                caption: undefined
              }
            }).filter(photo => photo.url) // Filter out photos with invalid URLs
          : []

        const location: TravelLocation = {
          id: item.id,
          name: locationName,
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
          type: 'city',
          visitDate,
          albums: [albumData],
          photos: photoData
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
      log.error(`Error fetching year data for ${year}`, {
        component: 'useTravelTimeline',
        year,
        userId: user?.id,
        errorType: err instanceof Error ? err.name : 'Unknown'
      }, err instanceof Error ? err : new Error(String(err)))

      // Return empty year data instead of throwing to prevent UI crashes
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
  }, [supabase, targetUserId, user?.id])

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
    // Check if we need to fetch full data for selected year
    const needsFullData = selectedYear && (!yearData[selectedYear] || yearData[selectedYear].locations.length === 0)

    // Check if we need to fetch all year data (when selectedYear is null - "All Years")
    const needsAllYearData = selectedYear === null && availableYears.length > 0 &&
      availableYears.some(year => !yearData[year] || yearData[year].locations.length === 0)

    if (needsFullData) {
      setLoading(true)
      setError(null)

      fetchYearData(selectedYear)
        .then(data => {
          if (data) {
            setYearData(prev => ({ ...prev, [selectedYear]: data }))
            // Clear error if data loads successfully
            if (data.locations.length > 0) {
              setError(null)
            }
          }
        })
        .catch(err => {
          log.error('Failed to load year data in effect', {
            component: 'useTravelTimeline',
            year: selectedYear,
            userId: user?.id
          }, err instanceof Error ? err : new Error(String(err)))

          setError(err instanceof Error ? err.message : 'Failed to load year data')
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (needsAllYearData) {
      // Load all year data when "All Years" is selected
      setLoading(true)
      setError(null)

      Promise.all(
        availableYears.map(year =>
          fetchYearData(year).then(data => ({ year, data }))
        )
      )
        .then(results => {
          const newYearData = { ...yearData }
          results.forEach(({ year, data }) => {
            if (data) {
              newYearData[year] = data
            }
          })
          setYearData(newYearData)
          setError(null)
        })
        .catch(err => {
          log.error('Failed to load all year data', {
            component: 'useTravelTimeline',
            userId: user?.id
          }, err instanceof Error ? err : new Error(String(err)))

          setError(err instanceof Error ? err.message : 'Failed to load all year data')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [selectedYear, yearData, fetchYearData, user?.id, availableYears])

  // Real-time subscriptions for automatic updates
  useEffect(() => {
    if (!targetUserId) return

    // Debounce refresh to prevent rapid successive calls
    let refreshTimeout: NodeJS.Timeout | null = null
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(async () => {
        await fetchAvailableYears()
      }, 1000) // Wait 1 second before refreshing
    }

    // Subscribe to albums table changes for this user
    // Use instanceId to create unique channels per globe instance
    const albumsSubscription = supabase
      .channel(`albums-changes-${targetUserId}-${instanceId || 'default'}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'albums',
          filter: `user_id=eq.${targetUserId}` // Only listen to this user's albums
        },
        (payload) => {
          log.info('Album change detected, refreshing globe data', {
            component: 'useTravelTimeline',
            action: 'realtime-album-change',
            event: payload.eventType,
            albumId: (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id
          })

          // Debounced refresh
          debouncedRefresh()
        }
      )
      .subscribe()

    // Subscribe to photos table changes (in case photos with location are added)
    const photosSubscription = supabase
      .channel(`photos-changes-${targetUserId}-${instanceId || 'default'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload) => {
          // Only refresh if the photo has location data
          const photo = (payload.new || payload.old) as { latitude?: number; longitude?: number; id?: string } | null
          if (photo && (photo.latitude || photo.longitude)) {
            log.info('Photo with location change detected, refreshing globe data', {
              component: 'useTravelTimeline',
              action: 'realtime-photo-change',
              event: payload.eventType,
              photoId: photo.id
            })

            // Debounced refresh
            debouncedRefresh()
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      albumsSubscription.unsubscribe()
      photosSubscription.unsubscribe()
    }
  }, [targetUserId, supabase, fetchAvailableYears, instanceId])

  // Initial data load
  useEffect(() => {
    if (targetUserId) {
      fetchAvailableYears()
    }
  }, [targetUserId, fetchAvailableYears])

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