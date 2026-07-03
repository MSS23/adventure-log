'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { EnhancedLightbox } from '@/components/photos/EnhancedLightbox'
import { Photo } from '@/types/database'
import { CityCluster } from '@/types/globe'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Calendar,
  Camera,
  ExternalLink,
  X
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
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

export function AlbumImageModal({
  isOpen,
  onClose,
  cluster,
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

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false)
    setSelectedPhotoId(undefined)
    setTimeout(() => {
      document.body.style.pointerEvents = ''
    }, 100)
  }, [])

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

  return (
    <>
      {/* ── Desktop: compact glance bar ──
          Single row, non-scrollable, ~96px tall. Cover thumbnail + title
          + meta + one CTA + close. Full album lives at /albums/[id]. */}
      <AnimatePresence>
        {!isMobile && isOpen && (
          <motion.div
            key={cluster?.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed bottom-[124px] left-1/2 -translate-x-1/2 z-[90] w-[min(88vw,560px)] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--color-line-warm)',
              boxShadow:
                '0 1px 2px rgba(26,20,14,0.04), 0 18px 48px rgba(26,20,14,0.18)',
            }}
            role="dialog"
            aria-label={`Album preview — ${isMultiCity ? `${cluster.cities.length} cities` : primaryCity.name}`}
          >
            <div className="flex items-center gap-3 p-3 pr-4">
              {/* Cover thumbnail — clickable straight to album */}
              <Link
                href={isMultiCity ? '#' : `/albums/${primaryCity.id}`}
                onClick={(e) => {
                  if (isMultiCity) e.preventDefault()
                }}
                className="relative w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 group"
                style={{ background: 'var(--color-ivory-alt)' }}
              >
                {currentPhoto && getPhotoSrc(currentPhoto.file_path) ? (
                  <Image
                    src={getPhotoSrc(currentPhoto.file_path)}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Camera
                      className="h-6 w-6"
                      style={{ color: 'var(--color-muted-warm)' }}
                    />
                  </div>
                )}
                <div
                  className="absolute top-1.5 left-1.5 flex items-center justify-center w-5 h-5 rounded-full"
                  style={{ background: 'var(--color-coral)' }}
                >
                  <MapPin className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                </div>
              </Link>

              {/* Title + inline meta */}
              <div className="flex-1 min-w-0">
                <p className="al-eyebrow mb-0.5">Location</p>
                <h2
                  className="font-heading text-[17px] font-semibold truncate leading-tight"
                  style={{
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {isMultiCity
                    ? `${cluster.cities.length} places near ${primaryCity.name.split(',')[0]}`
                    : primaryCity.name}
                </h2>
                <div
                  className="flex items-center gap-3 mt-1 font-mono text-[11px] tracking-wide"
                  style={{ color: 'var(--color-muted-warm)' }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {cluster.totalPhotos}
                  </span>
                  {!isMultiCity && formattedDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formattedDate}
                    </span>
                  )}
                  {isMultiCity && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {cluster.totalAlbums} albums
                    </span>
                  )}
                </div>
              </div>

              {/* Primary action */}
              {!isMultiCity ? (
                <Link
                  href={`/albums/${primaryCity.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all hover:-translate-y-0.5 flex-shrink-0"
                  style={{
                    background: 'var(--color-coral)',
                    color: '#fff',
                    boxShadow: '0 6px 18px rgba(226,85,58,0.33)',
                  }}
                >
                  View Album
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span
                  className="font-mono text-[10px] uppercase tracking-wider flex-shrink-0"
                  style={{ color: 'var(--color-muted-warm)' }}
                >
                  Tap a city
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
                style={{ color: 'var(--color-muted-warm)' }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Multi-city: a single horizontal row of city pills (no scroll) */}
            {isMultiCity && (
              <div
                className="flex gap-1.5 px-3 pb-3 overflow-x-auto scrollbar-hide"
                style={{ borderTop: '1px solid var(--color-line-warm)' }}
              >
                {cluster.cities.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/albums/${c.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap mt-2.5 transition-colors"
                    style={{
                      background: 'var(--color-ivory-alt)',
                      color: 'var(--color-ink-soft)',
                      border: '1px solid var(--color-line-warm)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {c.name.split(',')[0]}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile: compact bottom glance card ──
          The desktop popup is gated to !isMobile, so on the PWA / phones a pin
          or cluster tap would open nothing. This mirrors the desktop card's
          data + handlers in a phone-sized layout. Positioned ABSOLUTE within
          the globe container (not fixed) and offset above the thumbnail
          filmstrip using bottom-[100px] — the same proven offset that
          GlobeStatsOverlay uses to sit above the strip. z-[60] keeps it above
          the strip (z-10/z-20) but below full-screen modals/lightbox. */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            key={`m-${cluster?.id}`}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="md:hidden absolute bottom-[96px] left-1/2 -translate-x-1/2 z-[60] w-[88%] max-w-[360px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--color-line-warm)',
              boxShadow:
                '0 1px 2px rgba(26,20,14,0.04), 0 14px 36px rgba(26,20,14,0.20)',
            }}
            role="dialog"
            aria-label={`Album preview — ${isMultiCity ? `${cluster.cities.length} cities` : primaryCity.name}`}
          >
            <div className="flex items-center gap-2 p-2 pr-2.5">
              {/* Cover thumbnail — tap straight to album (single-city) */}
              <Link
                href={isMultiCity ? '#' : `/albums/${primaryCity.id}`}
                onClick={(e) => {
                  if (isMultiCity) e.preventDefault()
                }}
                className="relative w-[46px] h-[46px] rounded-lg overflow-hidden flex-shrink-0"
                style={{ background: 'var(--color-ivory-alt)' }}
              >
                {currentPhoto && getPhotoSrc(currentPhoto.file_path) ? (
                  <Image
                    src={getPhotoSrc(currentPhoto.file_path)}
                    alt=""
                    fill
                    sizes="46px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Camera
                      className="h-4 w-4"
                      style={{ color: 'var(--color-muted-warm)' }}
                    />
                  </div>
                )}
              </Link>

              {/* Title + inline meta */}
              <div className="flex-1 min-w-0">
                <h2
                  className="font-heading text-[14px] font-semibold truncate leading-tight"
                  style={{
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {isMultiCity
                    ? `${cluster.cities.length} places near ${primaryCity.name.split(',')[0]}`
                    : primaryCity.name}
                </h2>
                <div
                  className="flex items-center gap-2 mt-0.5 font-mono text-[10px] tracking-wide"
                  style={{ color: 'var(--color-muted-warm)' }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {cluster.totalPhotos}
                  </span>
                  {!isMultiCity && formattedDate && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{formattedDate}</span>
                    </span>
                  )}
                  {isMultiCity && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {cluster.totalAlbums} albums
                    </span>
                  )}
                </div>
              </div>

              {/* Primary action (single-city) */}
              {!isMultiCity && (
                <Link
                  href={`/albums/${primaryCity.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 whitespace-nowrap active:scale-[0.97] transition-transform"
                  style={{
                    background: 'var(--color-coral)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(226,85,58,0.3)',
                  }}
                >
                  View
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] transition-transform min-w-[36px] min-h-[36px] flex items-center justify-center"
                style={{ color: 'var(--color-muted-warm)' }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Multi-city: a single horizontal row of city pills */}
            {isMultiCity && (
              <div
                className="flex gap-1.5 px-2.5 pb-2.5 pt-2 overflow-x-auto scrollbar-hide"
                style={{ borderTop: '1px solid var(--color-line-warm)' }}
              >
                {cluster.cities.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/albums/${c.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors"
                    style={{
                      background: 'var(--color-ivory-alt)',
                      color: 'var(--color-ink-soft)',
                      border: '1px solid var(--color-line-warm)',
                    }}
                  >
                    <MapPin className="h-2.5 w-2.5" />
                    {c.name.split(',')[0]}
                  </Link>
                ))}
              </div>
            )}
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
