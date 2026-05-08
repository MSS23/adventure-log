'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useFollows } from '@/lib/hooks/useFollows'
import { useWishlist, type WishlistItem } from '@/lib/hooks/useWishlist'
import { log } from '@/lib/utils/logger'

export interface AlbumPreview {
  id: string
  title: string
  cover_photo_url?: string
  location_name?: string
  country_code?: string
  latitude?: number
  longitude?: number
  created_at: string
  date_start?: string
  start_date?: string
  description?: string
}

export interface ExploreAlbum extends AlbumPreview {
  user_id: string
  owner?: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

export interface EnhancedGlobeRef {
  navigateToAlbum: (albumId: string, lat: number, lng: number) => void
  getAvailableYears: () => number[]
  getCanvas: () => HTMLCanvasElement | null
  flyTo: (lat: number, lng: number, altitude: number, durationMs: number) => Promise<void>
}

/**
 * Calculate total distance traveled using the Haversine formula.
 * Albums are sorted chronologically, then distance is summed between consecutive locations.
 */
export function calculateTotalDistance(albums: AlbumPreview[]): number {
  const located = albums
    .filter(a => a.latitude != null && a.longitude != null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (located.length < 2) return 0

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371 // Earth radius in km

  let total = 0
  for (let i = 1; i < located.length; i++) {
    const lat1 = toRad(located[i - 1].latitude!)
    const lat2 = toRad(located[i].latitude!)
    const dLat = lat2 - lat1
    const dLon = toRad(located[i].longitude! - located[i - 1].longitude!)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    total += R * c
  }

  return Math.round(total)
}

/**
 * Format a distance in km into a human-readable string.
 */
export function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`
  }
  return `${km.toLocaleString()} km`
}

export function useGlobePageData() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const globeRef = useRef<EnhancedGlobeRef>(null)

  const urlAlbumId = searchParams.get('album')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const userId = searchParams.get('user')

  const [albums, setAlbums] = useState<AlbumPreview[]>([])
  const [, setLoading] = useState(true)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(urlAlbumId)
  const [stats, setStats] = useState({ totalAlbums: 0, totalCountries: 0, totalPhotos: 0 })
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isPrivateAccount, setIsPrivateAccount] = useState(false)
  const [profileUser, setProfileUser] = useState<{ id: string; username: string; display_name: string; avatar_url?: string; privacy_level?: string } | null>(null)
  const [friends, setFriends] = useState<Array<{ id: string; username: string; display_name: string; avatar_url?: string; last_active?: string }>>([])
  const [, setLoadingFriends] = useState(false)

  // Year filter state for controlling EnhancedGlobe
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [, setGlobeReady] = useState(false)

  // Mobile stats overlay toggle
  const [showStatsOverlay, setShowStatsOverlay] = useState(false)
  const [hideEmptyCta, setHideEmptyCta] = useState(false)

  // Explore mode state
  const [exploreMode, setExploreMode] = useState(false)
  const [exploreAlbums, setExploreAlbums] = useState<ExploreAlbum[]>([])
  const [exploreLoading, setExploreLoading] = useState(false)
  const [exploreStats, setExploreStats] = useState({ travelers: 0, albums: 0 })

  // Wishlist layer state
  const { items: wishlistItems, addItem: addWishlistItem } = useWishlist()
  const [showWishlist, setShowWishlist] = useState(false)
  const [wishlistPrompt, setWishlistPrompt] = useState<{
    lat: number
    lng: number
    screenX: number
    screenY: number
    locationName: string | null
    loading: boolean
    adding: boolean
  } | null>(null)

  const targetUserId = userId || user?.id
  const { followStatus, following } = useFollows(targetUserId || '')

  // Calculate total distance from album coordinates
  const totalDistance = useMemo(() => calculateTotalDistance(albums), [albums])

  // Fetch albums with location data
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true)
        setIsPrivateAccount(false)
        setProfileUser(null)

        const targetUserId = userId || user?.id

        if (!targetUserId) {
          setLoading(false)
          return
        }

        const isOwn = targetUserId === user?.id
        setIsOwnProfile(isOwn)

        const { data: userData } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, privacy_level')
          .eq('id', targetUserId)
          .single()

        setProfileUser(userData)

        if (userData?.privacy_level === 'private' && !isOwn) {
          setIsPrivateAccount(true)
          setLoading(false)
          return
        }

        if (userData?.privacy_level === 'friends' && !isOwn) {
          setIsPrivateAccount(true)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            cover_photo_url,
            location_name,
            latitude,
            longitude,
            created_at,
            country_code,
            date_start,
            start_date,
            description,
            photos(id)
          `)
          .eq('user_id', targetUserId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .neq('status', 'draft')
          .order('created_at', { ascending: false })

        if (error) throw error

        const albumsData = (data || []).filter(a => a.photos && a.photos.length > 0)
        setAlbums(albumsData)

        const uniqueCountries = new Set(
          albumsData
            .map(a => a.country_code)
            .filter(Boolean)
        )

        const { count: photoCount } = await supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUserId)

