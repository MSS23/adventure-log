'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'

interface RelatedAlbumsProps {
  userId: string
  currentAlbumId: string
  username: string
  className?: string
}

export function RelatedAlbums({
  userId,
  currentAlbumId,
  username,
  className
}: RelatedAlbumsProps) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchRelatedAlbums = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', userId)
          .neq('id', currentAlbumId)
          .order('created_at', { ascending: false })
          .limit(4)

        if (error) throw error

        setAlbums(data || [])
      } catch (err) {
        log.error('Failed to fetch related albums', {
          component: 'RelatedAlbums',
          action: 'fetchRelatedAlbums',
          userId,
          currentAlbumId
        }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchRelatedAlbums()
    }
  }, [userId, currentAlbumId, supabase])

  if (loading) {
    return (
      <div className={cn("mt-12", className)}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">More from {username}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded mt-3" />
              <div className="h-3 bg-gray-200 rounded mt-1 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (albums.length === 0) {
    return null
  }

  return (
    <div className={cn("mt-12", className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">More from {username}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {albums.map((album) => {
          const coverUrl = album.cover_photo_url || album.cover_image_url
          const photoUrl = coverUrl ? getPhotoUrl(coverUrl) : null

          return (
            <div key={album.id} className="group">
              <Link href={`/albums/${album.id}`}>
                <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-gray-100">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={album.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <span className="text-gray-400 text-sm">No photo</span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="mt-3">
                <Link href={`/albums/${album.id}`}>
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-1 hover:underline">
                    {album.title}
                  </h4>
                </Link>
                {album.location_name && (
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{album.location_name}</p>
                )}
              </div>

              {/* View button */}
              <Link
                href={`/albums/${album.id}`}
                className="mt-3 block text-center py-1.5 px-3 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
