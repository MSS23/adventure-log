'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useFollows } from '@/lib/hooks/useFollows'
import { useWishlist, type WishlistItem } from '@/lib/hooks/useWishlist'
import { log } from '@/lib/utils/logger'
import { haversineKm } from '@/lib/utils/geoCalculations'
import { fetchGlobeBaseDataset, prefetchGlobeBaseDataset } from '@/lib/globe/base-dataset'

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

  let total = 0
  for (let i = 1; i < located.length; i++) {
    total += haversineKm(
      located[i - 1].latitude!,
      located[i - 1].longitude!,
      located[i].latitude!,
      located[i].longitude!
    )
  }

  return Math.round(total)
}

/**
 * Format a distance in km into a human-readable string.
 * Re-exported for the globe page/components that thread it as a prop; delegates
 * to the shared canonical formatter.
 */
export { formatDistanceKm as formatDistance } from '@/lib/utils/geoCalculations'

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

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(urlAlbumId)

  // Year filter state for controlling EnhancedGlobe
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [, setGlobeReady] = useState(false)

  const [hideEmptyCta, setHideEmptyCta] = useState(false)

  // Explore mode state
  const [exploreMode, setExploreMode] = useState(false)

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

  // Default/empty shapes preserved from the original useState initializers so
  // the public return shape is identical while the query is pending. Stable
  // references avoid re-running downstream memos/effects on every render.
  const EMPTY_STATS = useMemo(() => ({ totalAlbums: 0, totalCountries: 0, totalPhotos: 0 }), [])
  const EMPTY_ALBUMS = useMemo<AlbumPreview[]>(() => [], [])

  // Fetch albums with location data (profile gating, albums, stats) via React
  // Query so revisits to the globe page hit the cache instead of re-running
  // the whole waterfall.
  const albumsQuery = useQuery({
    queryKey: ['globe-data', 'albums', targetUserId ?? null, user?.id ?? null],
    enabled: !!targetUserId,
    queryFn: async () => {
      // targetUserId is guaranteed by `enabled`, but narrow for TS.
      if (!targetUserId) {
        return {
          albums: [] as AlbumPreview[],
          stats: { totalAlbums: 0, totalCountries: 0, totalPhotos: 0 },
          isOwnProfile: false,
          isPrivateAccount: false,
          profileUser: null as
            | { id: string; username: string; display_name: string; avatar_url?: string; privacy_level?: string }
            | null,
        }
      }

      const isOwn = targetUserId === user?.id

      const { data: userData } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, privacy_level')
        .eq('id', targetUserId)
        .single()

      // Restricted (private/friends) accounts only reveal their globe to the
      // owner or to an ACCEPTED follower. A non-follower gets the locked
      // screen; an accepted follower falls through and RLS
      // (albums_follower_read) returns the account's non-private albums.
      const isRestricted =
        userData?.privacy_level === 'private' || userData?.privacy_level === 'friends'

      if (isRestricted && !isOwn) {
        let isAcceptedFollower = false
        if (user?.id) {
          const { data: followRow } = await supabase
            .from('follows')
            .select('status')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .eq('status', 'accepted')
            .maybeSingle()
          isAcceptedFollower = !!followRow
        }

        if (!isAcceptedFollower) {
          return {
            albums: [] as AlbumPreview[],
            stats: { totalAlbums: 0, totalCountries: 0, totalPhotos: 0 },
            isOwnProfile: isOwn,
            isPrivateAccount: true,
            profileUser: userData ?? null,
          }
        }
      }

      // Shared with useTravelTimeline (pins/arcs) — one albums+photos
      // download per user serves both consumers instead of two parallel
      // copies of the same dataset. See src/lib/globe/base-dataset.ts.
      const { data, error } = await fetchGlobeBaseDataset(supabase, targetUserId, {
        isOwnProfile: isOwn,
      })

      if (error) throw error

      const albumsData = (data || [])
        .filter(a => a.photos && a.photos.length > 0)
        // The old dedicated query ordered newest-first; the shared dataset
        // is oldest-first for the timeline, so re-sort locally.
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const uniqueCountries = new Set(
        albumsData
          .map(a => a.country_code)
          .filter(Boolean)
      )

      const { count: photoCount } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId)

      return {
        // Superset rows (nullable columns) narrowed to the preview shape the
        // page consumes; extra fields are harmless structurally.
        albums: albumsData as unknown as AlbumPreview[],
        stats: {
          totalAlbums: albumsData.length,
          totalCountries: uniqueCountries.size,
          totalPhotos: photoCount || 0,
        },
        isOwnProfile: isOwn,
        isPrivateAccount: false,
        profileUser: userData ?? null,
      }
    },
  })

  useEffect(() => {
    if (albumsQuery.error) {
      log.error('Error fetching albums for globe',
        { component: 'GlobePage', userId: userId || user?.id },
        albumsQuery.error instanceof Error ? albumsQuery.error : new Error(String(albumsQuery.error))
      )
    }
  }, [albumsQuery.error, userId, user?.id])

  const albums = albumsQuery.data?.albums ?? EMPTY_ALBUMS
  const stats = albumsQuery.data?.stats ?? EMPTY_STATS
  // Derive ownership synchronously from the URL, not from the pending query.
  // /globe with no ?user= is always the signed-in user's own globe; keying off
  // the query left isOwnProfile=false during load, which rendered the header
  // as "undefined's Globe" (profileUser null) with a zero-state on every load.
  const isOwnProfile = albumsQuery.data?.isOwnProfile ?? (!userId || userId === user?.id)
  const isPrivateAccount = albumsQuery.data?.isPrivateAccount ?? false
  const profileUser = albumsQuery.data?.profileUser ?? null
  const isProfileLoading = albumsQuery.isPending
  const isDataError = albumsQuery.isError
  const refetchGlobeData = albumsQuery.refetch

  // Calculate total distance from album coordinates
  const totalDistance = useMemo(() => calculateTotalDistance(albums), [albums])

  // NOTE: we deliberately do NOT refetch on window focus / tab visibility here.
  // React Query already governs freshness via staleTime, and the app sets
  // refetchOnWindowFocus:false globally. The previous manual focus/visibility
  // listeners re-ran this page's entire data waterfall (users → albums embed →
  // photo count) on every app-switch — especially costly in an installed PWA
  // where focus fires constantly — for the heaviest page in the app.

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

  // Click handler for wishlist pins on the globe — resolves id to item and
  // reuses the same fly-to behavior as the filmstrip.
  const handleWishlistPinClick = useCallback((wishlistId: string) => {
    const item = wishlistItems.find(w => w.id === wishlistId)
    if (item) {
      handleWishlistItemClick(item)
    }
  }, [wishlistItems, handleWishlistItemClick])

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

  // Fetch friends list with their latest activity (people user follows).
  // Keyed on the followed-user ids so the cache invalidates when the follow
  // graph changes; gated until we have an auth user.
  const friendIds = useMemo(
    () => following.filter(f => f.following).map(f => f.following!.id),
    [following]
  )

  const friendsQuery = useQuery({
    queryKey: ['globe-data', 'friends', user?.id ?? null, friendIds],
    enabled: !!user?.id,
    queryFn: async () => {
      if (friendIds.length === 0) {
        return [] as Array<{ id: string; username: string; display_name: string; avatar_url?: string; last_active?: string }>
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

      return friendsList
    },
  })

  useEffect(() => {
    if (friendsQuery.error) {
      log.error('Error fetching friends', {
        component: 'GlobePage',
        userId: user?.id
      }, friendsQuery.error instanceof Error ? friendsQuery.error : new Error(String(friendsQuery.error)))
    }
  }, [friendsQuery.error, user?.id])

  const EMPTY_FRIENDS = useMemo<Array<{ id: string; username: string; display_name: string; avatar_url?: string; last_active?: string }>>(() => [], [])
  const friends = friendsQuery.data ?? EMPTY_FRIENDS

  // Fetch explore albums when explore mode is activated. Gated on exploreMode
  // via `enabled` so the query only runs (and caches) once the user opens
  // explore mode.
  const exploreQuery = useQuery({
    queryKey: ['globe-data', 'explore', user?.id ?? null],
    enabled: exploreMode,
    queryFn: async () => {
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

      const uniqueUsers = new Set(mapped.map(a => a.user_id))

      return {
        exploreAlbums: mapped,
        exploreStats: { travelers: uniqueUsers.size, albums: mapped.length },
      }
    },
  })

  useEffect(() => {
    if (exploreQuery.error) {
      log.error('Error fetching explore albums', {
        component: 'GlobePage',
        action: 'fetch-explore',
      }, exploreQuery.error instanceof Error ? exploreQuery.error : new Error(String(exploreQuery.error)))
    }
  }, [exploreQuery.error])

  const EMPTY_EXPLORE_ALBUMS = useMemo<ExploreAlbum[]>(() => [], [])
  const EMPTY_EXPLORE_STATS = useMemo(() => ({ travelers: 0, albums: 0 }), [])
  const exploreAlbums = exploreQuery.data?.exploreAlbums ?? EMPTY_EXPLORE_ALBUMS
  const exploreStats = exploreQuery.data?.exploreStats ?? EMPTY_EXPLORE_STATS
  // Preserve original semantics: exploreLoading was only ever true while a
  // fetch was in flight after explore mode was activated.
  const exploreLoading = exploreMode && exploreQuery.isFetching

  const handleViewFriendGlobe = (friendId: string) => {
    router.push(`/globe?user=${friendId}`)
  }

  // Warm a friend's globe dataset on hover/focus so the switch feels instant.
  // Deduped + TTL'd by the base-dataset module, so repeat hovers are free.
  const handlePrefetchFriendGlobe = useCallback(
    (friendId: string) => prefetchGlobeBaseDataset(supabase, friendId),
    [supabase]
  )

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
    isProfileLoading,
    isDataError,
    refetchGlobeData,
    followStatus,

    // Friends
    friends,
    handleViewFriendGlobe,
    handlePrefetchFriendGlobe,

    // Year filter
    selectedYear,
    setSelectedYear,
    availableYears,

    // UI state
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
    handleWishlistPinClick,
  }
}
