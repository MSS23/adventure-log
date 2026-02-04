'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Camera, Plus, Globe2, Calendar, ChevronDown } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AlbumPreview {
  id: string
  title: string
  cover_photo_url?: string
  location_name?: string
  latitude?: number
  longitude?: number
  created_at: string
}

export interface EnhancedGlobeRef {
  navigateToAlbum: (albumId: string, lat: number, lng: number) => void
  getAvailableYears: () => number[]
}

const EnhancedGlobe = dynamic(() => import('@/components/globe/EnhancedGlobe').then(mod => ({ default: mod.EnhancedGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Globe2 className="h-12 w-12 text-teal-400 opacity-40" />
          </div>
          <Globe2 className="h-12 w-12 text-teal-500 animate-pulse" />
        </div>
        <p className="text-lg text-gray-700 font-medium">Loading your travel globe...</p>
      </div>
    </div>
  )
})

export default function GlobePage() {
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
  const [showSidebar] = useState(true) // Always show sidebar by default on desktop
  const [friends, setFriends] = useState<Array<{ id: string; username: string; display_name: string; avatar_url?: string; last_active?: string }>>([])
  const [, setLoadingFriends] = useState(false)

  // Year filter state for controlling EnhancedGlobe
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [globeReady, setGlobeReady] = useState(false)

  const targetUserId = userId || user?.id
  const { followStatus, following } = useFollows(targetUserId || '')

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
            country_code
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

  // Poll for available years from globe when it's ready
  useEffect(() => {
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

    // Initial check
    if (checkForYears()) return

    // Poll every 500ms until we get years
    const interval = setInterval(() => {
      if (checkForYears()) {
        clearInterval(interval)
      }
    }, 500)

    // Cleanup
    return () => clearInterval(interval)
  }, [])

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
  }, [user?.id, following, supabase])

  const handleViewFriendGlobe = (friendId: string) => {
    router.push(`/globe?user=${friendId}`)
  }

  // Show private account message if user doesn't have access
  if (isPrivateAccount && profileUser && followStatus !== 'following') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <PrivateAccountMessage
            profile={profileUser as unknown as Profile}
            showFollowButton={true}
          />

          <p className="text-center text-sm text-gray-600 mt-4">
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
      className="w-full bg-gray-50 flex flex-col overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8"
      style={{
        width: 'calc(100% + 2rem)',
        height: 'calc(100vh - 80px)',
        minHeight: 'calc(100vh - 80px)'
      }}
    >
      {/* Ultra Compact Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="w-full px-2 md:px-3 py-1.5 md:py-2">
          <div className="flex items-center justify-between gap-1.5 md:gap-2">
            {/* Left: Title + Stats */}
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <Globe2 className="h-8 w-8 md:h-10 md:w-10 text-teal-500" />
                <span className="hidden sm:inline">
                  {isOwnProfile ? 'Your Travel Globe' : `${profileUser?.display_name || profileUser?.username}'s Globe`}
                </span>
                <span className="sm:hidden">
                  {isOwnProfile ? 'Globe' : `${profileUser?.display_name || profileUser?.username}'s`}
                </span>
              </h1>

              {/* Stats - Bigger and more readable */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <MapPin className="h-8 w-8 text-teal-500" />
                  <span className="text-2xl font-bold text-gray-900">{stats.totalAlbums}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <Globe2 className="h-8 w-8 text-teal-500" />
                  <span className="text-2xl font-bold text-gray-900">{stats.totalCountries}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <Camera className="h-8 w-8 text-teal-500" />
                  <span className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</span>
                </div>
              </div>

              {/* Year Filter Dropdown */}
              {availableYears.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all">
                      <Calendar className="h-4 w-4" />
                      <span>{selectedYear ? selectedYear : 'All Years'}</span>
                      <ChevronDown className="h-4 w-4" />
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
            <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
              {/* Friends Avatars - Desktop only */}
              {isOwnProfile && friends.length > 0 && (
                <div className="hidden lg:flex items-center -space-x-2">
                  {friends.slice(0, 5).map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleViewFriendGlobe(friend.id)}
                      className="relative group"
                      title={friend.display_name}
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-white hover:ring-teal-400 transition-all hover:scale-110 hover:z-10">
                        <AvatarImage
                          src={getPhotoUrl(friend.avatar_url, 'avatars') || ''}
                          alt={friend.display_name}
                        />
                        <AvatarFallback className="text-sm bg-teal-500 text-white">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ))}
                  {friends.length > 5 && (
                    <Link
                      href="/followers?tab=following"
                      className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 ring-2 ring-white text-xs font-semibold text-gray-600 hover:bg-gray-300 transition-all"
                    >
                      +{friends.length - 5}
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
                  <span className="hidden md:inline">My Globe</span>
                </Button>
              )}

              {isOwnProfile && (
                <Link href="/albums/new">
                  <Button size="sm" className="gap-1 h-7 px-2 bg-teal-500 hover:bg-teal-600 text-white text-xs">
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full-size Globe */}
      <div className="flex-1 bg-slate-900 relative overflow-hidden">
        {/* Globe Container - Absolute positioned to fill parent */}
        <div className="absolute inset-0">
          <EnhancedGlobe
            ref={globeRef}
            className="w-full h-full"
            hideHeader={true}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            initialAlbumId={urlAlbumId || undefined}
            initialLat={lat ? parseFloat(lat) : undefined}
            initialLng={lng ? parseFloat(lng) : undefined}
            filterUserId={userId || undefined}
          />
        </div>

        {/* Bottom Location Strip - Floating over globe */}
        {albums.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[1400px] bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-2 md:p-3 z-10">
            <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-1">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumClick(album.id)}
                  className={cn(
                    "flex-shrink-0 w-20 md:w-24 lg:w-28 rounded-lg overflow-hidden transition-all",
                    selectedAlbumId === album.id
                      ? "ring-2 ring-teal-400 shadow-lg shadow-teal-500/30 scale-105"
                      : "hover:scale-105 hover:ring-1 hover:ring-white/30"
                  )}
                >
                  <div className="relative h-20 md:h-24 lg:h-28 bg-gradient-to-br from-gray-700 to-gray-800">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-900/50 to-cyan-900/50">
                        <Camera className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-teal-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1">
                        <p className="text-[10px] md:text-xs font-bold text-white line-clamp-1 drop-shadow-lg leading-tight">
                          {album.title}
                        </p>
                      </div>
                    </div>
                    {selectedAlbumId === album.id && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full shadow-lg shadow-teal-400/50 animate-pulse"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Hint */}
      {isOwnProfile && albums.length === 0 && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-3 text-center">Start mapping your adventures!</p>
          <Link href="/albums/new">
            <Button className="w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white">
              <Plus className="h-4 w-4" />
              Create Your First Album
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}