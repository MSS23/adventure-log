'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { MapPin, Plus } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

export function ExploreSidebar() {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUserAlbums() {
      if (!user) {
        setIsLoading(false)
        return
      }

      const supabase = createClient()

      try {
        setIsLoading(true)

        // Fetch user's albums
        const { data, error: fetchError } = await supabase
          .from('albums')
          .select(`
            *,
            photos(id, file_path)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6)

        if (fetchError) {
          log.error('Error fetching user albums', {
            component: 'ExploreSidebar',
            action: 'fetchUserAlbums'
          }, fetchError)
          return
        }

        setAlbums(data || [])
      } catch (err) {
        log.error('Error in fetchUserAlbums', {
          component: 'ExploreSidebar',
          action: 'fetchUserAlbums'
        }, err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAlbums()
  }, [user])

  return (
    <aside className="hidden xl:flex xl:w-[340px] flex-col fixed right-0 top-0 h-screen bg-white z-30 border-l border-gray-100">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Suggestions for You
            </h2>
            <Link
              href="/albums/new"
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              See All
            </Link>
          </div>
        </div>

        {/* My Albums Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              My Albums
            </h3>
            <Link
              href="/albums/new"
              className="p-1.5 hover:bg-gray-50 rounded-full transition-colors"
              title="Create new album"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-50 rounded-full inline-flex mb-3">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">No albums yet</p>
              <Link href="/albums/new">
                <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors">
                  Create Album
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {albums.map((album) => {
                // Get cover photo URL
                let coverUrl: string | undefined
                if (album.cover_photo_url || album.cover_image_url) {
                  coverUrl = getPhotoUrl(album.cover_photo_url || album.cover_image_url)
                } else if (album.photos && album.photos.length > 0) {
                  coverUrl = getPhotoUrl(album.photos[0].file_path)
                }

                return (
                  <Link
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
                  >
                    {coverUrl ? (
                      <>
                        <Image
                          src={coverUrl}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="120px"
                        />
                        {/* Hover overlay with title */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-white text-xs font-medium line-clamp-2">
                              {album.title}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
                        <MapPin className="h-6 w-6 text-teal-500" />
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          {albums.length > 0 && (
            <Link
              href="/albums"
              className="block mt-4 text-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              View All Albums
            </Link>
          )}
        </div>

        {/* No suggestions section - placeholder for future */}
        <div className="p-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            No suggestions available
          </p>
        </div>
      </div>
    </aside>
  )
}
