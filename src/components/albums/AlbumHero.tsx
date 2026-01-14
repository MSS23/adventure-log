'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { MapPin, Calendar, Camera, Globe } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface AlbumHeroProps {
  title: string
  coverPhotoUrl?: string | null
  locationName?: string | null
  dateStart?: string | null
  dateEnd?: string | null
  photoCount?: number
  latitude?: number | null
  longitude?: number | null
  className?: string
}

export function AlbumHero({
  title,
  coverPhotoUrl,
  locationName,
  dateStart,
  dateEnd,
  photoCount = 0,
  className
}: AlbumHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  })

  // Parallax effects
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.3])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  const imageUrl = coverPhotoUrl?.startsWith('http')
    ? coverPhotoUrl
    : getPhotoUrl(coverPhotoUrl)

  const formatDateRange = () => {
    if (!dateStart) return null
    const start = new Date(dateStart)
    const end = dateEnd ? new Date(dateEnd) : null

    if (!end || start.getTime() === end.getTime()) {
      return format(start, 'MMMM d, yyyy')
    }

    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`
      }
      return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`
    }

    return `${format(start, 'MMMM d, yyyy')} - ${format(end, 'MMMM d, yyyy')}`
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden",
        className
      )}
    >
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0"
        style={{ y, scale }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      </motion.div>

      {/* Content Overlay */}
      <motion.div
        className="absolute inset-0 flex items-end"
        style={{ opacity }}
      >
        <div className="w-full p-6 md:p-10 lg:p-16">
          <div className="max-w-4xl mx-auto">
            {/* Glassmorphic Info Card */}
            <motion.div
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 shadow-2xl"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.2
              }}
            >
              {/* Title */}
              <motion.h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {title}
              </motion.h1>

              {/* Meta Info */}
              <motion.div
                className="flex flex-wrap gap-4 md:gap-6 text-white/90"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {locationName && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="text-sm md:text-base font-medium">{locationName}</span>
                  </div>
                )}

                {formatDateRange() && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-sm md:text-base font-medium">{formatDateRange()}</span>
                  </div>
                )}

                {photoCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Camera className="h-4 w-4" />
                    </div>
                    <span className="text-sm md:text-base font-medium">
                      {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                    </span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <motion.div
          className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center pt-2"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-2 bg-white/80 rounded-full"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

// Compact hero variant for smaller displays
export function AlbumHeroCompact({
  title,
  coverPhotoUrl,
  locationName,
  dateStart,
  className
}: AlbumHeroProps) {
  const imageUrl = coverPhotoUrl?.startsWith('http')
    ? coverPhotoUrl
    : getPhotoUrl(coverPhotoUrl)

  return (
    <motion.div
      className={cn(
        "relative w-full h-[40vh] md:h-[50vh] overflow-hidden rounded-2xl",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 80vw"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>

        <motion.div
          className="flex items-center gap-3 text-white/80 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {locationName && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {locationName}
            </span>
          )}
          {dateStart && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(dateStart), 'MMM yyyy')}
            </span>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
