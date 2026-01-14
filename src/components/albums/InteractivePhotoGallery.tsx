'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface Photo {
  id: string
  file_path: string
  caption?: string
  taken_at?: string
}

interface InteractivePhotoGalleryProps {
  photos: Photo[]
  albumTitle: string
  className?: string
}

export function InteractivePhotoGallery({
  photos,
  albumTitle,
  className
}: InteractivePhotoGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (!photos || photos.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center h-64 bg-gray-100 rounded-2xl",
        className
      )}>
        <p className="text-gray-500">No photos available</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Main Carousel */}
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {photos.map((photo, index) => {
              const photoUrl = getPhotoUrl(photo.file_path)
              return (
                <motion.div
                  key={photo.id}
                  className="flex-[0_0_100%] min-w-0 relative aspect-[4/3] cursor-pointer"
                  onClick={() => openLightbox(index)}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  {photoUrl && (
                    <Image
                      src={photoUrl}
                      alt={photo.caption || `${albumTitle} - Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 80vw"
                      priority={index === 0}
                    />
                  )}

                  {/* Zoom hint on hover */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
                      <ZoomIn className="h-6 w-6 text-gray-700" />
                    </div>
                  </div>

                  {/* Caption overlay */}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-white text-sm">{photo.caption}</p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <motion.button
              onClick={scrollPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <motion.button
              onClick={scrollNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </>
        )}

        {/* Dot Indicators */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {photos.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  selectedIndex === index
                    ? "bg-white w-6"
                    : "bg-white/50 w-2"
                )}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
          {selectedIndex + 1} / {photos.length}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 3 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {photos.map((photo, index) => {
            const photoUrl = getPhotoUrl(photo.file_path)
            return (
              <motion.button
                key={photo.id}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden transition-all",
                  selectedIndex === index
                    ? "ring-2 ring-teal-500 ring-offset-2"
                    : "opacity-60 hover:opacity-100"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {photoUrl && (
                  <Image
                    src={photoUrl}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            photos={photos}
            albumTitle={albumTitle}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onIndexChange={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Lightbox Component
interface LightboxProps {
  photos: Photo[]
  albumTitle: string
  currentIndex: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

function Lightbox({
  photos,
  albumTitle,
  currentIndex,
  onClose,
  onIndexChange
}: LightboxProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const currentPhoto = photos[currentIndex]
  const photoUrl = getPhotoUrl(currentPhoto?.file_path)

  const handlePrev = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    onIndexChange(currentIndex === 0 ? photos.length - 1 : currentIndex - 1)
  }

  const handleNext = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    onIndexChange((currentIndex + 1) % photos.length)
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (scale === 1) {
      if (info.offset.x > 100) {
        handlePrev()
      } else if (info.offset.x < -100) {
        handleNext()
      } else if (info.offset.y > 100) {
        onClose()
      }
    }
  }

  const toggleZoom = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          setScale(Math.min(scale + 0.5, 3))
          break
        case '-':
          setScale(Math.max(scale - 0.5, 1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, scale])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white">
          <p className="text-sm opacity-80">{currentIndex + 1} of {photos.length}</p>
          {currentPhoto?.caption && (
            <p className="text-sm font-medium mt-1">{currentPhoto.caption}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={toggleZoom}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {scale > 1 ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </motion.button>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Main Image */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
        drag={scale > 1}
        dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          className="relative w-full h-full max-w-6xl max-h-[85vh] mx-auto"
          animate={{ scale }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ x: position.x, y: position.y }}
          onDoubleClick={toggleZoom}
        >
          {photoUrl && (
            <Image
              src={photoUrl}
              alt={currentPhoto?.caption || `${albumTitle} - Photo ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          )}
        </motion.div>
      </motion.div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <motion.button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
          <motion.button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        </>
      )}

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex justify-center gap-2 overflow-x-auto pb-2">
            {photos.map((photo, index) => {
              const thumbUrl = getPhotoUrl(photo.file_path)
              return (
                <motion.button
                  key={photo.id}
                  onClick={() => {
                    setScale(1)
                    setPosition({ x: 0, y: 0 })
                    onIndexChange(index)
                  }}
                  className={cn(
                    "flex-shrink-0 relative w-16 h-12 rounded-lg overflow-hidden transition-all",
                    currentIndex === index
                      ? "ring-2 ring-white"
                      : "opacity-50 hover:opacity-100"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {thumbUrl && (
                    <Image
                      src={thumbUrl}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
