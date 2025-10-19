'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Camera } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
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

  const urlAlbumId = searchParams.get('album')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const userId = searchParams.get('user')

  const [albums, setAlbums] = useState<AlbumPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(urlAlbumId)
  const [selectedAlbumCoords, setSelectedAlbumCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
  )
  const [globeKey, setGlobeKey] = useState(0)

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
    setSelectedAlbumCoords({
      lat: album.latitude,
      lng: album.longitude
    })
    setGlobeKey(prev => prev + 1)

    log.info('Album clicked for globe navigation', {
      component: 'GlobePage',
      action: 'album-click',
      albumId,
      latitude: album.latitude,
      longitude: album.longitude
    })
  }, [albums])

  return (
    <div className="relative h-screen overflow-hidden bg-gray-900">
      {/* Globe - Full Screen */}
      <div className="absolute inset-0">
        <EnhancedGlobe
          key={globeKey}
          initialAlbumId={selectedAlbumId || undefined}
          initialLat={selectedAlbumCoords?.lat}
          initialLng={selectedAlbumCoords?.lng}
          filterUserId={userId || undefined}
        />
      </div>

      {/* Floating Album Preview Cards - Overlay */}
      {!loading && albums.length > 0 && (
        <div className="absolute top-6 right-6 z-10 hidden md:flex flex-col gap-3 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md rounded-lg shadow-lg">
            <MapPin className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-semibold text-gray-900">
              {albums.length} {albums.length === 1 ? 'Location' : 'Locations'}
            </span>
          </div>

          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => handleAlbumClick(album.id)}
              className={cn(
                "group relative w-64 rounded-xl overflow-hidden transition-all shadow-lg hover:shadow-2xl",
                selectedAlbumId === album.id
                  ? "ring-2 ring-orange-500 scale-105"
                  : "hover:scale-105"
              )}
            >
              <div className="relative aspect-[16/9] bg-gray-900">
                {album.cover_photo_url ? (
                  <Image
                    src={getPhotoUrl(album.cover_photo_url) || ''}
                    alt={album.title}
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Camera className="h-8 w-8 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-semibold text-sm text-white truncate mb-1">{album.title}</p>
                    {album.location_name && (
                      <p className="text-xs text-white/90 flex items-center gap-1.5 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {album.location_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute top-6 right-6 z-10 px-4 py-3 bg-white/95 backdrop-blur-md rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span className="text-sm font-medium text-gray-900">Loading locations...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && albums.length === 0 && (
        <div className="absolute top-6 right-6 z-10 px-4 py-3 bg-white/95 backdrop-blur-md rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <Camera className="h-4 w-4" />
            <span className="text-sm font-medium">No locations yet</span>
          </div>
        </div>
      )}
    </div>
  )
}