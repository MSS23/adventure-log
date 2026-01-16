'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Album } from '@/types/database'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { MapPin, Calendar, ArrowRight, Camera } from 'lucide-react'
import { format } from 'date-fns'

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
  const prefersReducedMotion = useReducedMotion()

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
        <h3 className="text-xl font-bold text-gray-900 mb-6">More from {username}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] bg-gradient-to-br from-gray-200 to-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-200 rounded mt-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (albums.length === 0) {
    return null
  }

  // Animation variants for staggered grid
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    }
  }

  return (
    <div className={cn("mt-12", className)}>
      <motion.h3
        className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"
        initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        More from {username}
      </motion.h3>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        {albums.map((album) => {
          const coverUrl = album.cover_photo_url || album.cover_image_url
          const photoUrl = coverUrl ? getPhotoUrl(coverUrl) : null

          return (
            <motion.div
              key={album.id}
              className="group relative"
              variants={itemVariants}
              whileHover={prefersReducedMotion ? {} : { y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link href={`/albums/${album.id}`} className="block">
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 shadow-md group-hover:shadow-xl transition-shadow duration-500">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={album.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Camera className="h-8 w-8 text-gray-300 mb-2" />
                      <span className="text-gray-400 text-xs">No photo</span>
                    </div>
                  )}

                  {/* Hover overlay with location and date */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      {album.location_name && (
                        <div className="flex items-center gap-1.5 text-sm mb-1">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate font-medium">{album.location_name}</span>
                        </div>
                      )}
                      {album.date_start && (
                        <div className="flex items-center gap-1.5 text-xs text-white/80">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{format(new Date(album.date_start), 'MMM yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                  {/* Subtle top gradient for better title visibility */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Title below image */}
                <div className="mt-3">
                  <h4 className="font-semibold text-gray-900 text-sm truncate group-hover:text-teal-600 transition-colors duration-300">
                    {album.title}
                  </h4>
                  {!album.location_name && album.date_start && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(album.date_start), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {/* See all adventures link */}
      {albums.length >= 4 && (
        <motion.div
          className="mt-8 text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href={`/profile/${userId}`}
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium group/link"
          >
            <span>See all adventures</span>
            <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      )}
    </div>
  )
}
