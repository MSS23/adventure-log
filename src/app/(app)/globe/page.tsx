'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Camera, Plus } from 'lucide-react'
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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <p className="text-base text-gray-900 font-medium">Loading Globe...</p>
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
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Mobile Layout: Stats + Albums */}
      <div className="md:hidden flex flex-col bg-white">
        {/* Stats Section - Mobile Only */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalAlbums}</div>
              <div className="text-xs text-gray-600">Albums</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalCountries}</div>
              <div className="text-xs text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</div>
              <div className="text-xs text-gray-600">Photos</div>
            </div>
          </div>
        </div>

        {/* Album Previews - Mobile Horizontal Scroll */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Adventures</h3>
            {albums.length > 0 && (
              <span className="text-sm text-gray-500">{albums.length}</span>
            )}
          </div>

          {/* Add Adventure Button - Only for own profile */}
          {isOwnProfile && (
            <Link href="/albums/new" className="block mb-4">
              <Button className="w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white">
                <Plus className="h-4 w-4" />
                Add Your Own Adventure
              </Button>
            </Link>
          )}

          {/* Album Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center w-full py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            ) : albums.length === 0 ? (
              <div className="w-full text-center py-8 text-sm text-gray-500">
                {isOwnProfile ? 'Create your first album with a location' : 'No adventures yet'}
              </div>
            ) : (
              albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumClick(album.id)}
                  className={cn(
                    "flex-shrink-0 w-36 rounded-xl overflow-hidden transition-all",
                    selectedAlbumId === album.id
                      ? "ring-2 ring-teal-500 shadow-lg"
                      : "hover:shadow-md"
                  )}
                >
                  <div className="relative aspect-video bg-gray-100">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="144px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="font-semibold text-xs text-white truncate">
                          {album.title}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Globe Section - Full height on mobile, flex-1 on desktop */}
      <div className="flex-1 relative h-screen md:h-full md:min-h-screen overflow-hidden">
        <EnhancedGlobe
          ref={globeRef}
          initialAlbumId={urlAlbumId || undefined}
          initialLat={lat ? parseFloat(lat) : undefined}
          initialLng={lng ? parseFloat(lng) : undefined}
          filterUserId={userId || undefined}
        />
      </div>

      {/* Desktop Sidebar - Album Previews (hidden on mobile) */}
      <div className="hidden md:flex flex-col w-80 lg:w-96 bg-white border-l border-gray-100">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Locations
            </h2>
            {albums.length > 0 && (
              <span className="ml-auto text-sm font-medium text-gray-500">
                {albums.length}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {albums.length > 0 ? 'Click to explore on globe' : 'No locations yet'}
          </p>
        </div>

        {/* Add Adventure Button - Desktop */}
        {isOwnProfile && albums.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <Link href="/albums/new">
              <Button className="w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white">
                <Plus className="h-4 w-4" />
                Add New Adventure
              </Button>
            </Link>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading locations...</p>
              </div>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Camera className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-900 mb-2">No locations yet</p>
              <p className="text-sm text-gray-600 mb-4">
                {isOwnProfile ? 'Create albums with locations to see them here' : 'No adventures to show'}
              </p>
              {isOwnProfile && (
                <Link href="/albums/new">
                  <Button className="gap-2 bg-teal-500 hover:bg-teal-600 text-white">
                    <Plus className="h-4 w-4" />
                    Create First Album
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumClick(album.id)}
                  className={cn(
                    "w-full text-left group rounded-xl overflow-hidden transition-all",
                    selectedAlbumId === album.id
                      ? "ring-2 ring-teal-500 shadow-lg"
                      : "hover:shadow-lg"
                  )}
                >
                  <div className="relative aspect-video bg-gray-100">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="320px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="font-semibold text-sm text-white truncate mb-1">
                          {album.title}
                        </p>
                        {album.location_name && (
                          <p className="text-xs text-white/90 flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span>{album.location_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}