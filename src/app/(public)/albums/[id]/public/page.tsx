'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
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
import type { Album, Photo, User as UserType } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { LikeButton } from '@/components/social/LikeButton'
import { AlbumHero } from '@/components/albums/AlbumHero'
import { InteractivePhotoGallery } from '@/components/albums/InteractivePhotoGallery'
import { AlbumSocialShare } from '@/components/albums/AlbumSocialShare'
import { PrivateAlbumGate } from '@/components/albums/PrivateAlbumGate'
import { ShareButton } from '@/components/albums/ShareButton'
import { getPhotoUrl } from '@/lib/utils/photo-url'
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
  const { user: currentUser } = useAuth()
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
          // Check friendship
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', fetchedAlbum.user_id)
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  // Loading state
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

  // Error state
  if (error || !album) {
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
            Album Not Found
          </h3>
          <p className="text-gray-400 text-center mb-6">
            {error || 'This album may have been deleted or doesn\'t exist.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/explore">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                  Explore Albums
                </Button>
              </motion.div>
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
        onRequestAccess={() => {
          // TODO: Implement follow/request access functionality
          if (owner) {
            window.location.href = `/profile/${owner.id}`
          }
        }}
      />
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
            Explore
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
              {/* Creator Section */}
              {owner && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link href={`/profile/${owner.id}`}>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl mb-6 hover:from-teal-100 hover:to-cyan-100 transition-colors cursor-pointer">
                      <Avatar className="h-12 w-12 ring-2 ring-teal-500/20">
                        <AvatarImage
                          src={owner.avatar_url ? getPhotoUrl(owner.avatar_url, 'avatars') || undefined : undefined}
                          alt={owner.display_name || owner.username}
                        />
                        <AvatarFallback className="bg-teal-500 text-white">
                          {(owner.display_name || owner.username)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Created by</p>
                        <p className="font-semibold text-gray-900">
                          {owner.display_name || owner.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-teal-600 bg-white px-3 py-1.5 rounded-full">
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
              <p className="text-gray-600 text-lg">This album doesn&apos;t have any photos yet.</p>
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

          {/* Location Map */}
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
                  {album.location_name && (
                    <motion.div
                      className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-gray-700"
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
