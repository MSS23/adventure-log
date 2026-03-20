'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Camera, Plus, Globe2, Calendar, ChevronDown, Route, BarChart3, Star, StarOff, X, Check, Loader2, Compass, Users, Video, ArrowRight } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { useFollows } from '@/lib/hooks/useFollows'
import type { Profile } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useWishlist, type WishlistItem } from '@/lib/hooks/useWishlist'
import { GlobeFlyoverExport } from '@/components/globe/GlobeFlyoverExport'

interface AlbumPreview {
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

interface ExploreAlbum extends AlbumPreview {
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

const EnhancedGlobe = dynamic(() => import('@/components/globe/EnhancedGlobe').then(mod => ({ default: mod.EnhancedGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-stone-50 to-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Globe2 className="h-12 w-12 text-olive-400 opacity-40" />
          </div>
          <Globe2 className="h-12 w-12 text-olive-500 animate-pulse" />
        </div>
        <p className="text-lg text-stone-700 font-medium">Loading your travel globe...</p>
      </div>
    </div>
  )
})

/**
 * Calculate total distance traveled using the Haversine formula.
 * Albums are sorted chronologically, then distance is summed between consecutive locations.
 */
function calculateTotalDistance(albums: AlbumPreview[]): number {
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
function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`
  }
  return `${km.toLocaleString()} km`
}

function GlobePageContent() {
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
  const [_showSidebar] = useState(true) // Always show sidebar by default on desktop
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
  const [showFlyover, setShowFlyover] = useState(false)
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
        // Reset private account state at start of fetch
        setIsPrivateAccount(false)
        setProfileUser(null)

        // Determine which user's albums to fetch
        const targetUserId = userId || user?.id

        if (!targetUserId) {
          setLoading(false)
          return
        }

        // Check if viewing own profile
        const isOwn = targetUserId === user?.id
        setIsOwnProfile(isOwn)

        // Fetch user privacy settings
        const { data: userData } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, privacy_level')
          .eq('id', targetUserId)
          .single()

        setProfileUser(userData)

        // Check if account is private and user doesn't have access
        if (userData?.privacy_level === 'private' && !isOwn) {
          setIsPrivateAccount(true)
          setLoading(false)
          return
        }

        // Check if friends-only and not following
        if (userData?.privacy_level === 'friends' && !isOwn) {
          // Will be checked by followStatus hook
          setIsPrivateAccount(true)
          setLoading(false)
          return
        }

        // Fetch albums with location data
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
            description
          `)
          .eq('user_id', targetUserId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .neq('status', 'draft')
          .order('created_at', { ascending: false })

        if (error) throw error

        const albumsData = data || []
        setAlbums(albumsData)

        // Calculate stats
        const uniqueCountries = new Set(
          albumsData
            .map(a => a.country_code)
            .filter(Boolean)
        )

        // Fetch photo count
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

    // Also refresh when page becomes visible (returning from album edit)
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

    // Update selected album for UI state
    setSelectedAlbumId(albumId)

    // Call the globe's navigation method directly without remounting
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

    // Show the prompt at click location
    setWishlistPrompt({
      lat: coords.lat,
      lng: coords.lng,
      screenX: coords.screenX,
      screenY: coords.screenY,
      locationName: null,
      loading: true,
      adding: false,
    })

    // Reverse geocode the location
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
    // Reset state when user changes
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

    // Store interval reference for cleanup
    let interval: NodeJS.Timeout | null = null

    // Add small delay to ensure new globe component has mounted and loaded data
    const timeout = setTimeout(() => {
      // Initial check after delay
      if (checkForYears()) return

      // Poll every 500ms until we get years
      interval = setInterval(() => {
        if (checkForYears()) {
          if (interval) clearInterval(interval)
        }
      }, 500)
    }, 100)

    // Cleanup both timeout and interval
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

        // Get list of friend IDs
        const friendIds = following
          .filter(f => f.following)
          .map(f => f.following!.id)

        if (friendIds.length === 0) {
          setFriends([])
          return
        }

        // Fetch the most recent album for each friend to determine activity
        const { data: recentAlbums, error: albumsError } = await supabase
          .from('albums')
          .select('user_id, updated_at')
          .in('user_id', friendIds)
          .order('updated_at', { ascending: false })

        if (albumsError) throw albumsError

        // Create a map of user_id to most recent activity
        const activityMap: { [key: string]: string } = {}
        recentAlbums?.forEach((album) => {
          if (!activityMap[album.user_id]) {
            activityMap[album.user_id] = album.updated_at
          }
        })

        // Map friends with their activity and sort by most recent
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
            // Sort by most recent activity
            return new Date(b.last_active!).getTime() - new Date(a.last_active!).getTime()
          })
          .slice(0, 5) // Get top 5 most active friends

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

