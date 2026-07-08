'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log, toError } from '@/lib/utils/logger'
import { areFriends, type VisibilityLevel } from '@/lib/utils/privacy'
import { formatLocationLabel } from '@/lib/utils/country'
import { parseLocalDate } from '@/lib/utils/travel-date'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { haversineKm } from '@/lib/utils/geoCalculations'
import { runQueryWithRetry } from '@/lib/utils/query-retry'

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
  // Explicit journey link: the album this one continues from (migration 75).
  // Drives explicit arcs on the globe. null = start of its own journey.
  connectedFromAlbumId?: string | null
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

/**
 * The viewed user's base/home location — the "home hub" that travel lines
 * radiate from on the globe. For your OWN globe this comes from your profile
 * (always available). For someone else's globe it is fetched via the
 * get_public_home_location() RPC, which returns coordinates ONLY when that
 * user opted in (home_location_is_public), so a null result means "no hub".
 */
interface HomeLocation {
  latitude: number
  longitude: number
  name: string
  isOwn: boolean
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
  homeLocation: HomeLocation | null
}

function formatHomeName(city?: string | null, country?: string | null): string {
  return [city, country].filter(Boolean).join(', ') || 'Home'
}

export function useTravelTimeline(filterUserId?: string, instanceId?: string): UseTravelTimelineReturn {
  const { user, profile } = useAuth()
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [yearData, setYearData] = useState<Record<number, YearTravelData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Track which years have been fully loaded (with locations) to prevent re-fetching
  const loadedYearsRef = useRef<Set<number>>(new Set())

  // Bounded auto-retry for failed year fetches. fetchYearData swallows its own
  // errors (returns null) so one bad year can't nuke the others — but that
  // used to leave the globe permanently pinless after a transient failure
  // (Supabase free-tier cold-start timeouts hit the heavier friend-globe
  // queries especially often): nothing re-ran the effect, and the error was
  // even cleared. The tick re-arms the loader effect; attempts cap the loop.
  const yearRetryAttemptsRef = useRef(0)
  const [yearRetryTick, setYearRetryTick] = useState(0)
  const MAX_YEAR_RETRIES = 3

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
      // Apply privacy filters
      const isOwnProfile = user?.id === targetUserId

      // Retry the query in place — a transient cold-start failure here used to
      // permanently strand the globe (this path had no retry at all).
      const { data, error } = await runQueryWithRetry(async () => {
        let query = supabase
          .from('albums')
          .select('id, created_at, date_start, location_name, latitude, longitude, visibility')
          .eq('user_id', targetUserId)
          .neq('status', 'draft')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (!isOwnProfile) {
          // Include public and friends albums - canViewContent will filter friends-only
          // for non-friends in fetchYearData
          query = query.in('visibility', ['public', 'friends'])
        }
        // If viewing own profile, show all albums (no additional filter needed)

        return await query
      })

      if (error) throw error

      // Extract unique years and count locations per year
      const yearLocationCounts = new Map<number, Set<string>>()

      data?.forEach(album => {
        // Prioritize date_start over created_at for travel year
        const dateField = album.date_start || album.created_at
        const parsedYear = parseLocalDate(dateField)?.getFullYear()
        if (parsedYear !== undefined) {
          const year = parsedYear

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

      // Don't set loading to false here — keep loading=true so the globe
      // shows its loading state until year data (with locations/pins) is fetched.
      // The useEffect that fetches year data will set loading=false when done.
      // Only set loading=false if there are no years to load (empty state).
      if (years.length === 0) {
        setLoading(false)
      }
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
    // Guard on targetUserId (not user?.id) so this stays consistent with
    // fetchAvailableYears: it drives which user's albums we load, and gating on
    // the viewer's id instead made every year "fail" (return null) whenever the
    // auth user hadn't hydrated yet — which the retry loop then escalated into a
    // permanent "Failed to load travel timeline".
    if (!targetUserId) return null

    try {
      // Fetch all albums for the user with location data (exclude drafts).
      // Retried in place to survive Supabase cold-start blips on this heavy query.
      const { data: allAlbums, error: timelineError } = await runQueryWithRetry(async () =>
        supabase
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
            connected_from_album_id,
            photos(id, file_path)
          `, { count: 'exact' })
          .eq('user_id', targetUserId)
          .neq('status', 'draft')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('date_start', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
      )

      if (timelineError) throw timelineError

      // Determine if viewing own profile (no privacy checks needed)
      const isOwnProfile = user?.id === targetUserId

      // For other profiles, check friendship ONCE (not per album)
      let isFriendWithOwner = false
      if (!isOwnProfile && user?.id && targetUserId) {
        // Single friendship check for all friends-only albums
        isFriendWithOwner = await areFriends(user.id, targetUserId, supabase)
      }

      // Filter albums by privacy and year - NO per-album database calls
      const privacyFilteredAlbums: typeof allAlbums = []
      for (const album of allAlbums || []) {
        // Exclude drafts (status='draft' OR no photos)
        const isDraft = album.status === 'draft' || !album.photos || album.photos.length === 0
        if (isDraft) continue

        // Filter by year
        const dateField = album.date_start || album.created_at
        const albumYear = parseLocalDate(dateField)?.getFullYear()
        if (albumYear === undefined || albumYear !== year) continue

        // Privacy check - done locally, no database calls
        const visibility = (album.visibility || 'public') as VisibilityLevel

        // Own profile: can see everything
        if (isOwnProfile) {
          privacyFilteredAlbums.push(album)
          continue
        }

        // Public albums: always visible
        if (visibility === 'public') {
          privacyFilteredAlbums.push(album)
          continue
        }

        // Private albums: never visible to others
        if (visibility === 'private') {
          continue
        }

        // Friends-only albums: use pre-fetched friendship status
        if (visibility === 'friends' && isFriendWithOwner) {
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

      // Batch query photo counts for all albums in a single query
      const albumIds = timelineData.map(item => item.id)
      const photoCounts = new Map<string, number>()

      if (albumIds.length > 0) {
        const { data: photoRows } = await supabase
          .from('photos')
          .select('album_id')
          .in('album_id', albumIds)

        // Count photos per album from the single query result
        if (photoRows) {
          for (const row of photoRows) {
            photoCounts.set(row.album_id, (photoCounts.get(row.album_id) || 0) + 1)
          }
        }
      }

      // Process timeline data into travel locations
      const locations: TravelLocation[] = []
      const countriesSet = new Set<string>()
      let totalPhotos = 0
      let startDate: Date | null = null
      let endDate: Date | null = null

      for (const item of timelineData) {
        // Safe date parsing - prioritize travel date over upload date.
        // parseLocalDate treats DATE-only strings as LOCAL calendar dates —
        // new Date("YYYY-MM-DD") parses UTC midnight, which shifted pin year
        // labels/colors and flight-arc year bucketing a day (and at year
        // boundaries a whole year) for every user west of UTC.
        const dateField = item.date_start || item.created_at
        const visitDate = parseLocalDate(dateField) ?? new Date()

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

        const locationName = formatLocationLabel(item.location_name, item.country_code)

        // Get cover photo URL - use cover_photo_url or first photo
        let coverPhotoUrl: string | undefined = undefined

        // First, try the cover_photo_url field
        const coverPhotoPath = item.cover_photo_url
        if (coverPhotoPath) {
          // getPhotoUrl handles full-URL passthrough + storage conversion + validation
          coverPhotoUrl = getPhotoUrl(coverPhotoPath)
        }

        // Fallback to first photo if no cover photo is set
        if (!coverPhotoUrl && item.photos && item.photos.length > 0 && item.photos[0].file_path) {
          coverPhotoUrl = getPhotoUrl(item.photos[0].file_path)
        }

        // Get favorite photo URLs if available
        let favoritePhotoUrls: string[] | undefined = undefined
        if (item.favorite_photo_urls && Array.isArray(item.favorite_photo_urls)) {
          favoritePhotoUrls = item.favorite_photo_urls
            .map(path => getPhotoUrl(path) || '')
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
              // getPhotoUrl handles storage conversion + validation
              const photoUrl = getPhotoUrl(photo.file_path) || ''
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
          photos: photoData,
          connectedFromAlbumId:
            (item as { connected_from_album_id?: string | null }).connected_from_album_id ?? null,
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
      }, toError(err))

      // WHY: return null (not empty-but-truthy data) so callers don't mark the
      // year as loaded — a transient network error would otherwise leave the
      // globe permanently empty for that year with no retry.
      return null
    }
  }, [supabase, targetUserId, user?.id])

  /**
   * Calculate distance between two locations (shared haversine).
   */
  const calculateDistance = (loc1: TravelLocation, loc2: TravelLocation): number =>
    haversineKm(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude)

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Clear existing year data and loaded tracking to force refresh
      loadedYearsRef.current.clear()
      yearRetryAttemptsRef.current = 0
      setYearData({})

      await fetchAvailableYears()
      // Don't set loading=false here — the year data useEffect will handle it
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
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
    // Use ref to check if year needs loading - avoids stale state reads
    const needsFullData = selectedYear !== null && !loadedYearsRef.current.has(selectedYear)

    // Check if we need to fetch all year data (when selectedYear is null - "All Years")
    const yearsToLoad = selectedYear === null
      ? availableYears.filter(year => !loadedYearsRef.current.has(year))
      : []
    const needsAllYearData = yearsToLoad.length > 0

    let retryTimer: NodeJS.Timeout | null = null

    // Re-arm this effect after a backoff so failed years get another attempt.
    // Returns false once attempts are exhausted (caller surfaces the error).
    const scheduleYearRetry = () => {
      if (yearRetryAttemptsRef.current >= MAX_YEAR_RETRIES) return false
      const delay = 1500 * 2 ** yearRetryAttemptsRef.current
      yearRetryAttemptsRef.current += 1
      retryTimer = setTimeout(() => setYearRetryTick(t => t + 1), delay)
      return true
    }

    if (needsFullData && selectedYear !== null) {
      setLoading(true)
      setError(null)

      fetchYearData(selectedYear)
        .then(data => {
          if (data) {
            // Mark year as loaded BEFORE updating state
            loadedYearsRef.current.add(selectedYear)
            yearRetryAttemptsRef.current = 0
            setYearData(prev => ({ ...prev, [selectedYear]: data }))
            // Clear error if data loads successfully
            if (data.locations.length > 0) {
              setError(null)
            }
          } else if (!scheduleYearRetry()) {
            setError('Failed to load year data')
          }
        })
        .catch(err => {
          log.error('Failed to load year data in effect', {
            component: 'useTravelTimeline',
            year: selectedYear,
            userId: user?.id
          }, toError(err))

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
        yearsToLoad.map(year =>
          fetchYearData(year).then(data => ({ year, data }))
        )
      )
        .then(results => {
          // Mark years as loaded BEFORE updating state — but only those whose
          // fetch succeeded (data !== null), so failed years can be retried.
          results.forEach(({ year, data }) => {
            if (data) {
              loadedYearsRef.current.add(year)
            }
          })
          // Use functional update to avoid stale state
          setYearData(prev => {
            const newYearData = { ...prev }
            results.forEach(({ year, data }) => {
              if (data) {
                newYearData[year] = data
              }
            })
            return newYearData
          })

          const failed = results.filter(({ data }) => !data)
          if (failed.length === 0) {
            yearRetryAttemptsRef.current = 0
            setError(null)
          } else if (!scheduleYearRetry() && failed.length === results.length) {
            // Every year failed and retries are exhausted — say so instead of
            // rendering a silently empty globe.
            setError('Failed to load travel timeline')
          }
        })
        .catch(err => {
          log.error('Failed to load all year data', {
            component: 'useTravelTimeline',
            userId: user?.id
          }, toError(err))

          setError(err instanceof Error ? err.message : 'Failed to load all year data')
        })
        .finally(() => {
          setLoading(false)
        })
    }

    return () => {
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [selectedYear, fetchYearData, user?.id, availableYears, yearRetryTick])

  // Real-time subscriptions for automatic updates
  useEffect(() => {
    if (!targetUserId) return

    // Debounce refresh to prevent rapid successive calls
    let refreshTimeout: NodeJS.Timeout | null = null
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(async () => {
        // Clear loaded years tracking to force re-fetch
        loadedYearsRef.current.clear()
        setYearData({})
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
    yearRetryAttemptsRef.current = 0
    if (targetUserId) {
      fetchAvailableYears()
    }
  }, [targetUserId, fetchAvailableYears])

  // Resolve the viewed user's base/home location (the globe's "home hub").
  //  - Own globe: read straight from the auth profile (loaded via
  //    get_my_profile, so home coords are always available regardless of the
  //    public flag — you always see your own base).
  //  - Someone else's globe: the get_public_home_location() RPC returns coords
  //    only when they opted in; otherwise no hub is shown.
  useEffect(() => {
    if (!targetUserId) {
      setHomeLocation(null)
      return
    }

    const isOwnProfile = user?.id === targetUserId
    let cancelled = false

    if (isOwnProfile) {
      const lat = profile?.home_latitude
      const lng = profile?.home_longitude
      if (typeof lat === 'number' && typeof lng === 'number') {
        setHomeLocation({
          latitude: lat,
          longitude: lng,
          name: formatHomeName(profile?.home_city, profile?.home_country),
          isOwn: true,
        })
      } else {
        setHomeLocation(null)
      }
      return
    }

    // Other user — opt-in-gated RPC.
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_home_location', {
          p_user_id: targetUserId,
        })
        if (cancelled) return
        const row = (Array.isArray(data) ? data[0] : data) as
          | { home_city?: string | null; home_country?: string | null; home_latitude?: number | null; home_longitude?: number | null }
          | undefined
        if (
          !error &&
          row &&
          typeof row.home_latitude === 'number' &&
          typeof row.home_longitude === 'number'
        ) {
          setHomeLocation({
            latitude: row.home_latitude,
            longitude: row.home_longitude,
            name: formatHomeName(row.home_city, row.home_country),
            isOwn: false,
          })
        } else {
          setHomeLocation(null)
        }
      } catch (err) {
        if (!cancelled) {
          setHomeLocation(null)
          log.warn('Failed to load public home location', {
            component: 'useTravelTimeline',
            action: 'fetch-home-location',
            userId: targetUserId,
          }, toError(err))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    targetUserId,
    user?.id,
    profile?.home_latitude,
    profile?.home_longitude,
    profile?.home_city,
    profile?.home_country,
    supabase,
  ])

  return {
    availableYears,
    yearData,
    loading,
    error,
    selectedYear,
    setSelectedYear,
    refreshData,
    getYearData,
    homeLocation
  }
}

export type {
  TravelLocation,
  YearTravelData,
  Album,
  Photo,
  HomeLocation,
  UseTravelTimelineReturn
}