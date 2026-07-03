'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { RetryableImage } from '@/components/ui/retryable-image'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    async function fetchPopularAlbums() {
      const supabase = createClient()

      try {
        setIsLoading(true)
        setError(null)

        // Popular journeys is a PUBLIC discovery surface: only show public
        // albums that belong to public accounts. The `!inner` join + filter on
        // `users.privacy_level` makes that explicit at the query level (and is
        // belt-and-suspenders with the albums_public_read RLS policy, which
        // already requires a public owner).
        // Explicit columns + a single cover photo (not the whole photos row
        // set). `select('*')` with an unbounded photos embed made this query
        // heavy enough to hit Supabase's statement timeout; the card only reads
        // id/title/location_name/cover + the first photo's file_path.
        const { data, error: fetchError } = await supabase
          .from('albums')
          .select(`
            id, title, location_name, cover_photo_url, cover_image_url, created_at,
            users!albums_user_id_fkey!inner(id, username, display_name, avatar_url, privacy_level),
            photos(file_path)
          `)
          .eq('visibility', 'public')
          .eq('users.privacy_level', 'public')
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

        // The trimmed projection is a subset of Album; the render path only
        // touches the selected fields (id/title/location_name/cover/photos/user).
        setAlbums((data || []) as unknown as Album[])
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
  }, [limit, retryKey])

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <MapPin className="h-6 w-6" />
        </div>
        <p className="font-heading text-lg font-semibold text-foreground">Oops, something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRetryKey(k => k + 1)}
          className="mt-5"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <MapPin className="h-6 w-6" />
        </div>
        <p className="font-heading text-lg font-semibold text-foreground">No journeys yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Be the first to share your adventure!</p>
        <Button asChild className="mt-5">
          <Link href="/albums/new">Share your first journey</Link>
        </Button>
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
            staggerChildren: 0.06,
            delayChildren: 0.06
          }
        }
      }}
    >
      {albums.map((album, idx) => {
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
              hidden: { opacity: 0, y: 16 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.35 }
              }
            }}
          >
            <div className="rounded-2xl overflow-hidden border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
              {/* Album Cover Image */}
              <Link href={`/albums/${album.id}`} className="block relative aspect-[4/3] overflow-hidden bg-muted">
                {coverUrl ? (
                  <>
                    <RetryableImage
                      src={coverUrl}
                      alt={album.title}
                      fill
                      priority={idx < 3}
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {/* Hover Overlay — scrim for legibility of any caption/affordance */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                )}
              </Link>

              {/* Album Info */}
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* Title and Country */}
                <div>
                  <Link href={`/albums/${album.id}`}>
                    <h3 className="font-heading text-base md:text-lg font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors duration-200">
                      {album.title}
                    </h3>
                  </Link>
                  {country && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
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
                      <Avatar className="h-8 w-8 ring-1 ring-border flex-shrink-0">
                        <AvatarImage src={getAvatarUrl(user.avatar_url, user.username)} alt={user.display_name || user.username} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {getDisplayInitial(user.display_name, user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground group-hover/user:text-foreground transition-colors duration-200 truncate">
                        <span className="hidden sm:inline">by </span><span className="font-medium">{getDisplayName(user.display_name, user.username)}</span>
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
                        <Button size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