        // Calculate unique travelers
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

  // Show private account message if user doesn't have access
  if (isPrivateAccount && profileUser && followStatus !== 'following') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full">
          <PrivateAccountMessage
            profile={profileUser as unknown as Profile}
            showFollowButton={true}
          />

          <p className="text-center text-sm text-stone-600 mt-4">
            {profileUser.privacy_level === 'private'
              ? 'Follow this account to see their travel globe and albums'
              : 'Follow this account to see their adventures'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="full-bleed globe-height bg-stone-50 dark:bg-[#000000] flex flex-col overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 -mb-24 lg:-mb-8"
    >
      {/* Compact Header */}
      <div className="bg-white dark:bg-[#111111] border-b border-stone-200 dark:border-white/[0.08] shadow-sm flex-shrink-0">
        <div className="w-full px-2 md:px-3 py-1.5 md:py-2">
          <div className="flex items-center justify-between gap-1 md:gap-2">
            {/* Left: Title + Mode Toggle */}
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-shrink">
              <h1 className="text-base md:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 flex-shrink-0">
                <Globe2 className="h-6 w-6 md:h-8 md:w-8 text-olive-500" />
                <span className="hidden md:inline truncate max-w-[200px] lg:max-w-none">
                  {exploreMode ? 'Explore Globe' : isOwnProfile ? 'Travel Globe' : `${profileUser?.display_name || profileUser?.username}'s Globe`}
                </span>
              </h1>

              {/* Mode Toggle: My Globe / Explore */}
              {isOwnProfile && (
                <div className="flex bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5 flex-shrink-0">
                  <button
                    onClick={() => setExploreMode(false)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 min-h-[32px]",
                      !exploreMode
                        ? "bg-white dark:bg-stone-700 shadow-sm text-olive-700 dark:text-olive-400"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                    )}
                  >
                    <Globe2 className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">My Globe</span>
                  </button>
                  <button
                    onClick={() => setExploreMode(true)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 min-h-[32px]",
                      exploreMode
                        ? "bg-white dark:bg-stone-700 shadow-sm text-olive-700 dark:text-olive-400"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                    )}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Explore</span>
                  </button>
                </div>
              )}

              {/* Stats badges - only on wide screens */}
              {!exploreMode && (
                <div className="hidden xl:flex items-center gap-1.5 ml-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                    <MapPin className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{stats.totalAlbums}</span>
                    <span className="text-[11px] text-stone-500">adventures</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                    <Globe2 className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{stats.totalCountries}</span>
                    <span className="text-[11px] text-stone-500">countries</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                    <Route className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{formatDistance(totalDistance)}</span>
                    <span className="text-[11px] text-stone-500">traveled</span>
                  </div>
                </div>
              )}

              {exploreMode && (
                <div className="hidden xl:flex items-center gap-1.5 ml-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                    <Users className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{exploreStats.travelers}</span>
                    <span className="text-[11px] text-stone-500">travelers</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                    <Compass className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{exploreStats.albums}</span>
                    <span className="text-[11px] text-stone-500">worldwide</span>
                  </div>
                </div>
              )}

