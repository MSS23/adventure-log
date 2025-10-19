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
import type { Album } from '@/types/database'

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

  const [albums, setAlbums] = useState<Album[]>([])
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 overflow-hidden">
      <div className="h-screen flex gap-4 p-4">
        {/* Globe - Takes most of the space */}
        <div className="flex-1 min-w-0">
          <Card className="h-full overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0 h-full">
              <EnhancedGlobe
                key={globeKey}
                initialAlbumId={selectedAlbumId || undefined}
                initialLat={selectedAlbumCoords?.lat}
                initialLng={selectedAlbumCoords?.lng}
                filterUserId={userId || undefined}
              />
            </CardContent>
          </Card>
        </div>

        {/* Album Sidebar - Hidden on mobile, visible on lg+ */}
        {albums.length > 0 && (
          <div className="hidden lg:block w-80 flex-shrink-0">
            <Card className="h-full overflow-hidden border-0 shadow-lg">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-600" />
                    Locations ({albums.length})
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Click an album to explore on the globe
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                    {albums.map((album) => (
                      <button
                        key={album.id}
                        onClick={() => handleAlbumClick(album.id)}
                        className={cn(
                          "w-full text-left group relative rounded-lg overflow-hidden transition-all",
                          "hover:ring-2 hover:ring-orange-500 hover:shadow-lg",
                          selectedAlbumId === album.id && "ring-2 ring-orange-600 shadow-lg"
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
                              <Camera className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                              <p className="font-medium text-sm truncate">{album.title}</p>
                              {album.location_name && (
                                <p className="text-xs opacity-90 flex items-center gap-1 mt-1 truncate">
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}