        setStats({
          totalAlbums: albumsData.length,
          totalCountries: uniqueCountries.size,
          totalPhotos: photoCount || 0
        })
      } catch (err) {
        log.error('Error fetching albums for globe',
          { component: 'GlobePage', userId: userId || user?.id },
          err instanceof Error ? err : new Error(String(err))
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAlbums()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAlbums()
      }
    }

    const handleFocus = () => {
      fetchAlbums()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [userId, user?.id, supabase])

  const handleAlbumClick = useCallback((albumId: string) => {
    const album = albums.find(a => a.id === albumId)

    if (!album || !album.latitude || !album.longitude) {
      log.warn('Album has no location data', {
        component: 'GlobePage',
        action: 'album-click',
        albumId
      })
      return
    }

    setSelectedAlbumId(albumId)

    if (globeRef.current) {
      globeRef.current.navigateToAlbum(albumId, album.latitude, album.longitude)
    }

    log.info('Album clicked for globe navigation', {
      component: 'GlobePage',
      action: 'album-click',
      albumId,
      latitude: album.latitude,
      longitude: album.longitude
    })
  }, [albums])

  // Handle globe background click for wishlist
  const handleGlobeBackgroundClick = useCallback(async (coords: { lat: number; lng: number; screenX: number; screenY: number }) => {
    if (!showWishlist || !isOwnProfile) return

    setWishlistPrompt({
      lat: coords.lat,
      lng: coords.lng,
      screenX: coords.screenX,
      screenY: coords.screenY,
      locationName: null,
      loading: true,
      adding: false,
    })

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`
      )
      const data = await response.json()
      const name = data.display_name
        ? data.display_name.split(',').slice(0, 3).join(',').trim()
        : `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`

      setWishlistPrompt(prev => prev ? { ...prev, locationName: name, loading: false } : null)
    } catch {
      setWishlistPrompt(prev => prev ? {
        ...prev,
        locationName: `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`,
        loading: false
      } : null)
    }
  }, [showWishlist, isOwnProfile])

  // Confirm adding to wishlist
  const handleConfirmWishlist = useCallback(async () => {
    if (!wishlistPrompt || !wishlistPrompt.locationName) return

    setWishlistPrompt(prev => prev ? { ...prev, adding: true } : null)

    await addWishlistItem({
      location_name: wishlistPrompt.locationName,
      latitude: wishlistPrompt.lat,
      longitude: wishlistPrompt.lng,
      source: 'manual',
    })

    setWishlistPrompt(null)
  }, [wishlistPrompt, addWishlistItem])

  // Navigate globe to a wishlist item location
  const handleWishlistItemClick = useCallback((item: WishlistItem) => {
    if (globeRef.current) {
      globeRef.current.navigateToAlbum(item.id, item.latitude, item.longitude)
    }
  }, [])

  // Poll for available years from globe when it's ready
  useEffect(() => {
    setAvailableYears([])
    setGlobeReady(false)

    const checkForYears = () => {
      if (globeRef.current) {
        const years = globeRef.current.getAvailableYears()
        if (years.length > 0) {
          setAvailableYears(years)
          setGlobeReady(true)
          return true
        }
      }
      return false
    }

    let interval: NodeJS.Timeout | null = null

    const timeout = setTimeout(() => {
      if (checkForYears()) return

      interval = setInterval(() => {
        if (checkForYears()) {
          if (interval) clearInterval(interval)
        }
      }, 500)
    }, 100)

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [userId, user?.id])

  // Fetch friends list with their latest activity (people user follows)
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.id) return

      try {
        setLoadingFriends(true)

        const friendIds = following
          .filter(f => f.following)
          .map(f => f.following!.id)

        if (friendIds.length === 0) {
          setFriends([])
          return
        }

        const { data: recentAlbums, error: albumsError } = await supabase
          .from('albums')
          .select('user_id, updated_at')
          .in('user_id', friendIds)
          .order('updated_at', { ascending: false })

        if (albumsError) throw albumsError

        const activityMap: { [key: string]: string } = {}
        recentAlbums?.forEach((album) => {
          if (!activityMap[album.user_id]) {
            activityMap[album.user_id] = album.updated_at
          }
        })

        const friendsList = following
          .filter(f => f.following)
          .map(f => ({
            id: f.following!.id,
            username: f.following!.username || '',
            display_name: f.following!.display_name || f.following!.username || '',
            avatar_url: f.following!.avatar_url,
            last_active: activityMap[f.following!.id] || '1970-01-01'
          }))
          .sort((a, b) => {
            return new Date(b.last_active!).getTime() - new Date(a.last_active!).getTime()
          })
          .slice(0, 5)

        setFriends(friendsList)
      } catch (err) {
        log.error('Error fetching friends', {
          component: 'GlobePage',
          userId: user.id
        }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoadingFriends(false)
      }
    }

    fetchFriends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase])

  // Fetch explore albums when explore mode is activated
  useEffect(() => {
    if (!exploreMode) return

    const fetchExploreAlbums = async () => {
      try {
        setExploreLoading(true)
        const { data, error } = await supabase
          .from('albums')
          .select(`
            id, title, cover_photo_url, location_name, latitude, longitude, created_at, user_id,
            users!albums_user_id_fkey(username, display_name, avatar_url)
          `)
          .eq('visibility', 'public')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .neq('status', 'draft')
          .neq('user_id', user?.id || '')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error

        const mapped: ExploreAlbum[] = (data || []).map((item: Record<string, unknown>) => {
          const usersData = item.users as Record<string, unknown> | null
          return {
            id: item.id as string,
            title: item.title as string,
            cover_photo_url: item.cover_photo_url as string | undefined,
            location_name: item.location_name as string | undefined,
            latitude: item.latitude as number | undefined,
            longitude: item.longitude as number | undefined,
            created_at: item.created_at as string,
            user_id: item.user_id as string,
            owner: usersData ? {
              username: usersData.username as string,
              display_name: usersData.display_name as string,
              avatar_url: usersData.avatar_url as string | undefined,
            } : undefined,
          }
        })

        setExploreAlbums(mapped)

        const uniqueUsers = new Set(mapped.map(a => a.user_id))
        setExploreStats({ travelers: uniqueUsers.size, albums: mapped.length })
      } catch (err) {
        log.error('Error fetching explore albums', {
          component: 'GlobePage',
          action: 'fetch-explore',
        }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setExploreLoading(false)
      }
    }

    fetchExploreAlbums()
  }, [exploreMode, user?.id, supabase])

  const handleViewFriendGlobe = (friendId: string) => {
    router.push(`/globe?user=${friendId}`)
  }

  return {
    // Refs
    globeRef,

    // URL params
    urlAlbumId,
    lat,
    lng,
    userId,

    // Auth
    user,
    router,

    // Albums
    albums,
    selectedAlbumId,
    setSelectedAlbumId,
    stats,
    totalDistance,
    handleAlbumClick,

    // Profile
    isOwnProfile,
    isPrivateAccount,
    profileUser,
    followStatus,

    // Friends
    friends,
    handleViewFriendGlobe,

    // Year filter
    selectedYear,
    setSelectedYear,
    availableYears,

    // UI state
    showStatsOverlay,
    setShowStatsOverlay,
    hideEmptyCta,
    setHideEmptyCta,

    // Explore mode
    exploreMode,
    setExploreMode,
    exploreAlbums,
    exploreLoading,
    exploreStats,

    // Wishlist
    wishlistItems,
    showWishlist,
    setShowWishlist,
    wishlistPrompt,
    setWishlistPrompt,
    handleGlobeBackgroundClick,
    handleConfirmWishlist,
    handleWishlistItemClick,
  }
}