              {/* Year Filter Dropdown */}
              {availableYears.length > 0 && !exploreMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{selectedYear ? selectedYear : 'All'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    <DropdownMenuRadioGroup
                      value={selectedYear?.toString() || 'all'}
                      onValueChange={(value) => setSelectedYear(value === 'all' ? null : parseInt(value))}
                    >
                      <DropdownMenuRadioItem value="all" className="font-medium">
                        All Years
                      </DropdownMenuRadioItem>
                      {availableYears.map((year) => (
                        <DropdownMenuRadioItem key={year} value={year.toString()}>
                          {year}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Friends Avatars - wide desktop only */}
              {isOwnProfile && friends.length > 0 && (
                <div className="hidden xl:flex items-center -space-x-2 mr-1">
                  {friends.slice(0, 4).map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleViewFriendGlobe(friend.id)}
                      className="relative group"
                      title={friend.display_name}
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-[#111111] hover:ring-olive-400 transition-all hover:scale-110 hover:z-10">
                        <AvatarImage
                          src={getPhotoUrl(friend.avatar_url, 'avatars') || ''}
                          alt={friend.display_name}
                        />
                        <AvatarFallback className="text-xs bg-olive-500 text-white">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ))}
                  {friends.length > 4 && (
                    <Link
                      href="/followers?tab=following"
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-stone-200 ring-2 ring-white dark:ring-[#111111] text-[10px] font-semibold text-stone-600 hover:bg-stone-300 transition-all"
                    >
                      +{friends.length - 4}
                    </Link>
                  )}
                </div>
              )}

              {!isOwnProfile && user && (
                <Button
                  onClick={() => router.push('/globe')}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 px-2 text-xs"
                >
                  <Globe2 className="h-3 w-3" />
                  <span className="hidden lg:inline">My Globe</span>
                </Button>
              )}

              {isOwnProfile && !exploreMode && (
                <button
                  onClick={() => {
                    setShowWishlist(prev => !prev)
                    setWishlistPrompt(null)
                  }}
                  className={cn(
                    "relative flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition-all",
                    showWishlist
                      ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                  )}
                  title={showWishlist ? 'Hide Wishlist' : 'Show Wishlist'}
                >
                  {showWishlist ? (
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  ) : (
                    <StarOff className="h-3.5 w-3.5" />
                  )}
                  {wishlistItems.length > 0 && (
                    <span className={cn(
                      "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold px-1",
                      showWishlist
                        ? "bg-amber-500 text-white"
                        : "bg-stone-400 text-white"
                    )}>
                      {wishlistItems.length}
                    </span>
                  )}
                </button>
              )}

              {isOwnProfile && !exploreMode && albums.length > 1 && (
                <button
                  onClick={() => setShowFlyover(true)}
                  className="hidden md:flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                  title="Export flyover video"
                >
                  <Video className="h-3.5 w-3.5" />
                </button>
              )}

              {isOwnProfile && !exploreMode && (
                <Link href="/albums/new">
                  <Button size="sm" className="gap-1 h-7 px-2 bg-olive-500 hover:bg-olive-600 text-white text-xs">
                    <Plus className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full-size Globe */}
      <div className="flex-1 bg-stone-900 relative overflow-hidden flex flex-row">
        {/* Globe Container */}
        <div className={cn(
          "relative flex-1 transition-all duration-300 ease-in-out",
          selectedAlbumId && !exploreMode ? "md:flex-[1_1_0%]" : "w-full"
        )}>
        <div className="absolute inset-0">
          <ErrorBoundary>
            <EnhancedGlobe
              key={userId || 'self'}
              ref={globeRef}
              className="w-full h-full"
              hideHeader={true}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              initialAlbumId={urlAlbumId || undefined}
              initialLat={lat ? parseFloat(lat) : undefined}
              initialLng={lng ? parseFloat(lng) : undefined}
              filterUserId={userId || undefined}
              onGlobeBackgroundClick={handleGlobeBackgroundClick}
            />
          </ErrorBoundary>
        </div>

        {/* Empty Globe CTA - show when user has no albums */}
        {albums.length === 0 && isOwnProfile && !exploreMode && !hideEmptyCta && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="pointer-events-auto bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.1] p-6 sm:p-8 max-w-sm mx-4 text-center shadow-2xl relative">
              <button
                onClick={() => setHideEmptyCta(true)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-4xl mb-3">🌍</div>
              <h3 className="text-lg font-bold text-white mb-2">Your globe is empty</h3>
              <p className="text-sm text-white/60 mb-5 leading-relaxed">
                Create your first album to see it pinned here. Upload photos with GPS data and watch your travels come to life.
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/albums/new">
                  <Button className="w-full bg-olive-600 hover:bg-olive-700 text-white rounded-xl h-10 gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Album
                  </Button>
                </Link>
                <button
                  onClick={() => setExploreMode(true)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors py-1.5"
                >
                  or explore other travelers&apos; globes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Stats Overlay - positioned above album strip (hidden in explore mode) */}
        {albums.length > 0 && !exploreMode && (
          <>
            {/* Desktop stats card - above the compact filmstrip */}
            <div className="hidden md:block absolute bottom-[105px] left-4 z-10">
              <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-white/[0.08] p-3.5 w-48 shadow-2xl">
                <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2.5">Travel Stats</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                      <Globe2 className="h-3 w-3 text-olive-400" /> Countries
                    </span>
                    <span className="text-sm font-bold text-white">{stats.totalCountries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-olive-400" /> Adventures
                    </span>
                    <span className="text-sm font-bold text-white">{stats.totalAlbums}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                      <Camera className="h-3 w-3 text-olive-400" /> Photos
                    </span>
                    <span className="text-sm font-bold text-white">{stats.totalPhotos}</span>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                      <Route className="h-3 w-3 text-olive-400" /> Distance
                    </span>
                    <span className="text-sm font-bold text-white">{formatDistance(totalDistance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile stats toggle button + panel - sits above the album strip */}
            <div className="md:hidden absolute bottom-[100px] left-3 z-10">
              {showStatsOverlay ? (
                <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-white/[0.08] p-3 w-44 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Stats</h3>
                    <button
                      onClick={() => setShowStatsOverlay(false)}
                      className="text-white/40 hover:text-white/70 text-xs"
                    >
                      close
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                        <Globe2 className="h-3 w-3 text-olive-400" /> Countries
                      </span>
                      <span className="text-xs font-bold text-white">{stats.totalCountries}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-olive-400" /> Adventures
                      </span>
                      <span className="text-xs font-bold text-white">{stats.totalAlbums}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                        <Camera className="h-3 w-3 text-olive-400" /> Photos
                      </span>
                      <span className="text-xs font-bold text-white">{stats.totalPhotos}</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                        <Route className="h-3 w-3 text-olive-400" /> Distance
                      </span>
                      <span className="text-xs font-bold text-white">{formatDistance(totalDistance)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowStatsOverlay(true)}
                  className="bg-black/60 backdrop-blur-xl rounded-full p-2.5 border border-white/[0.08] shadow-lg hover:bg-black/70 transition-colors"
                  title="Show travel stats"
                >
                  <BarChart3 className="h-4 w-4 text-olive-400" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Mobile explore stats indicator */}
        {exploreMode && exploreAlbums.length > 0 && (
          <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/50 backdrop-blur-xl rounded-full px-4 py-1.5 border border-white/10 shadow-lg flex items-center gap-2">
              <Users className="h-3 w-3 text-olive-400" />
              <span className="text-[11px] font-medium text-white/80">
                {exploreStats.travelers} travelers, {exploreStats.albums} albums
              </span>
            </div>
          </div>
        )}

        {/* Wishlist "Add to Wishlist?" prompt overlay */}
        {wishlistPrompt && (
          <div
            className="absolute z-30 animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: Math.min(wishlistPrompt.screenX, (typeof window !== 'undefined' ? window.innerWidth - 260 : 300)),
              top: Math.min(wishlistPrompt.screenY - 80, (typeof window !== 'undefined' ? window.innerHeight - 160 : 300)),
            }}
          >
            <div className="bg-black/70 backdrop-blur-xl rounded-xl border border-amber-500/30 p-3 w-56 shadow-2xl shadow-amber-500/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">Add to Wishlist?</span>
                </div>
                <button
                  onClick={() => setWishlistPrompt(null)}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {wishlistPrompt.loading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                  <span className="text-xs text-white/60">Finding location...</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-white/80 mb-2.5 line-clamp-2 leading-relaxed">
                    {wishlistPrompt.locationName}
                  </p>
                  <button
                    onClick={handleConfirmWishlist}
                    disabled={wishlistPrompt.adding}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {wishlistPrompt.adding ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    {wishlistPrompt.adding ? 'Adding...' : 'Add Destination'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom Location Strip - Floating over globe */}
        {/* Explore mode strip */}
        {exploreMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[1200px] bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] px-3 py-2.5 z-10 shadow-2xl">
            {exploreLoading ? (
              <div className="flex items-center justify-center gap-2 py-3">
                <Loader2 className="h-4 w-4 text-olive-400 animate-spin" />
                <span className="text-xs text-white/50">Discovering travelers worldwide...</span>
              </div>
            ) : exploreAlbums.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-3">
                <Compass className="h-4 w-4 text-white/30" />
                <span className="text-xs text-white/50">No public albums found yet. Be the first to share!</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                  <Compass className="h-3 w-3 text-olive-400/70" />
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Community</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {exploreAlbums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/albums/${album.id}`}
                      className="flex-shrink-0 w-[64px] sm:w-[80px] md:w-[96px] rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:ring-1 hover:ring-olive-400/40 opacity-90 hover:opacity-100 group"
                    >
                      <div className="relative aspect-[3/4] bg-gradient-to-br from-stone-700 to-stone-800">
                        {album.cover_photo_url ? (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive-900/40 to-stone-800">
                            <Camera className="h-5 w-5 text-olive-400/50" />
                          </div>
                        )}
                        {/* User avatar overlay */}
                        {album.owner && (
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <Avatar className="h-5 w-5 ring-1 ring-black/40 shadow-md">
                              <AvatarImage
                                src={getPhotoUrl(album.owner.avatar_url, 'avatars') || ''}
                                alt={album.owner.display_name}
                              />
                              <AvatarFallback className="text-[7px] bg-olive-600 text-white">
                                {(album.owner.display_name || album.owner.username || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent">
                          <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1.5">
                            <p className="text-[9px] md:text-[10px] font-semibold text-white line-clamp-1 drop-shadow-lg leading-tight">
                              {album.title}
                            </p>
                            {album.owner && (
                              <p className="text-[8px] text-white/50 line-clamp-1 mt-0.5">
                                @{album.owner.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* My Globe mode: filmstrip at bottom of globe */}
        {!exploreMode && (albums.length > 0 || (showWishlist && wishlistItems.length > 0)) && (
          <>
            {/* Mobile only: Featured Album Card overlay */}
            {selectedAlbumId && (() => {
              const featured = albums.find(a => a.id === selectedAlbumId)
              if (!featured) return null
              const flag = featured.country_code
                ? featured.country_code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
                : null
              return (
                <div className="md:hidden absolute bottom-[68px] left-1/2 -translate-x-1/2 w-[94%] max-w-[1200px] z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-black/70 backdrop-blur-xl rounded-xl border border-white/[0.08] shadow-2xl px-3 py-2 flex items-center gap-2.5">
                    {/* Thumbnail */}
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-800">
                      {featured.cover_photo_url ? (
                        <Image
                          src={getPhotoUrl(featured.cover_photo_url) || ''}
                          alt={featured.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-4 w-4 text-olive-400/50" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-white truncate">{featured.title}</h3>
                      {featured.location_name && (
                        <p className="text-[10px] text-white/50 flex items-center gap-1 truncate">
                          {flag && <span className="text-xs">{flag}</span>}
                          <span className="truncate">{featured.location_name.split(',')[0]}</span>
                        </p>
                      )}
                    </div>
                    {/* Actions */}
                    <Link
                      href={`/albums/${featured.id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-olive-600 hover:bg-olive-500 text-white text-[11px] font-medium transition-colors flex-shrink-0"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => setSelectedAlbumId(null)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Album filmstrip — compact horizontal scroll */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[1200px] z-10">
              <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] px-2.5 py-2 shadow-2xl">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide items-center">
                  {albums.map((album) => (
                    <button
                      key={album.id}
                      onClick={() => handleAlbumClick(album.id)}
                      className={cn(
                        "flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200",
                        selectedAlbumId === album.id
                          ? "w-[56px] sm:w-[68px] md:w-[80px] ring-2 ring-olive-400 shadow-lg shadow-olive-500/20"
                          : "w-[48px] sm:w-[56px] md:w-[64px] hover:ring-1 hover:ring-white/20 opacity-70 hover:opacity-100"
                      )}
                    >
                      <div className="relative bg-gradient-to-br from-stone-700 to-stone-800 aspect-square">
                        {album.cover_photo_url ? (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive-900/40 to-stone-800">
                            <Camera className="h-4 w-4 text-olive-400/50" />
                          </div>
                        )}
                        {selectedAlbumId !== album.id && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                            <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5">
                              <p className="text-[7px] sm:text-[8px] font-medium text-white/90 line-clamp-1 drop-shadow-lg leading-tight">
                                {album.title}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedAlbumId === album.id && (
                          <div className="absolute inset-0 ring-inset ring-2 ring-olive-400/50 rounded-lg" />
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Wishlist items */}
                  {showWishlist && wishlistItems.length > 0 && (
                    <>
                      {albums.length > 0 && (
                        <div className="flex-shrink-0 flex items-center px-0.5">
                          <div className="w-px h-8 bg-amber-400/20 rounded-full" />
                        </div>
                      )}
                      {wishlistItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleWishlistItemClick(item)}
                          className="flex-shrink-0 w-[56px] md:w-[64px] rounded-lg overflow-hidden transition-all duration-200 hover:ring-1 hover:ring-amber-400/40 opacity-70 hover:opacity-100 group"
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-amber-900/50 to-amber-950/50 flex items-center justify-center">
                            <Star className="h-4 w-4 text-amber-400/60 fill-amber-400/20 group-hover:fill-amber-400/50 transition-colors" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                              <div className="absolute bottom-0 left-0 right-0 px-0.5 py-0.5">
                                <p className="text-[7px] font-medium text-amber-200/70 line-clamp-1 drop-shadow-lg leading-tight text-center">
                                  {item.location_name.split(',')[0]}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>{/* end globe container */}

        {/* Desktop Side Panel — shown when album selected, sits beside the globe */}
        {!exploreMode && selectedAlbumId && (() => {
          const featured = albums.find(a => a.id === selectedAlbumId)
          if (!featured) return null
          const flag = featured.country_code
            ? featured.country_code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
            : null
          return (
            <div className="hidden md:flex flex-col w-[320px] flex-shrink-0 bg-black/80 backdrop-blur-xl border-l border-white/[0.08] animate-in slide-in-from-right-5 duration-300">
              {/* Cover image */}
              <div className="relative h-[200px] flex-shrink-0">
                {featured.cover_photo_url ? (
                  <Image
                    src={getPhotoUrl(featured.cover_photo_url) || ''}
                    alt={featured.title}
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-olive-900/60 to-stone-800 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-olive-400/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <button
                  onClick={() => setSelectedAlbumId(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                {/* Title overlay on cover */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-semibold text-white mb-1">{featured.title}</h3>
                  {featured.location_name && (
                    <p className="text-sm text-white/60 flex items-center gap-1.5">
                      {flag && <span className="text-base">{flag}</span>}
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{featured.location_name}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Album details */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Date */}
                {(featured.date_start || featured.start_date) && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{new Date(featured.date_start || featured.start_date || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}

                {/* Description */}
                {featured.description && (
                  <p className="text-sm text-white/70 leading-relaxed">{featured.description}</p>
                )}

              </div>

              {/* View Album button pinned to bottom */}
              <div className="p-4 flex-shrink-0 border-t border-white/[0.06]">
                <Link
                  href={`/albums/${featured.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-olive-600 hover:bg-olive-500 text-white text-sm font-medium transition-colors"
                >
                  View Album
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Mobile Bottom Navigation Hint */}
      {isOwnProfile && albums.length === 0 && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-stone-200 dark:border-white/[0.06] p-5 z-30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center flex-shrink-0">
              <Globe2 className="h-4.5 w-4.5 text-olive-600 dark:text-olive-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Light up your globe</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Add your first trip to see it pinned here</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/albums/import" className="flex-1">
              <Button className="w-full gap-1.5 bg-olive-500 hover:bg-olive-600 text-white text-xs h-9">
                <Camera className="h-3.5 w-3.5" />
                Import Photos
              </Button>
            </Link>
            <Link href="/albums/new" className="flex-1">
              <Button variant="outline" className="w-full gap-1.5 text-xs h-9 border-stone-300 dark:border-stone-700">
                <Plus className="h-3.5 w-3.5" />
                Create Album
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Globe Flyover Export Modal */}
      {showFlyover && (
        <GlobeFlyoverExport
          globeRef={globeRef}
          locations={albums
            .filter((a) => a.latitude != null && a.longitude != null)
            .map((a) => ({
              lat: a.latitude!,
              lng: a.longitude!,
              name: a.title,
            }))}
          isOpen={showFlyover}
          onClose={() => setShowFlyover(false)}
        />
      )}
    </div>
  )
}

export default function GlobePage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center bg-gradient-to-b from-stone-50 to-white dark:from-[#000000] dark:to-[#111111] globe-height">
        <div className="flex flex-col items-center gap-4">
          <Globe2 className="h-12 w-12 text-olive-500 animate-pulse" />
          <p className="text-lg text-stone-700 font-medium">Loading your travel globe...</p>
        </div>
      </div>
    }>
      <GlobePageContent />
    </Suspense>
  )
}