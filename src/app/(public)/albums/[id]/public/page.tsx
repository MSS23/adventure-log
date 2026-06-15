'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Camera,
  AlertCircle,
  ChevronDown,
  MapPin,
  User
} from 'lucide-react'
import Link from 'next/link'
import type { Album, Photo } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { LikeButton } from '@/components/social/LikeButton'
import { AlbumHero } from '@/components/albums/AlbumHero'
import { InteractivePhotoGallery } from '@/components/albums/InteractivePhotoGallery'
import { AlbumSocialShare } from '@/components/albums/AlbumSocialShare'
import { PrivateAlbumGate } from '@/components/albums/PrivateAlbumGate'
import { ShareButton } from '@/components/albums/ShareButton'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'

interface AlbumOwner {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
}

export default function PublicAlbumPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { follow } = useFollows()
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [owner, setOwner] = useState<AlbumOwner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const supabase = createClient()

  const loadAlbum = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setAccessDenied(false)

      // Fetch album with owner info
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select(`
          *,
          users!albums_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('id', params.id as string)
        .single()

      if (albumError) {
        throw new Error('Album not found')
      }

      const fetchedAlbum = albumData as Album & {
        users?: AlbumOwner
      }

      // Check visibility
      const visibility = fetchedAlbum.visibility || 'public'

      if (visibility === 'private') {
        // Only owner can see private albums
        if (!currentUser || currentUser.id !== fetchedAlbum.user_id) {
          setAccessDenied(true)
          setAlbum(fetchedAlbum)
          setOwner(fetchedAlbum.users || null)
          return
        }
      } else if (visibility === 'friends') {
        // Need to check if user is friends with owner
        if (!currentUser) {
          setAccessDenied(true)
          setAlbum(fetchedAlbum)
          setOwner(fetchedAlbum.users || null)
          return
        }

        if (currentUser.id !== fetchedAlbum.user_id) {
          // Check friendship — only an ACCEPTED follow grants access; a pending
          // request must wait for the owner to approve it.
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', fetchedAlbum.user_id)
            .eq('status', 'accepted')
            .maybeSingle()

          if (!followData) {
            setAccessDenied(true)
            setAlbum(fetchedAlbum)
            setOwner(fetchedAlbum.users || null)
            return
          }
        }
      }

      // Public album or has access
      setAlbum(fetchedAlbum)
      setOwner(fetchedAlbum.users || null)

      // Fetch photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', params.id as string)
        .order('order_index', { ascending: true })

      if (photosError) {
        log.error('Failed to fetch photos', {
          component: 'PublicAlbumPage',
          albumId: params.id as string,
        }, photosError)
      } else {
        setPhotos(photosData || [])
      }
    } catch (err) {
      log.error('Failed to load album', {
        component: 'PublicAlbumPage',
        albumId: params.id as string,
      }, err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load album')
    } finally {
      setLoading(false)
    }
  }, [params.id, supabase, currentUser])

  useEffect(() => {
    loadAlbum()
  }, [loadAlbum])

  // "Request access" to a friends-only album = send a follow request to the
  // owner. If the owner has a public profile the follow is auto-accepted and we
  // reload to reveal the album; if private, it stays pending until they approve.
  const handleRequestAccess = useCallback(async () => {
    if (!currentUser) {
      router.push('/login')
      return
    }
    if (!owner || requesting || requested) return

    setRequesting(true)
    try {
      await follow(owner.id)

      const { data: followRow } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', currentUser.id)
        .eq('following_id', owner.id)
        .maybeSingle()

      if (followRow?.status === 'accepted') {
        toast.success('Access granted — opening the album')
        loadAlbum()
      } else {
        setRequested(true)
        toast.success('Request sent — you’ll get access once they accept')
      }
    } catch (err) {
      log.error('Failed to request album access', {
        component: 'PublicAlbumPage',
        albumId: params.id as string,
      }, err as Error)
      toast.error('Could not send your request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }, [currentUser, owner, requesting, requested, follow, supabase, loadAlbum, router, params.id])

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative w-16 h-16"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Loading adventure...
          </p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error || !album) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full rounded-2xl border border-border bg-card p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground text-center mb-2">
            Album Not Found
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {error || 'This album may have been deleted or doesn\'t exist.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/discover">
              <Button className="cursor-pointer">
                Explore the globe
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Access denied - show private gate
  if (accessDenied) {
    const coverPhotoUrl = album.cover_photo_url || album.cover_image_url || (photos[0]?.file_path ? getPhotoUrl(photos[0].file_path) : null)

    return (
      <PrivateAlbumGate
        albumTitle={album.title}
        coverPhotoUrl={coverPhotoUrl}
        ownerName={owner?.display_name || owner?.username}
        ownerUsername={owner?.username}
        ownerAvatarUrl={owner?.avatar_url}
        visibilityLevel={album.visibility === 'friends' ? 'friends' : 'private'}
        isLoggedIn={!!currentUser}
        requesting={requesting}
        requested={requested}
        onRequestAccess={handleRequestAccess}
      />
    )
  }

  const coverPhotoUrl = album.cover_photo_url || album.cover_image_url || (photos[0]?.file_path ? getPhotoUrl(photos[0].file_path) : null)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <AlbumHero
        title={album.title}
        coverPhotoUrl={coverPhotoUrl}
        coverXOffset={album.cover_photo_x_offset}
        coverYOffset={album.cover_photo_y_offset}
        locationName={album.location_name}
        dateStart={album.date_start}
        dateEnd={album.date_end}
        photoCount={photos.length}
        latitude={album.latitude}
        longitude={album.longitude}
      />

      {/* Floating Explore Button — /discover is the public surface
          (in-app /explore requires auth, so logged-out visitors get bounced). */}
      <Link href="/discover" className="fixed top-4 left-4 z-50">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 border border-white/20 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Explore
          </Button>
        </motion.div>
      </Link>

      {/* Main Content */}
      <div className="relative z-10 -mt-20 md:-mt-32">
        <div className="max-w-6xl mx-auto px-4 pb-20">
          {/* Album Info Card */}
          <motion.div
            className="rounded-2xl border border-border bg-card overflow-hidden mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="p-6 md:p-8">
              {/* Creator Section */}
              {owner && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link href={`/profile/${owner.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 mb-6 transition-colors duration-200 cursor-pointer hover:bg-muted/70">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage
                          src={getAvatarUrl(owner.avatar_url, owner.username)}
                          alt={owner.display_name || owner.username}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {(owner.display_name || owner.username)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Created by</p>
                        <p className="font-heading font-semibold text-foreground">
                          {owner.display_name || owner.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary bg-card px-3 py-1.5 rounded-full">
                        <User className="h-4 w-4" />
                        <span className="font-medium">View Profile</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Description */}
              {album.description && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className={cn(
                    "text-[15px] leading-relaxed text-foreground max-w-prose",
                    !showFullDescription && album.description.length > 200 && "line-clamp-3"
                  )}>
                    {album.description}
                  </p>
                  {album.description.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="cursor-pointer text-primary hover:text-primary/80 text-sm font-medium mt-2 flex items-center gap-1 transition-colors duration-200 py-1 px-2 -ml-2 rounded-lg hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {showFullDescription ? 'Show less' : 'Read more'}
                      <motion.div
                        animate={{ rotate: showFullDescription ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                    </button>
                  )}
                </motion.div>
              )}

              {/* Action Bar */}
              <motion.div
                className="flex flex-wrap items-center gap-3 pt-4 border-t border-border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LikeButton albumId={album.id} />

                <ShareButton
                  albumId={album.id}
                  albumTitle={album.title}
                  shareUrl={currentUrl}
                  variant="icon"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Photo Gallery */}
          {photos.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="rounded-2xl border border-border bg-card overflow-hidden p-4 md:p-6">
                <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Photos
                  <span className="text-sm font-normal text-muted-foreground">
                    ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
                  </span>
                </h2>
                <InteractivePhotoGallery
                  photos={photos}
                  albumTitle={album.title}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">This album doesn&apos;t have any photos yet.</p>
            </motion.div>
          )}

          {/* Social Share Section */}
          <motion.div
            className="mt-8 rounded-2xl border border-border bg-card overflow-hidden p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <AlbumSocialShare
              url={currentUrl}
              title={album.title}
              description={album.description || undefined}
              variant="vertical"
            />
          </motion.div>

          {/* Location Map */}
          {album.latitude && album.longitude && (
            <motion.div
              className="mt-8 rounded-2xl border border-border bg-card overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="p-6">
                <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </h2>
                <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-muted">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${album.longitude - 0.05}%2C${album.latitude - 0.05}%2C${album.longitude + 0.05}%2C${album.latitude + 0.05}&layer=mapnik&marker=${album.latitude}%2C${album.longitude}`}
                    className="w-full h-full border-0"
                    title="Album Location"
                  />
                  {album.location_name && (
                    <motion.div
                      className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-foreground border border-border"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      {album.location_name}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Share Button (Mobile) */}
      <AlbumSocialShare
        url={currentUrl}
        title={album.title}
        description={album.description || undefined}
        variant="floating"
      />
    </div>
  )
}
