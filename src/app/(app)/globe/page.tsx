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
  const [showSidebar, setShowSidebar] = useState(false)

  const targetUserId = userId || user?.id
  const { followStatus } = useFollows(targetUserId || '')

  // Fetch albums with location data
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true)

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Mobile Header with Stats */}
      <div className="md:hidden bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-teal-500" />
              Your Travel Globe
            </h1>
            {isOwnProfile && albums.length > 0 && (
              <Link href="/albums/new">
                <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 text-white shadow-md">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Stats Grid - Mobile */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-teal-700">{stats.totalAlbums}</div>
              <div className="text-xs text-teal-600">Albums</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-blue-700">{stats.totalCountries}</div>
              <div className="text-xs text-blue-600">Countries</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2.5 text-center">
              <div className="text-xl font-bold text-purple-700">{stats.totalPhotos}</div>
              <div className="text-xs text-purple-600">Photos</div>
            </div>
          </div>
        </div>

        {/* Mobile Album Carousel */}
        {albums.length > 0 && (
          <div className="px-4 py-3 bg-gray-50/50">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumClick(album.id)}
                  className={cn(
                    "flex-shrink-0 w-24 rounded-lg overflow-hidden transition-all",
                    selectedAlbumId === album.id
                      ? "ring-2 ring-teal-500 shadow-lg scale-105"
                      : "hover:shadow-md hover:scale-102"
                  )}
                >
                  <div className="relative aspect-square bg-gray-100">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Camera className="h-5 w-5 text-gray-400" />
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

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Stats Overlay */}
        <div className="hidden md:block absolute top-6 left-6 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 min-w-[320px]">
            <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe2 className="h-6 w-6 text-teal-500" />
              {isOwnProfile ? 'Your Travel Globe' : `${profileUser?.display_name || profileUser?.username}'s Globe`}
            </h1>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {stats.totalAlbums}
                </div>
                <div className="text-xs text-gray-600 mt-1">Adventures</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {stats.totalCountries}
                </div>
                <div className="text-xs text-gray-600 mt-1">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {stats.totalPhotos}
                </div>
                <div className="text-xs text-gray-600 mt-1">Photos</div>
              </div>
            </div>

            {isOwnProfile && (
              <Link href="/albums/new" className="block mt-4">
                <Button className="w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4" />
                  Add New Adventure
                </Button>
              </Link>
            )}

            {/* View Albums Button for Desktop */}
            {albums.length > 0 && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="w-full mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Map className="h-4 w-4" />
                {showSidebar ? 'Hide' : 'Show'} Locations ({albums.length})
              </button>
            )}
          </div>
        </div>

        {/* Globe Container - Full Screen */}
        <div className="flex-1 relative bg-gradient-to-b from-gray-50 to-white">
          <div className="absolute inset-0">
            <EnhancedGlobe
              ref={globeRef}
              initialAlbumId={urlAlbumId || undefined}
              initialLat={lat ? parseFloat(lat) : undefined}
              initialLng={lng ? parseFloat(lng) : undefined}
              filterUserId={userId || undefined}
            />
          </div>
        </div>

        {/* Desktop Sidebar - Slide in/out */}
        <div className={cn(
          "hidden md:block absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-100 shadow-2xl transition-transform duration-300 z-20",
          showSidebar ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Sidebar Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-500" />
                <h2 className="text-lg font-bold text-gray-900">
                  Locations
                </h2>
                <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                  {albums.length}
                </span>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="h-full overflow-y-auto pb-20">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            ) : albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center mb-4">
                  <Camera className="h-10 w-10 text-teal-400" />
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
                      "w-full text-left group rounded-xl overflow-hidden bg-white border transition-all",
                      selectedAlbumId === album.id
                        ? "border-teal-500 shadow-lg shadow-teal-500/20"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-lg"
                    )}
                  >
                    <div className="relative h-48 bg-gray-100">
                      {album.cover_photo_url ? (
                        <Image
                          src={getPhotoUrl(album.cover_photo_url) || ''}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="360px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="font-bold text-white mb-1">
                            {album.title}
                          </p>
                          {album.location_name && (
                            <p className="text-sm text-white/90 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {album.location_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedAlbumId === album.id && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-teal-500 text-white text-xs font-medium rounded-full">
                          Selected
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle Sidebar Button - Desktop Only (when sidebar is hidden) */}
        {!showSidebar && albums.length > 0 && (
          <button
            onClick={() => setShowSidebar(true)}
            className="hidden md:flex absolute right-6 top-6 z-10 items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-all hover:bg-white"
          >
            <Map className="h-4 w-4 text-teal-500" />
            <span className="text-sm font-medium text-gray-700">Show Locations</span>
            <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">
              {albums.length}
            </span>
          </button>
        )}
      </div>

      {/* Mobile Bottom Navigation Hint */}
      {isOwnProfile && albums.length === 0 && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-600 mb-3 text-center">Start mapping your adventures!</p>
          <Link href="/albums/new">
            <Button className="w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white shadow-lg">
              <Plus className="h-4 w-4" />
              Create Your First Album
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}