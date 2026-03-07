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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
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
            <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500" />
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
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
          <p className="text-gray-400 text-center mb-6">
            {error || 'This share link may have expired or been revoked.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/explore">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                  Explore Albums
                </Button>
              </motion.div>
            </Link>
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Log In
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
    <div className="min-h-screen bg-gray-50">
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

      {/* Floating Back Button */}
      <Link href="/explore" className="fixed top-4 left-4 z-50">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 border border-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </motion.div>
      </Link>

      {/* Main Content */}
      <div className="relative z-10 -mt-20 md:-mt-32">
        <div className="max-w-6xl mx-auto px-4 pb-20">
          {/* Album Info Card */}
          <motion.div
            className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="p-6 md:p-8">
              {/* Shared By Section */}
              {sharedBy && (
                <motion.div
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl mb-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-teal-500/20">
                    <AvatarImage
                      src={sharedBy.avatar_url ? getPhotoUrl(sharedBy.avatar_url, 'avatars') || undefined : undefined}
                      alt={sharedBy.display_name || sharedBy.username}
                    />
                    <AvatarFallback className="bg-teal-500 text-white">
                      {(sharedBy.display_name || sharedBy.username)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Shared by</p>
                    <p className="font-semibold text-gray-900">
                      {sharedBy.display_name || sharedBy.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-teal-600 bg-white px-3 py-1.5 rounded-full">
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
                    "text-gray-700 text-lg leading-relaxed",
                    !showFullDescription && album.description.length > 200 && "line-clamp-3"
                  )}>
                    {album.description}
                  </p>
                  {album.description.length > 200 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-teal-600 hover:text-teal-700 text-sm font-medium mt-2 flex items-center gap-1"
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
                className="flex flex-wrap items-center gap-3 pt-4 border-t"
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
                      <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Photos
                      </Button>
                    </motion.div>
                  </Link>
                )}

                {canEdit && (
                  <Link href={`/albums/${album.id}/edit`}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" variant="outline">
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
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-4 md:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-teal-500" />
                  Photos
                  <span className="text-sm font-normal text-gray-500">
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
              className="bg-white rounded-2xl shadow-xl overflow-hidden p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.div
                className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Camera className="h-10 w-10 text-gray-400" />
              </motion.div>
              <p className="text-gray-600 text-lg mb-4">This album doesn&apos;t have any photos yet.</p>
              {canContribute && (
                <Link href={`/albums/${album.id}/upload`}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="bg-teal-500 hover:bg-teal-600">
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
            className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden p-6"
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
              className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-teal-500" />
                  Location
                </h2>
                <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gray-100">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${album.longitude - 0.05}%2C${album.latitude - 0.05}%2C${album.longitude + 0.05}%2C${album.latitude + 0.05}&layer=mapnik&marker=${album.latitude}%2C${album.longitude}`}
                    className="w-full h-full border-0"
                    title="Album Location"
                  />
                  <motion.div
                    className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-gray-700"
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
