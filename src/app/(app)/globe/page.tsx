'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Camera } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { BackButton } from '@/components/common/BackButton'
import Image from 'next/image'
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-lg text-gray-600 font-medium">Loading Globe Experience...</p>
        <p className="text-sm text-gray-500 max-w-md text-center">
          Preparing your interactive world map with travel locations and flight animations
        </p>
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
            created_at
          `)
          .eq('user_id', targetUserId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .neq('status', 'draft')
          .order('created_at', { ascending: false })

        if (error) throw error

        setAlbums(data || [])
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

  return (
    <div className="h-screen flex flex-row bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Back Button - Floating */}
      <div className="absolute top-4 left-4 z-[60]">
        <BackButton fallbackRoute="/feed" variant="default" className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg" />
      </div>

      {/* Globe Section */}
      <div className="flex-1 relative">
        <EnhancedGlobe
          ref={globeRef}
          initialAlbumId={urlAlbumId || undefined}
          initialLat={lat ? parseFloat(lat) : undefined}
          initialLng={lng ? parseFloat(lng) : undefined}
          filterUserId={userId || undefined}
        />
      </div>

      {/* Sidebar - Album Previews */}
      <div className="flex flex-col w-32 sm:w-48 md:w-80 lg:w-96 bg-white border-l border-gray-200 relative z-30">
        {/* Header */}
        <div className="flex-shrink-0 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 border-b border-gray-200">
          <div className="flex items-center gap-1 sm:gap-2">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
            <h2 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 truncate">
              Locations
            </h2>
            {albums.length > 0 && (
              <span className="ml-auto text-[10px] sm:text-xs md:text-sm font-medium text-gray-500 flex-shrink-0">
                {albums.length}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
            {albums.length > 0 ? 'Tap to explore on globe' : 'No locations yet'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full py-4 sm:py-6 md:py-8">
              <div className="text-center">
                <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 animate-spin text-blue-500 mx-auto mb-1 sm:mb-2 md:mb-3" />
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 hidden sm:block">Loading locations...</p>
              </div>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-2 sm:p-4 md:p-8 text-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                <Camera className="h-5 w-5 sm:h-8 sm:w-8 md:h-10 md:w-10 text-gray-400" />
              </div>
              <p className="text-[10px] sm:text-sm md:text-base font-medium text-gray-900 mb-0.5 sm:mb-1 md:mb-2">No locations</p>
              <p className="text-[9px] sm:text-xs md:text-sm text-gray-600 hidden sm:block">
                Create albums with locations to see them appear here
              </p>
            </div>
          ) : (
            <div className="p-1 sm:p-2 md:p-4 space-y-1 sm:space-y-2 md:space-y-3">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleAlbumClick(album.id)}
                  className={cn(
                    "w-full text-left group rounded-md sm:rounded-lg overflow-hidden transition-all border sm:border-2",
                    selectedAlbumId === album.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                  )}
                >
                  <div className="relative aspect-video bg-gray-100">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 128px, (max-width: 768px) 192px, 320px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-2 md:p-3">
                        <p className="font-semibold text-[10px] sm:text-xs md:text-sm text-white truncate mb-0.5 sm:mb-1">
                          {album.title}
                        </p>
                        {album.location_name && (
                          <p className="text-[9px] sm:text-[10px] md:text-xs text-white/90 flex items-center gap-0.5 sm:gap-1 md:gap-1.5 truncate">
                            <MapPin className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                            <span className="hidden sm:inline">{album.location_name}</span>
                            <span className="sm:hidden">{album.location_name.split(',')[0]}</span>
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