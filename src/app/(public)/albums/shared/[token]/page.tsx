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
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative w-20 h-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-0 rounded-full border-4 border-olive-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-olive-500" />
          </motion.div>
          <motion.p
            className="text-white/80 text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Loading adventure...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // Error state with animated icon
  if (error || !share || !album) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertCircle className="h-8 w-8 text-red-400" />
          </motion.div>
          <h3 className="text-xl font-semibold text-white text-center mb-2">
            Cannot Access Album
          </h3>
          <p className="text-stone-400 text-center mb-6">
            {error || 'This share link may have expired or been revoked.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/sign-up">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="cursor-pointer bg-olive-500 hover:bg-olive-600 text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2">
                  Join Adventure Log
                </Button>
              </motion.div>
            </Link>
            <Link href="/discover">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="cursor-pointer border-white/30 text-white hover:bg-white/10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2">
                  Explore the globe
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  const coverPhotoUrl = album.cover_photo_url || album.cover_image_url || (photos[0]?.file_path ? getPhotoUrl(photos[0].file_path) : null)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-white/[0.04]">
      {/* Hero Section */}
      <AlbumHero
        title={album.title}
        coverPhotoUrl={coverPhotoUrl}
        locationName={album.location_name}
        dateStart={album.date_start}
        dateEnd={album.date_end}
        photoCount={photos.length}
        latitude={album.latitude}
        longitude={album.longitude}
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
            className="bg-white dark:bg-[color:var(--card)] rounded-2xl shadow-xl overflow-hidden mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="p-6 md:p-8">
              {/* Shared By Section */}
              {sharedBy && (
                <motion.div
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-olive-50 dark:from-olive-950/20 to-olive-50 dark:to-olive-950/20 rounded-xl mb-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-olive-500/20">
                    <AvatarImage
                      src={getAvatarUrl(sharedBy.avatar_url, sharedBy.username)}
                      alt={sharedBy.display_name || sharedBy.username}
                    />
                    <AvatarFallback className="bg-olive-500 text-white">
                      {(sharedBy.display_name || sharedBy.username)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-stone-600 dark:text-stone-400">Shared by</p>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      {sharedBy.display_name || sharedBy.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-olive-600 bg-white dark:bg-[color:var(--card)] px-3 py-1.5 rounded-full">
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
                    "text-stone-700 dark:text-stone-300 text-lg leading-relaxed max-w-prose",
                    !showFullDescription && album.description.length > 200 && "line-clamp-3"
                  )}>
                    {album.description}
                  </p>
                  {album.description.length > 200 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="cursor-pointer text-olive-600 hover:text-olive-700 text-sm font-medium mt-2 flex items-center gap-1 transition-colors duration-200 py-1 px-2 -ml-2 rounded-lg hover:bg-olive-50 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
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
                className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200 dark:border-white/[0.08]"
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
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" variant="outline" className="cursor-pointer border-olive-300 text-olive-700 hover:bg-olive-50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Photos
                      </Button>
                    </motion.div>
                  </Link>
                )}

                {canEdit && (
                  <Link href={`/albums/${album.id}/edit`}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" variant="outline" className="cursor-pointer transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Album
                      </Button>
                    </motion.div>
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
              <div className="bg-white dark:bg-[color:var(--card)] rounded-2xl shadow-xl overflow-hidden p-4 md:p-6">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-olive-500" />
                  Photos
                  <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
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
              className="bg-white dark:bg-[color:var(--card)] rounded-2xl shadow-xl overflow-hidden p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.div
                className="w-20 h-20 bg-stone-100 dark:bg-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Camera className="h-10 w-10 text-stone-400 dark:text-stone-500" />
              </motion.div>
              <p className="text-stone-600 dark:text-stone-400 text-lg mb-4">This album doesn&apos;t have any photos yet.</p>
              {canContribute && (
                <Link href={`/albums/${album.id}/upload`}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="cursor-pointer bg-olive-500 hover:bg-olive-600 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add the first photo
                    </Button>
                  </motion.div>
                </Link>
              )}
            </motion.div>
          )}

          {/* Social Share Section */}
          <motion.div
            className="mt-8 bg-white dark:bg-[color:var(--card)] rounded-2xl shadow-xl overflow-hidden p-6"
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
              className="mt-8 bg-white dark:bg-[color:var(--card)] rounded-2xl shadow-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-olive-500" />
                  Location
                </h2>
                <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-stone-100 dark:bg-white/[0.06]">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${album.longitude - 0.05}%2C${album.latitude - 0.05}%2C${album.longitude + 0.05}%2C${album.latitude + 0.05}&layer=mapnik&marker=${album.latitude}%2C${album.longitude}`}
                    className="w-full h-full border-0"
                    title="Album Location"
                  />
                  <motion.div
                    className="absolute top-4 left-4 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-stone-700 dark:text-stone-100"
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
            className="mt-8 relative overflow-hidden rounded-2xl shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-olive-800 via-olive-700 to-olive-900" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.3)_0%,_transparent_60%)]" />
            <div className="relative px-6 py-10 md:px-10 md:py-12 text-center">
              <span className="al-eyebrow text-olive-200 mb-3 block">Adventure Log</span>
              <h2 className="al-display text-2xl md:text-3xl text-white mb-3">
                Make your travels unforgettable
              </h2>
              <p className="text-white/85 max-w-md mx-auto leading-relaxed mb-7">
                Create beautiful albums like this one, pin your journeys on an interactive
                globe, and share them with the world — free, forever.
              </p>
              <Link href="/sign-up">
                <Button className="cursor-pointer bg-white text-olive-800 hover:bg-olive-50 font-semibold px-8 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-olive-800">
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
