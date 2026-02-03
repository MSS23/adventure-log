'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { EnhancedLightbox } from '@/components/photos/EnhancedLightbox'
import { Photo } from '@/types/database'
import { CityCluster } from '@/types/globe'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Calendar,
  Camera,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Compass
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// Helper function to get photo source URL
const getPhotoSrc = (filePath: string): string => {
  if (filePath.startsWith('http')) return filePath
  return getPhotoUrl(filePath) || ''
}

interface AlbumImageModalProps {
  isOpen: boolean
  onClose: () => void
  cluster: CityCluster | null
  // Journey progression props (optional)
  showProgressionControls?: boolean
  currentLocationIndex?: number
  totalLocations?: number
  progressionMode?: 'auto' | 'manual'
  onNextLocation?: () => void
  onPreviousLocation?: () => void
  onContinueJourney?: () => void
  canGoNext?: boolean
  canGoPrevious?: boolean
}

// Helper function to convert photo URLs to Photo objects
function createPhotoFromUrl(url: string, index: number, albumId: string): Photo {
  return {
    id: `photo-${albumId}-${index}`,
    file_path: url,
    caption: '',
    album_id: albumId,
    user_id: '',
    processing_status: 'processed',
    order_index: index,
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
}

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 }
  }
}

export function AlbumImageModal({
  isOpen,
  onClose,
  cluster,
  showProgressionControls = false,
  currentLocationIndex = 0,
  totalLocations = 0,
  onNextLocation,
  onPreviousLocation,
  canGoNext = false,
  canGoPrevious = false
}: AlbumImageModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>()
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Smooth scroll to top when cluster changes
  useEffect(() => {
    if (isOpen && cluster) {
      setCurrentPhotoIndex(0)
      requestAnimationFrame(() => {
        const dialogContent = dialogContentRef.current
        if (dialogContent) {
          dialogContent.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          })
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster?.id, isOpen])

  // Convert cluster data to photos array
  const photos = useMemo(() => {
    if (!cluster) return []

    const allPhotos: Photo[] = []

    cluster.cities.forEach((city) => {
      if (city.previewPhotoUrls && city.previewPhotoUrls.length > 0) {
        city.previewPhotoUrls.slice(0, 6).forEach((url, photoIndex) => {
          allPhotos.push(createPhotoFromUrl(url, photoIndex, `${city.id}-preview`))
        })
      } else if (city.favoritePhotoUrls && city.favoritePhotoUrls.length > 0) {
        city.favoritePhotoUrls.slice(0, 6).forEach((url, photoIndex) => {
          allPhotos.push(createPhotoFromUrl(url, photoIndex, `${city.id}-favorites`))
        })
      } else if (city.coverPhotoUrl) {
        allPhotos.push(createPhotoFromUrl(city.coverPhotoUrl, 0, `${city.id}-cover`))
      }
    })

    return allPhotos
  }, [cluster])

  const handlePhotoClick = useCallback((photoId: string) => {
    setSelectedPhotoId(photoId)
    setLightboxOpen(true)
  }, [])

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false)
    setSelectedPhotoId(undefined)
    setTimeout(() => {
      document.body.style.pointerEvents = ''
    }, 100)
  }, [])

  const navigatePhoto = useCallback((direction: 'next' | 'prev') => {
    setCurrentPhotoIndex(prev => {
      if (direction === 'next') return Math.min(prev + 1, photos.length - 1)
      return Math.max(prev - 1, 0)
    })
  }, [photos.length])

  // Keyboard navigation for photos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || lightboxOpen) return

      if (e.key === 'ArrowLeft') {
        setCurrentPhotoIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentPhotoIndex(prev => Math.min(photos.length - 1, prev + 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, lightboxOpen, photos.length])

  if (!cluster) return null

  const isMultiCity = cluster.cities.length > 1
  const primaryCity = cluster.cities[0]
  const currentPhoto = photos[currentPhotoIndex]
  const formattedDate = useMemo(() => {
    return primaryCity?.visitDate
      ? new Date(primaryCity.visitDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      : null
  }, [primaryCity?.visitDate])

  return (
    <>
      <Dialog
        key={cluster?.id}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent
          ref={dialogContentRef}
          className="max-w-2xl max-h-[90vh] w-[95vw] overflow-y-auto p-0 gap-0 bg-white rounded-2xl"
          showCloseButton={true}
        >
          <DialogDescription className="sr-only">
            Photo gallery showing images from {isMultiCity ? `${cluster.cities.length} cities` : primaryCity.name}
          </DialogDescription>

          <motion.div
            variants={prefersReducedMotion ? {} : containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Header with Background Image */}
            <motion.div
              variants={prefersReducedMotion ? {} : itemVariants}
              className="relative h-40 sm:h-52 overflow-hidden rounded-t-2xl"
            >
              {/* Background image with blur effect */}
              {currentPhoto && (
                <Image
                  src={getPhotoSrc(currentPhoto.file_path)}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 95vw, 768px"
                  className="object-cover blur-sm scale-110"
                  priority
                />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />

              {/* Title content */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-5 sm:p-6"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-2.5 sm:p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg shadow-teal-500/30"
                    initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring' as const, delay: 0.3, stiffness: 300, damping: 20 }}
                  >
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 drop-shadow-sm">
                      {isMultiCity
                        ? `${cluster.cities.length} Cities`
                        : primaryCity.name
                      }
                    </h2>
                    {isMultiCity && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        {cluster.cities.map(c => c.name.split(',')[0]).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Content section */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Animated Metadata Badges */}
              <motion.div
                className="flex flex-wrap gap-2"
                variants={prefersReducedMotion ? {} : containerVariants}
              >
                <motion.div
                  variants={prefersReducedMotion ? {} : badgeVariants}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full border border-teal-200/60"
                >
                  <Camera className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-sm font-medium text-teal-700">{cluster.totalPhotos} photos</span>
                </motion.div>

                {!isMultiCity && formattedDate && (
                  <motion.div
                    variants={prefersReducedMotion ? {} : badgeVariants}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-200/60"
                  >
                    <Calendar className="h-3.5 w-3.5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">{formattedDate}</span>
                  </motion.div>
                )}

                {isMultiCity && (
                  <motion.div
                    variants={prefersReducedMotion ? {} : badgeVariants}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-full border border-orange-200/60"
                  >
                    <MapPin className="h-3.5 w-3.5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">{cluster.totalAlbums} albums</span>
                  </motion.div>
                )}
              </motion.div>

              {/* Main Photo Carousel */}
              {photos.length > 0 && (
                <motion.div
                  variants={prefersReducedMotion ? {} : itemVariants}
                  className="space-y-3"
                >
                  {/* Main Photo Display */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 shadow-lg group">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPhotoIndex}
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={prefersReducedMotion ? {} : { opacity: 0, x: -30 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={getPhotoSrc(currentPhoto.file_path)}
                          alt={`Photo ${currentPhotoIndex + 1}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 95vw, 800px"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePhotoClick(currentPhoto.id)
                          }}
                        />

                        {/* Hover overlay with zoom icon */}
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePhotoClick(currentPhoto.id)
                          }}
                        >
                          <motion.button
                            className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
                            whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                          >
                            <ZoomIn className="h-4 w-4 text-gray-700" />
                          </motion.button>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation arrows */}
                    {photos.length > 1 && (
                      <>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigatePhoto('prev')
                          }}
                          disabled={currentPhotoIndex === 0}
                          className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg transition-all",
                            currentPhotoIndex === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-white hover:shadow-xl"
                          )}
                          whileHover={prefersReducedMotion || currentPhotoIndex === 0 ? {} : { scale: 1.1 }}
                          whileTap={prefersReducedMotion || currentPhotoIndex === 0 ? {} : { scale: 0.95 }}
                        >
                          <ChevronLeft className="h-5 w-5 text-gray-700" />
                        </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigatePhoto('next')
                          }}
                          disabled={currentPhotoIndex === photos.length - 1}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg transition-all",
                            currentPhotoIndex === photos.length - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-white hover:shadow-xl"
                          )}
                          whileHover={prefersReducedMotion || currentPhotoIndex === photos.length - 1 ? {} : { scale: 1.1 }}
                          whileTap={prefersReducedMotion || currentPhotoIndex === photos.length - 1 ? {} : { scale: 0.95 }}
                        >
                          <ChevronRight className="h-5 w-5 text-gray-700" />
                        </motion.button>
                      </>
                    )}

                    {/* Photo counter badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium border border-white/20">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </div>

                  {/* Thumbnail strip */}
                  {photos.length > 1 && (
                    <motion.div
                      className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {photos.map((photo, index) => (
                        <motion.button
                          key={photo.id}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={cn(
                            "relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 ring-2 transition-all",
                            index === currentPhotoIndex
                              ? "ring-teal-500 ring-offset-2"
                              : "ring-transparent hover:ring-gray-300"
                          )}
                          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        >
                          <Image
                            src={getPhotoSrc(photo.file_path)}
                            alt={`Thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="56px"
                            quality={60}
                          />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Empty state */}
              {photos.length === 0 && (
                <motion.div
                  variants={prefersReducedMotion ? {} : itemVariants}
                  className="text-center py-8 text-gray-500"
                >
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No photos available for this location</p>
                </motion.div>
              )}

              {/* Album Navigation Timeline */}
              {showProgressionControls && totalLocations > 1 && (
                <motion.div
                  variants={prefersReducedMotion ? {} : itemVariants}
                  className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                      <Compass className="h-4 w-4 text-teal-500" />
                      Your Journey
                    </h4>
                    <span className="text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded-full border">
                      {currentLocationIndex + 1} of {totalLocations}
                    </span>
                  </div>

                  {/* Progress bar with dots */}
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-visible mb-4">
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentLocationIndex + 1) / totalLocations) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    {/* Dots for each location */}
                    {totalLocations <= 10 && Array.from({ length: totalLocations }).map((_, i) => (
                      <motion.div
                        key={i}
                        className={cn(
                          "absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 transition-colors duration-300",
                          i <= currentLocationIndex
                            ? "bg-teal-500 border-teal-500"
                            : "bg-white border-gray-300"
                        )}
                        style={{
                          left: totalLocations === 1 ? '50%' : `${(i / (totalLocations - 1)) * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        initial={prefersReducedMotion ? {} : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 * i }}
                      />
                    ))}
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex gap-2">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onPreviousLocation) onPreviousLocation()
                      }}
                      disabled={!canGoPrevious}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white rounded-lg border border-gray-200 font-medium text-sm transition-colors",
                        canGoPrevious ? "hover:bg-gray-50 text-gray-700" : "opacity-50 cursor-not-allowed text-gray-400"
                      )}
                      whileHover={prefersReducedMotion || !canGoPrevious ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion || !canGoPrevious ? {} : { scale: 0.98 }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onNextLocation) onNextLocation()
                      }}
                      disabled={!canGoNext}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-teal-500 text-white rounded-lg font-medium text-sm transition-colors",
                        canGoNext ? "hover:bg-teal-600" : "opacity-50 cursor-not-allowed"
                      )}
                      whileHover={prefersReducedMotion || !canGoNext ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion || !canGoNext ? {} : { scale: 0.98 }}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* View Full Album CTA */}
              {!isMultiCity && primaryCity && (
                <motion.div
                  variants={prefersReducedMotion ? {} : itemVariants}
                  className="pt-2"
                >
                  <p className="text-xs text-gray-500 text-center mb-3">
                    Showing {photos.length} of {cluster.totalPhotos} photos
                  </p>
                  <Link href={`/albums/${primaryCity.id}`} className="block">
                    <motion.button
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2.5 text-sm"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02, boxShadow: '0 20px 40px -15px rgba(20, 184, 166, 0.4)' }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Full Album
                      <motion.span
                        animate={prefersReducedMotion ? {} : { x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        →
                      </motion.span>
                    </motion.button>
                  </Link>
                </motion.div>
              )}

              {/* Multi-city album links */}
              {isMultiCity && (
                <motion.div
                  variants={prefersReducedMotion ? {} : itemVariants}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium text-gray-700">View individual albums:</p>
                  <div className="flex flex-wrap gap-2">
                    {cluster.cities.map((city) => (
                      <Link key={city.id} href={`/albums/${city.id}`}>
                        <motion.button
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-teal-300 transition-colors"
                          whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                        >
                          {city.name.split(',')[0]}
                        </motion.button>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Lightbox for full photo viewing */}
      <EnhancedLightbox
        photos={photos}
        initialPhotoId={selectedPhotoId}
        isOpen={lightboxOpen}
        onClose={handleLightboxClose}
      />
    </>
  )
}
