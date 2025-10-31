'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Camera, Plus, Globe2, Map, Image as ImageIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { useFollows } from '@/lib/hooks/useFollows'
import type { Profile } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { designTokens, appStyles } from '@/lib/design-tokens'

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
  const { user } = useAuth()
  const supabase = createClient()
  const globeRef = useRef<EnhancedGlobeRef>(null)

  const urlAlbumId = searchParams.get('album')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const userId = searchParams.get('user')

  const [albums, setAlbums] = useState<AlbumPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(urlAlbumId)
  const [stats, setStats] = useState({ totalAlbums: 0, totalCountries: 0, totalPhotos: 0 })
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isPrivateAccount, setIsPrivateAccount] = useState(false)
  const [profileUser, setProfileUser] = useState<{ id: string; username: string; display_name: string; avatar_url?: string; privacy_level?: string } | null>(null)
  const [showSidebar, setShowSidebar] = useState(true) // Always show sidebar by default on desktop

  const targetUserId = userId || user?.id
  const { followStatus } = useFollows(targetUserId || '')

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Desktop Header with Stats - Above Globe */}
      <div className="hidden md:block bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Title and User Info */}
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Globe2 className="h-7 w-7 text-teal-500" />
                {isOwnProfile ? 'Your Travel Globe' : `${profileUser?.display_name || profileUser?.username}'s Globe`}
              </h1>

              {/* Stats Cards - Horizontal Layout */}
              <div className="flex items-center gap-4 ml-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-teal-500" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">{stats.totalAlbums}</span>
                    <span className="text-sm text-gray-600">Adventures</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <Globe2 className="h-4 w-4 text-teal-500" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">{stats.totalCountries}</span>
                    <span className="text-sm text-gray-600">Countries</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <Camera className="h-4 w-4 text-teal-500" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">{stats.totalPhotos}</span>
                    <span className="text-sm text-gray-600">Photos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-3">
              {/* Toggle button only on medium screens (hidden on large screens where sidebar is always visible) */}
              {albums.length > 0 && (
                <Button
                  onClick={() => setShowSidebar(!showSidebar)}
                  variant="outline"
                  className="gap-2 border-gray-300 lg:hidden"
                >
                  <Map className="h-4 w-4" />
                  {showSidebar ? 'Hide' : 'Show'} Locations
                  <span className="ml-1 px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                    {albums.length}
                  </span>
                </Button>
              )}
              {isOwnProfile && (
                <Link href="/albums/new">
                  <Button className="gap-2 bg-teal-500 hover:bg-teal-600 text-white shadow-md hover:shadow-lg transition-all">
                    <Plus className="h-4 w-4" />
                    Add Adventure
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header with Stats */}
      <div className="md:hidden bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-teal-500" />
              {isOwnProfile ? 'Your Globe' : `${profileUser?.display_name || profileUser?.username}'s`}
            </h1>
            {isOwnProfile && (
              <Link href="/albums/new">
                <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 text-white">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </Link>
            )}
          </div>

          {/* Stats Grid - Mobile */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.totalAlbums}</div>
              <div className="text-xs text-gray-600">Adventures</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.totalCountries}</div>
              <div className="text-xs text-gray-600">Countries</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-gray-900">{stats.totalPhotos}</div>
              <div className="text-xs text-gray-600">Photos</div>
            </div>
          </div>
        </div>

        {/* Mobile Album Carousel */}
        {albums.length > 0 && (
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumClick(album.id)}
                  className={cn(
                    "flex-shrink-0 w-20 rounded-lg overflow-hidden transition-all",
                    selectedAlbumId === album.id
                      ? "ring-2 ring-teal-500 shadow-lg"
                      : "hover:shadow-md"
                  )}
                >
                  <div className="relative aspect-square bg-gray-100">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Camera className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 bg-white">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {album.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Globe and Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Globe Container - Clean, No Overlays */}
        <div className="flex-1 relative bg-gradient-to-b from-slate-900 to-slate-800">
          <EnhancedGlobe
            ref={globeRef}
            initialAlbumId={urlAlbumId || undefined}
            initialLat={lat ? parseFloat(lat) : undefined}
            initialLng={lng ? parseFloat(lng) : undefined}
            filterUserId={userId || undefined}
          />
        </div>

        {/* Desktop Sidebar - Always visible on larger screens, toggleable on medium screens */}
        {albums.length > 0 && (
          <div className={cn(
            "hidden md:flex w-80 lg:w-96 bg-white border-l border-gray-200 z-20 flex-col transition-all duration-300",
            "lg:relative lg:translate-x-0", // Always visible on large screens
            "md:absolute md:right-0 md:top-0 md:bottom-0", // Toggleable on medium screens
            showSidebar ? "md:translate-x-0 md:shadow-2xl" : "md:translate-x-full"
          )}>
          {/* Sidebar Header */}
          <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Locations
              </h2>
              <span className="ml-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                {albums.length}
              </span>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            ) : albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6">
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-teal-400" />
                </div>
                <p className="text-base font-medium text-gray-900 mb-2">No locations yet</p>
                <p className="text-sm text-gray-600 text-center">
                  {isOwnProfile ? 'Create albums with locations to see them here' : 'No adventures to show'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleAlbumClick(album.id)}
                    className={cn(
                      "w-full text-left group rounded-lg overflow-hidden bg-white border-2 transition-all",
                      selectedAlbumId === album.id
                        ? "border-teal-500 shadow-lg"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                    )}
                  >
                    <div className="relative h-40 bg-gray-100">
                      {album.cover_photo_url ? (
                        <Image
                          src={getPhotoUrl(album.cover_photo_url) || ''}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="360px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="font-semibold text-white text-sm mb-1 line-clamp-1">
                            {album.title}
                          </p>
                          {album.location_name && (
                            <p className="text-xs text-white/90 flex items-center gap-1 line-clamp-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {album.location_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedAlbumId === album.id && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-teal-500 text-white text-xs font-medium rounded">
                          Active
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
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