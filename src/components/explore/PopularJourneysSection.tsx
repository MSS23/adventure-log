'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { AlbumFavoriteButton } from '@/components/ui/favorite-button'

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
          .eq('visibility', 'public')
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
          <div key={i} className="group">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
              <div className="p-5 space-y-4">
                <div>
                  <div className="h-5 bg-gray-200 rounded-md animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-md w-1/2 animate-pulse mt-2" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded-md w-24 animate-pulse" />
                  </div>
                  <div className="h-9 w-24 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <MapPin className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-gray-700 font-medium mb-2">Oops, something went wrong</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-gray-50 rounded-full mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium mb-2">No journeys yet</p>
        <p className="text-gray-500 text-sm">Be the first to share your adventure!</p>
      </div>
    )
  }

  return (
    <motion.div
      className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
          }
        }
      }}
    >
      {albums.map((album) => {
        // Type assertion for Supabase join
        const albumWithUser = album as Album & { users?: { username?: string; display_name?: string; avatar_url?: string } }
        const user = album.user || albumWithUser.users

        // Get cover photo URL - first try the cover_photo_url, then first photo
        let coverUrl: string | undefined
        if (album.cover_photo_url || album.cover_image_url) {
          const rawUrl = album.cover_photo_url || album.cover_image_url
          // If it's already a full URL (external like Unsplash), use it directly
          coverUrl = rawUrl?.startsWith('http') ? rawUrl : getPhotoUrl(rawUrl)
        } else if (album.photos && album.photos.length > 0) {
          coverUrl = getPhotoUrl(album.photos[0].file_path)
        }

        // Extract country from location_name (last part after comma)
        const locationParts = album.location_name?.split(',').map(part => part.trim())
        const country = locationParts?.[locationParts.length - 1] || album.location_name

        return (
          <motion.div
            key={album.id}
            className="group"
            variants={{
              hidden: { opacity: 0, y: 30, scale: 0.95 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 24
                }
              }
            }}
          >
            <motion.div
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-shadow duration-300"
              whileHover={{
                y: -4,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Album Cover Image */}
              <Link href={`/albums/${album.id}`} className="block relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                {coverUrl ? (
                  <>
                    <motion.div
                      className="w-full h-full"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <Image
                        src={coverUrl}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </motion.div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
                    <motion.div
                      className="p-4 bg-white/80 rounded-full shadow-sm"
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <MapPin className="h-10 w-10 text-teal-500" />
                    </motion.div>
                  </div>
                )}
              </Link>

              {/* Album Info */}
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* Title and Country */}
                <div>
                  <Link href={`/albums/${album.id}`}>
                    <h3 className="text-[17px] font-semibold text-gray-900 line-clamp-1 hover:text-teal-600 transition-colors duration-200">
                      {album.title}
                    </h3>
                  </Link>
                  {country && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {country}
                    </p>
                  )}
                </div>

                {/* User Info and View Button */}
                {user && (
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/profile/${user.username}`}
                      className="flex items-center gap-2 group/user min-w-0 flex-1"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-gray-100 group-hover/user:ring-teal-200 transition-all duration-200 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || user.username} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-xs font-bold">
                          {(user.display_name || user.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600 group-hover/user:text-gray-900 transition-colors duration-200 truncate">
                        <span className="hidden sm:inline">by </span><span className="font-medium">{user.display_name || user.username}</span>
                      </span>
                    </Link>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AlbumFavoriteButton
                        targetId={album.id}
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                      />
                      <Link href={`/albums/${album.id}`}>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            size="sm"
                            className="bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold rounded-lg px-4 sm:px-5 h-9 text-sm shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            View
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
