'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  MapPin,
  Camera,
  AlertCircle,
  Eye,
  Edit,
  Plus,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { getShareByToken } from '@/app/actions/album-sharing'
import type { Album, Photo, AlbumShare } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { LikeButton } from '@/components/social/LikeButton'
import { AlbumHero } from '@/components/albums/AlbumHero'
import { InteractivePhotoGallery } from '@/components/albums/InteractivePhotoGallery'
import { AlbumSocialShare } from '@/components/albums/AlbumSocialShare'
import { ShareButton } from '@/components/albums/ShareButton'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { cn } from '@/lib/utils'

interface SharedByUser {
  username: string
  display_name?: string
  avatar_url?: string
}

export default function SharedAlbumPage() {
  const params = useParams()
  const [share, setShare] = useState<AlbumShare | null>(null)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharedBy, setSharedBy] = useState<SharedByUser | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const supabase = createClient()

  const loadSharedAlbum = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get share by token
      const shareResult = await getShareByToken(params.token as string)

      if (!shareResult.success || !shareResult.data) {
        throw new Error(shareResult.error || 'Share not found')
      }

      const shareData = shareResult.data as AlbumShare & {
        album?: Album
        shared_by?: SharedByUser
      }

      setShare(shareData)
      setAlbum(shareData.album || null)
      setSharedBy(shareData.shared_by || null)

      // Fetch photos
      if (shareData.album?.id) {
        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('album_id', shareData.album.id)
          .order('order_index', { ascending: true })

        if (photosError) {
          log.error('Failed to fetch photos', {
            component: 'SharedAlbumPage',
            albumId: shareData.album.id,
          }, photosError)
        } else {
          setPhotos(photosData || [])
        }
      }
    } catch (err) {
      log.error('Failed to load shared album', {
        component: 'SharedAlbumPage',
        token: params.token,
      }, err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load shared album')
    } finally {
      setLoading(false)
    }
  }, [params.token, supabase])

  useEffect(() => {
    loadSharedAlbum()
  }, [loadSharedAlbum])

  const canContribute = share?.permission_level === 'contribute' || share?.permission_level === 'edit'
  const canEdit = share?.permission_level === 'edit'

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  // Loading state with animated spinner
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

  // Error state with animated icon
  if (error || !share || !album) {
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
            Cannot Access Album
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {error || 'This share link may have expired or been revoked.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/signup">
              <Button className="cursor-pointer">
                Join Adventure Log
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="outline" className="cursor-pointer">
                Explore the globe
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
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
        dateView="fuzzy"
      />

      {/* Floating Explore Button — keeps logged-out visitors inside the
          funnel (the in-app /explore requires auth, so route to /discover). */}
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
              {/* Shared By Section */}
              {sharedBy && (
                <motion.div
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 mb-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage
                      src={getAvatarUrl(sharedBy.avatar_url, sharedBy.username)}
                      alt={sharedBy.display_name || sharedBy.username}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(sharedBy.display_name || sharedBy.username)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Shared by</p>
                    <p className="font-heading font-semibold text-foreground">
                      {sharedBy.display_name || sharedBy.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary bg-card px-3 py-1.5 rounded-full">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">
                      {share.permission_level === 'view' ? 'View Only' :
                       share.permission_level === 'contribute' ? 'Can Contribute' :
                       share.permission_level === 'edit' ? 'Can Edit' : 'View Only'}
                    </span>
                  </div>
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

                <div className="flex-1" />

                {canContribute && (
                  <Link href={`/albums/${album.id}/upload`}>
                    <Button size="sm" variant="outline" className="cursor-pointer">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Photos
                    </Button>
                  </Link>
                )}

                {canEdit && (
                  <Link href={`/albums/${album.id}/edit`}>
                    <Button size="sm" variant="outline" className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Album
                    </Button>
                  </Link>
                )}
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
              <p className="text-sm text-muted-foreground mb-4">This album doesn&apos;t have any photos yet.</p>
              {canContribute && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add the first photo
                  </Button>
                </Link>
              )}
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

          {/* Location Map Mini Preview (if coordinates available) */}
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
                  <motion.div
                    className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-foreground border border-border"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    {album.location_name}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Conversion CTA */}
          <motion.div
            className="mt-8 rounded-2xl border border-border bg-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="px-6 py-10 md:px-10 md:py-12 text-center">
              <span className="al-eyebrow mb-3 block">Adventure Log</span>
              <h2 className="al-display text-2xl md:text-3xl mb-3">
                Make your travels unforgettable
              </h2>
              <p className="text-sm md:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed mb-7">
                Create beautiful albums like this one, pin your journeys on an interactive
                globe, and share them with the world — free, forever.
              </p>
              <Link href="/signup">
                <Button variant="coral" className="cursor-pointer font-semibold px-8">
                  Start your free Adventure Log
                </Button>
              </Link>
            </div>
          </motion.div>
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
