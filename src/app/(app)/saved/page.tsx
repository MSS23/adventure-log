'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Bookmark, Compass, MapPin, Camera, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface SavedAlbum {
  id: string
  title: string
  cover_photo_url: string | null
  location_name: string | null
  user_id: string
  user: {
    username: string
    display_name: string
    avatar_url: string | null
  } | null
  savedAt: string
  photo_count?: number
}

export default function SavedPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const { favorites, loading: favoritesLoading, removeFavorite } = useFavorites({
    targetType: 'album',
    autoFetch: true
  })
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(true)
  const supabase = createClient()

  const isAuthLoading = authLoading || profileLoading

  // Fetch album details for each favorite
  const fetchAlbumDetails = useCallback(async () => {
    if (!favorites || favorites.length === 0) {
      setSavedAlbums([])
      setLoadingAlbums(false)
      return
    }

    try {
      const albumIds = favorites.map(f => f.target_id)
      const { data: albums, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          cover_photo_url,
          location_name,
          user_id,
          users:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .in('id', albumIds)

      if (error) {
        console.error('Error fetching saved albums:', error)
        setLoadingAlbums(false)
        return
      }

      if (albums) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: SavedAlbum[] = albums.map((album: any) => ({
          id: album.id,
          title: album.title,
          cover_photo_url: album.cover_photo_url,
          location_name: album.location_name,
          user_id: album.user_id,
          user: album.users,
          savedAt: favorites.find(f => f.target_id === album.id)?.created_at || ''
        }))

        // Sort by saved date, most recent first
        mapped.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        setSavedAlbums(mapped)
      }
    } catch (err) {
      console.error('Error fetching album details:', err)
    } finally {
      setLoadingAlbums(false)
    }
  }, [favorites, supabase])

  useEffect(() => {
    if (!favoritesLoading) {
      fetchAlbumDetails()
    }
  }, [favoritesLoading, fetchAlbumDetails])

  // Handle removing an album from saved
  const handleRemove = async (albumId: string) => {
    await removeFavorite(albumId, 'album')
    setSavedAlbums(prev => prev.filter(a => a.id !== albumId))
  }

  // Not authenticated and auth is done loading
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-gray-600 mb-4">Please log in to view your saved albums</p>
          <Link href="/login">
            <Button className="bg-purple-500 hover:bg-purple-600 text-white">Log In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Loading state
  if (isAuthLoading || favoritesLoading || loadingAlbums) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your saved albums...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <motion.div
          className="mb-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Bookmark className="h-6 w-6 text-purple-600" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Saved Albums</h1>
                <p className="text-sm text-gray-600">
                  {savedAlbums.length} album{savedAlbums.length !== 1 ? 's' : ''} saved
                </p>
              </div>
            </div>
            <Link href="/explore">
              <Button variant="outline" size="sm" className="gap-2">
                <Compass className="h-4 w-4" />
                Explore
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Empty State */}
        {savedAlbums.length === 0 ? (
          <motion.div
            className={cn(
              "rounded-2xl text-center py-16 px-6",
              "bg-gradient-to-br from-white/95 to-white/80",
              "backdrop-blur-xl border border-white/50",
              "shadow-xl shadow-purple-500/5"
            )}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4"
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
            >
              <Bookmark className="h-10 w-10 text-purple-400" />
            </motion.div>
            <motion.p
              className="text-gray-700 text-lg font-medium mb-2"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              No saved albums yet
            </motion.p>
            <motion.p
              className="text-sm text-gray-500 mb-6 max-w-sm mx-auto"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Discover amazing travel albums from other adventurers and save them here for inspiration
            </motion.p>
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link href="/explore">
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 gap-2">
                    <Compass className="h-4 w-4" />
                    Explore Albums
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          /* Albums Grid */
          <AnimatePresence mode="wait">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              {savedAlbums.map((album) => (
                <motion.div
                  key={album.id}
                  className={cn(
                    "group relative rounded-xl overflow-hidden",
                    "bg-white shadow-md hover:shadow-xl",
                    "transition-all duration-300"
                  )}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={prefersReducedMotion ? {} : { y: -4 }}
                >
                  <Link href={`/albums/${album.id}`}>
                    {/* Album Cover */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {album.cover_photo_url ? (
                        <Image
                          src={getPhotoUrl(album.cover_photo_url) || ''}
                          alt={album.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-300" />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Album Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-purple-600 transition-colors">
                        {album.title}
                      </h3>

                      {album.location_name && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{album.location_name}</span>
                        </div>
                      )}

                      {album.user && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>by {album.user.display_name || album.user.username}</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Remove from Saved Button */}
                  <div className="absolute top-3 right-3 z-10">
                    <motion.button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRemove(album.id)
                      }}
                      className={cn(
                        "p-2 rounded-full",
                        "bg-white/90 backdrop-blur-sm shadow-lg",
                        "hover:bg-red-50 hover:scale-110",
                        "transition-all duration-200"
                      )}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                      title="Remove from saved"
                    >
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
