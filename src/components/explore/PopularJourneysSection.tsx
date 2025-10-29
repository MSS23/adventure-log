'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

interface PopularJourneysSectionProps {
  className?: string
  limit?: number
}

export function PopularJourneysSection({ className, limit = 6 }: PopularJourneysSectionProps) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPopularAlbums() {
      const supabase = createClient()

      try {
        setIsLoading(true)
        setError(null)

        // Fetch albums sorted by created date (most recent first) with public visibility
        const { data, error: fetchError } = await supabase
          .from('albums')
          .select(`
            *,
            users!albums_user_id_fkey(id, username, display_name, avatar_url),
            photos(id, file_path)
          `)
          .eq('privacy', 'public')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fetchError) {
          log.error('Error fetching popular albums', {
            component: 'PopularJourneysSection',
            action: 'fetchPopularAlbums'
          }, fetchError)
          setError('Failed to load popular journeys')
          return
        }

        setAlbums(data || [])
      } catch (err) {
        log.error('Error in fetchPopularAlbums', {
          component: 'PopularJourneysSection',
          action: 'fetchPopularAlbums'
        }, err as Error)
        setError('Failed to load popular journeys')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPopularAlbums()
  }, [limit])

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No popular journeys to display yet</p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {albums.map((album) => {
        // Type assertion for Supabase join
        const albumWithUser = album as Album & { users?: { username?: string; display_name?: string; avatar_url?: string } }
        const user = album.user || albumWithUser.users

        // Get cover photo URL - first try the cover_photo_url, then first photo
        let coverUrl: string | undefined
        if (album.cover_photo_url || album.cover_image_url) {
          coverUrl = getPhotoUrl(album.cover_photo_url || album.cover_image_url)
        } else if (album.photos && album.photos.length > 0) {
          coverUrl = getPhotoUrl(album.photos[0].file_path)
        }

        return (
          <div
            key={album.id}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
          >
            {/* Album Cover Image */}
            <Link href={`/albums/${album.id}`} className="block relative aspect-[16/9] overflow-hidden bg-gray-200">
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt={album.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <MapPin className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </Link>

            {/* Album Info */}
            <div className="p-4 space-y-3">
              <Link href={`/albums/${album.id}`}>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1">
                  {album.title}
                </h3>
              </Link>

              {/* Location */}
              {album.location_name && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{album.location_name}</span>
                </div>
              )}

              {/* User Info */}
              {user && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <Link
                    href={`/profile/${user.username}`}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || user.username} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold">
                        {(user.display_name || user.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-600">
                      by <span className="font-medium text-gray-900">{user.display_name || user.username}</span>
                    </span>
                  </Link>

                  <Link href={`/albums/${album.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium"
                    >
                      View Album
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
