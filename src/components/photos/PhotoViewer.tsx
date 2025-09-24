'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Photo } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Share,
  MapPin,
  Calendar,
  Camera,
  Maximize,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react'
import { PhotoWeatherContext } from '@/components/weather/PhotoWeatherContext'
import { motion, AnimatePresence, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PhotoViewerProps {
  photos: Photo[]
  initialPhotoId?: string
  isOpen: boolean
  onClose: () => void
  onPhotoChange?: (photo: Photo) => void
}

export function PhotoViewer({ photos, initialPhotoId, isOpen, onClose, onPhotoChange }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  // Motion values for smooth animations
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const controls = useAnimation()
  const modalControls = useAnimation()

  // Transform values for gesture interactions
  const constrainedX = useTransform(x, (value) => {
    const maxX = Math.max(0, (scale.get() - 1) * 200)
    return Math.max(-maxX, Math.min(maxX, value))
  })

  const constrainedY = useTransform(y, (value) => {
    const maxY = Math.max(0, (scale.get() - 1) * 150)
    return Math.max(-maxY, Math.min(maxY, value))
  })

  const currentPhoto = photos[currentIndex]

  // Find initial photo index
  useEffect(() => {
    if (initialPhotoId && photos.length > 0) {
      const index = photos.findIndex(photo => photo.id === initialPhotoId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [initialPhotoId, photos])

  // Reset zoom and rotation when photo changes
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setIsLoading(true)
    setImageError(false)
    setRetryCount(0)
    setIsDragging(false)
    setIsPanning(false)

    // Reset motion values
    x.set(0)
    y.set(0)
    scale.set(1)

    if (currentPhoto && onPhotoChange) {
      onPhotoChange(currentPhoto)
    }
  }, [currentIndex, currentPhoto, onPhotoChange, x, y, scale])

  // Navigation functions - defined before useEffect to avoid hoisting issues
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % photos.length)
  }, [photos.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Enhanced zoom functionality with smooth animations
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 0.5, 3)
    setZoom(newZoom)
    scale.set(newZoom)
    controls.start({ scale: newZoom, transition: { duration: 0.3 } })
  }, [zoom, scale, controls])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 0.5, 0.25)
    setZoom(newZoom)
    scale.set(newZoom)
    controls.start({ scale: newZoom, transition: { duration: 0.3 } })
  }, [zoom, scale, controls])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
    setRotation(0)
    scale.set(1)
    x.set(0)
    y.set(0)
    controls.start({
      scale: 1,
      x: 0,
      y: 0,
      rotate: 0,
      transition: { duration: 0.4, ease: "easeInOut" }
    })
  }, [scale, x, y, controls])

  // Gesture handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    setIsPanning(zoom > 1)
  }, [zoom])

  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isPanning) return

    // Update motion values during drag
    x.set(x.get() + info.delta.x)
    y.set(y.get() + info.delta.y)
  }, [isPanning, x, y])

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    if (!isPanning) {
      // Handle swipe navigation when not zoomed
      const swipeThreshold = 50
      const velocityThreshold = 300

      if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
        if (info.offset.x > 0 && photos.length > 1) {
          goToPrevious()
        } else if (info.offset.x < 0 && photos.length > 1) {
          goToNext()
        }
      }
    }

    setIsPanning(false)
  }, [isPanning, photos.length, goToNext, goToPrevious])

  // Double tap to zoom
  const handleDoubleTap = useCallback(() => {
    if (zoom === 1) {
      const newZoom = 2
      setZoom(newZoom)
      scale.set(newZoom)
      controls.start({ scale: newZoom, transition: { duration: 0.3 } })
    } else {
      handleZoomReset()
    }
  }, [zoom, scale, controls, handleZoomReset])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'i':
        case 'I':
          setShowInfo(!showInfo)
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleZoomReset()
          break
        case 'r':
        case 'R':
          setRotation(prev => (prev + 90) % 360)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, onClose, showInfo, goToNext, goToPrevious, handleZoomIn, handleZoomOut, handleZoomReset])

  // Modal animation effects
  useEffect(() => {
    if (isOpen) {
      modalControls.start({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" }
      })
    } else {
      modalControls.start({
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2, ease: "easeIn" }
      })
    }
  }, [isOpen, modalControls])

  // Touch handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > 50
    const isRightSwipe = distanceX < -50
    const isUpSwipe = distanceY > 50
    const isDownSwipe = distanceY < -50

    // Only handle horizontal swipes if they're more significant than vertical
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && photos.length > 1) {
        goToNext()
      } else if (isRightSwipe && photos.length > 1) {
        goToPrevious()
      }
    } else {
      // Handle vertical swipes for info panel or close
      if (isUpSwipe) {
        setShowInfo(true)
      } else if (isDownSwipe) {
        setShowInfo(false)
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setImageError(true)
  }

  const retryImageLoad = () => {
    setIsLoading(true)
    setImageError(false)
    setRetryCount(prev => prev + 1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen || !currentPhoto) return null

  const modalContent = (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={modalControls}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-white">
            <span className="text-sm">
              {currentIndex + 1} of {photos.length}
            </span>
            {currentPhoto.caption && (
              <span className="text-sm font-medium line-clamp-1">
                {currentPhoto.caption}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowInfo(!showInfo)}
            >
              <Camera className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="lg"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 w-12 h-12"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 w-12 h-12"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Image Container */}
      <motion.div
        className="relative max-w-full max-h-full flex items-center justify-center p-16"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        animate={controls}
      >
        {isLoading && !imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-white text-sm opacity-75">Loading photo...</p>
          </div>
        )}

        {imageError ? (
          <div className="flex flex-col items-center justify-center w-96 h-96 bg-gray-800 rounded-lg text-center p-8">
            <Camera className="h-16 w-16 text-gray-700 mb-4" />
            <h3 className="text-white font-medium mb-2">Failed to load photo</h3>
            <p className="text-gray-700 text-sm mb-4">
              {retryCount > 0 ? 'Still having trouble loading this image.' : 'This image could not be displayed.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={retryImageLoad}
              className="text-white border-white hover:bg-white hover:text-black"
            >
              Try Again
            </Button>
          </div>
        ) : currentPhoto.file_path ? (
          <motion.div
            className="relative w-full h-full flex items-center justify-center"
            drag={zoom > 1}
            dragConstraints={{ left: -200, right: 200, top: -150, bottom: 150 }}
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: "grabbing" }}
            style={{
              x: constrainedX,
              y: constrainedY,
            }}
          >
            <motion.div
              className="relative w-full h-full"
              onDoubleClick={handleDoubleTap}
              animate={{
                scale: zoom,
                rotate: rotation,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Image
                key={`${currentPhoto.id}-${retryCount}`}
                src={currentPhoto.file_path}
                alt={currentPhoto.caption || 'Photo'}
                fill
                className={cn(
                  "object-contain select-none",
                  isLoading && "opacity-0",
                  zoom > 1 ? "cursor-grab" : "cursor-pointer",
                  isDragging && "cursor-grabbing"
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
                draggable={false}
                priority
              />
            </motion.div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center w-96 h-96 bg-gray-800 rounded-lg text-center p-8">
            <Camera className="h-16 w-16 text-gray-700 mb-4" />
            <h3 className="text-white font-medium mb-2">No image available</h3>
            <p className="text-gray-700 text-sm">This photo doesn&apos;t have a valid image file.</p>
          </div>
        )}
      </motion.div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 transition-colors"
                onClick={handleZoomOut}
                disabled={zoom <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.span
              className="text-white text-sm w-12 text-center font-medium"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
              key={zoom}
            >
              {Math.round(zoom * 100)}%
            </motion.span>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 transition-colors"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 transition-colors"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
              >
                <motion.div
                  animate={{ rotate: rotation }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <RotateCw className="h-4 w-4" />
                </motion.div>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 transition-colors"
                onClick={handleZoomReset}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Heart className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Share className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Photo Info Panel */}
      {showInfo && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-black/90 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-2">Photo Details</h3>
              {currentPhoto.caption && (
                <p className="text-gray-300 text-sm mb-4">{currentPhoto.caption}</p>
              )}
            </div>

            {/* EXIF Data */}
            {(currentPhoto.taken_at || currentPhoto.camera_make || currentPhoto.camera_model) && (
              <div>
                <h4 className="text-white font-medium mb-3">Camera Info</h4>
                <div className="space-y-2">
                  {currentPhoto.taken_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-700" />
                      <span className="text-gray-300">
                        {formatDate(currentPhoto.taken_at)} at {formatTime(currentPhoto.taken_at)}
                      </span>
                    </div>
                  )}

                  {(currentPhoto.camera_make || currentPhoto.camera_model) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Camera className="h-4 w-4 text-gray-700" />
                      <span className="text-gray-300">
                        {[currentPhoto.camera_make, currentPhoto.camera_model].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}

                  {currentPhoto.iso && (
                    <div className="text-sm text-gray-300">
                      ISO: {currentPhoto.iso}
                    </div>
                  )}

                  {currentPhoto.aperture && (
                    <div className="text-sm text-gray-300">
                      Aperture: f/{currentPhoto.aperture}
                    </div>
                  )}

                  {currentPhoto.shutter_speed && (
                    <div className="text-sm text-gray-300">
                      Shutter: 1/{currentPhoto.shutter_speed}s
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {(currentPhoto.latitude && currentPhoto.longitude) && (
              <div>
                <h4 className="text-white font-medium mb-3">Location</h4>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-700" />
                  <span className="text-gray-300">
                    {currentPhoto.latitude?.toFixed(6)}, {currentPhoto.longitude?.toFixed(6)}
                  </span>
                </div>
                {currentPhoto.location_name && (
                  <p className="text-gray-300 text-sm mt-1">{currentPhoto.location_name}</p>
                )}
              </div>
            )}

            {/* Weather Context */}
            {(currentPhoto.latitude && currentPhoto.longitude && currentPhoto.taken_at) && (
              <div>
                <h4 className="text-white font-medium mb-3">Weather Context</h4>
                <PhotoWeatherContext
                  latitude={currentPhoto.latitude}
                  longitude={currentPhoto.longitude}
                  takenAt={currentPhoto.taken_at}
                  location={currentPhoto.location_name}
                  showInline={true}
                  compact={false}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
                />
              </div>
            )}

            {/* File Info */}
            <div>
              <h4 className="text-white font-medium mb-3">File Info</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>Created: {formatDate(currentPhoto.created_at)}</div>
                {currentPhoto.file_size && (
                  <div>Size: {(currentPhoto.file_size / 1024 / 1024).toFixed(1)} MB</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile swipe hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 md:hidden">
        <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-white text-sm">Swipe to navigate • Tap to close</span>
        </div>
      </div>
    </motion.div>
  )

  // Render to portal for proper z-index layering
  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && modalContent}
    </AnimatePresence>,
    document.body
  )
}