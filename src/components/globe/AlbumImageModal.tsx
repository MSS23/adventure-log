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
  X
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// Helper function to get photo source URL
const getPhotoSrc = (filePath: string): string => {
  if (!filePath || !filePath.trim()) return ''
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
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
          if (url && url.trim()) {
            allPhotos.push(createPhotoFromUrl(url, photoIndex, `${city.id}-preview`))
          }
        })
      } else if (city.favoritePhotoUrls && city.favoritePhotoUrls.length > 0) {
        city.favoritePhotoUrls.slice(0, 6).forEach((url, photoIndex) => {
          if (url && url.trim()) {
            allPhotos.push(createPhotoFromUrl(url, photoIndex, `${city.id}-favorites`))
          }
        })
      } else if (city.coverPhotoUrl && city.coverPhotoUrl.trim()) {
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

  // Format date - must be called before early return to follow hooks rules
  const visitDate = cluster?.cities[0]?.visitDate
  const formattedDate = useMemo(() => {
    return visitDate
      ? new Date(visitDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      : null
  }, [visitDate])

  if (!cluster) return null

  const isMultiCity = cluster.cities.length > 1
  const primaryCity = cluster.cities[0]
  const currentPhoto = photos[currentPhotoIndex]

  // ── Shared album content (used by both mobile and desktop) ──
  const albumContent = (
    <>
      {/* Photo */}
      {photos.length > 0 && currentPhoto && (
        <div className="px-3 lg:px-5 pt-2 lg:pt-0">
          <div className="relative aspect-[16/9] lg:aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-lg group">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhotoIndex}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {getPhotoSrc(currentPhoto.file_path) ? (
                  <Image
                    src={getPhotoSrc(currentPhoto.file_path)}
                    alt={`Photo ${currentPhotoIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 800px"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePhotoClick(currentPhoto.id)
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Camera className="h-12 w-12 text-stone-300" />
                  </div>
                )}

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
                    <ZoomIn className="h-4 w-4 text-stone-700" />
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <motion.button
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md",
                    currentPhotoIndex === 0 ? "opacity-30 cursor-default" : "hover:bg-white"
                  )}
                  onClick={(e) => { e.stopPropagation(); navigatePhoto('prev') }}
                  disabled={currentPhotoIndex === 0}
                  whileHover={prefersReducedMotion || currentPhotoIndex === 0 ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion || currentPhotoIndex === 0 ? {} : { scale: 0.9 }}
                >
                  <ChevronLeft className="h-4 w-4 text-stone-700" />
                </motion.button>
                <motion.button
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md",
                    currentPhotoIndex === photos.length - 1 ? "opacity-30 cursor-default" : "hover:bg-white"
                  )}
                  onClick={(e) => { e.stopPropagation(); navigatePhoto('next') }}
                  disabled={currentPhotoIndex === photos.length - 1}
                  whileHover={prefersReducedMotion || currentPhotoIndex === photos.length - 1 ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion || currentPhotoIndex === photos.length - 1 ? {} : { scale: 0.9 }}
                >
                  <ChevronRight className="h-4 w-4 text-stone-700" />
                </motion.button>
              </>
            )}

            {/* Photo counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-full">
                <span className="text-xs text-white font-medium tabular-nums">
                  {currentPhotoIndex + 1} / {photos.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Album CTA */}
      <div className="px-3 lg:px-5 pb-3 lg:pb-5 pt-2">
        {!isMultiCity && primaryCity && (
          <Link href={`/albums/${primaryCity.id}`} className="block">
            <motion.button
              className="w-full py-2.5 bg-olive-600 hover:bg-olive-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <ExternalLink className="h-4 w-4" />
              View Full Album
            </motion.button>
          </Link>
        )}

        {isMultiCity && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">View albums:</p>
            <div className="flex flex-wrap gap-1.5">
              {cluster.cities.map((city) => (
                <Link key={city.id} href={`/albums/${city.id}`}>
                  <button className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                    {city.name.split(',')[0]}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Journey progression controls */}
      {showProgressionControls && totalLocations > 1 && (
        <div className="px-3 lg:px-5 pb-3 border-t border-stone-100 dark:border-stone-800 pt-2">
          <div className="flex items-center justify-between">
            <motion.button
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                canGoPrevious
                  ? "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  : "text-stone-300 dark:text-stone-600 cursor-default"
              )}
              onClick={onPreviousLocation}
              disabled={!canGoPrevious}
              whileTap={prefersReducedMotion || !canGoPrevious ? {} : { scale: 0.98 }}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </motion.button>

            <span className="text-xs text-stone-400 tabular-nums">
              {currentLocationIndex + 1} / {totalLocations}
            </span>

            <motion.button
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                canGoNext
                  ? "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  : "text-stone-300 dark:text-stone-600 cursor-default"
              )}
              onClick={onNextLocation}
              disabled={!canGoNext}
              whileTap={prefersReducedMotion || !canGoNext ? {} : { scale: 0.98 }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ── Mobile: fixed bottom panel (no Dialog) ── */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-[56px] left-0 right-0 z-[100] bg-white dark:bg-[#111] rounded-t-2xl shadow-2xl border-t border-stone-200 dark:border-stone-800 max-h-[35vh] overflow-y-auto"
          >
            {/* Handle + close */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#111] px-3 pt-2 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-olive-600 dark:text-olive-400 shrink-0" />
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                  {isMultiCity
                    ? `${cluster.cities.length} places near ${primaryCity.name.split(',')[0]}`
                    : primaryCity.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {albumContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop: bottom-docked peek card ──
          Centered at the bottom of the viewport, narrow & short so the
          globe + selected pin stay visible above it. Google-Maps/Apple-Maps
          pattern: peek first, open full album for deep dive. */}
      <AnimatePresence>
        {!isMobile && isOpen && (
          <motion.div
            key={cluster?.id}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,760px)] max-h-[42vh] overflow-y-auto rounded-2xl"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--color-line-warm)',
              boxShadow:
                '0 1px 2px rgba(26,20,14,0.04), 0 18px 48px rgba(26,20,14,0.18)',
            }}
            role="dialog"
            aria-label={`Album preview — ${isMultiCity ? `${cluster.cities.length} cities` : primaryCity.name}`}
          >
            <div
              className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3.5"
              style={{
                background: 'var(--card)',
                borderBottom: '1px solid var(--color-line-warm)',
              }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                style={{
                  background: 'var(--color-coral-tint)',
                  color: 'var(--color-coral)',
                }}
              >
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="al-eyebrow mb-0.5">Location</p>
                <h2
                  className="font-heading text-lg font-semibold truncate"
                  style={{
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {isMultiCity
                    ? `${cluster.cities.length} places near ${primaryCity.name.split(',')[0]}`
                    : primaryCity.name}
                </h2>
              </div>

              {/* Metadata chips */}
              <div className="hidden md:flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: 'var(--color-ivory-alt)',
                    color: 'var(--color-ink-soft)',
                    border: '1px solid var(--color-line-warm)',
                  }}
                >
                  <Camera className="h-3 w-3" />
                  {cluster.totalPhotos}
                </span>
                {!isMultiCity && formattedDate && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: 'var(--color-ivory-alt)',
                      color: 'var(--color-ink-soft)',
                      border: '1px solid var(--color-line-warm)',
                    }}
                  >
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                )}
                {isMultiCity && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: 'var(--color-ivory-alt)',
                      color: 'var(--color-ink-soft)',
                      border: '1px solid var(--color-line-warm)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {cluster.totalAlbums}
                  </span>
                )}
              </div>

              {/* Primary CTA — "Open full album" for deep dive */}
              {!isMultiCity && (
                <Link
                  href={`/albums/${primaryCity.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all hover:-translate-y-0.5 flex-shrink-0"
                  style={{
                    background: 'var(--color-coral)',
                    color: '#fff',
                    boxShadow: '0 6px 18px rgba(226,85,58,0.33)',
                  }}
                >
                  Open album
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: 'var(--color-muted-warm)' }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Shared album content (thumbnails strip) */}
            <div className="p-5">{albumContent}</div>
          </motion.div>
        )}
      </AnimatePresence>

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
