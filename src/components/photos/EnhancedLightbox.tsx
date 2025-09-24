'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Photo } from '@/types/database'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Share2,
  MapPin,
  Calendar,
  Camera as CameraIcon,
  Info,
  Heart,
  MessageCircle,
  Star,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface EnhancedLightboxProps {
  photos: Photo[]
  initialPhotoId?: string
  isOpen: boolean
  onClose: () => void
  albumId?: string
  isOwner?: boolean
}

export function EnhancedLightbox({
  photos,
  initialPhotoId,
  isOpen,
  onClose,
  albumId,
  isOwner = false
}: EnhancedLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  const imageRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentPhoto = photos[currentIndex]

  // Initialize current index based on initialPhotoId
  useEffect(() => {
    if (initialPhotoId && photos.length > 0) {
      const index = photos.findIndex(photo => photo.id === initialPhotoId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [initialPhotoId, photos])

  // Reset states when photo changes
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
    setImageLoaded(false)
    setImageError(false)
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

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
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          resetZoom()
          break
        case 'i':
        case 'I':
          setShowInfo(!showInfo)
          break
        case 'r':
        case 'R':
          handleRotate()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showInfo, onClose])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5))
  }

  const resetZoom = () => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Mouse/touch pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsPanning(true)
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1) return

    const deltaX = e.clientX - lastPanPoint.x
    const deltaY = e.clientY - lastPanPoint.y

    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))

    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleDownload = async () => {
    if (!currentPhoto.file_path) return

    try {
      const response = await fetch(currentPhoto.file_path)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = currentPhoto.caption || `photo-${currentPhoto.id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const handleShare = async () => {
    if (!currentPhoto.file_path) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentPhoto.caption || 'Photo from Adventure Log',
          url: currentPhoto.file_path
        })
      } catch (error) {
        console.error('Failed to share:', error)
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(currentPhoto.file_path)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!isOpen || !currentPhoto) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={containerRef}
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-0"
      >
        <div className="relative w-full h-full flex">
          {/* Main Image Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {currentIndex + 1} of {photos.length}
                  </Badge>
                  {currentPhoto.caption && (
                    <h3 className="text-lg font-semibold line-clamp-1">
                      {currentPhoto.caption}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-white hover:bg-white/20"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Image Container */}
            <div
              ref={imageRef}
              className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {!imageLoaded && !imageError && (
                <div className="flex items-center justify-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}

              {imageError ? (
                <div className="flex flex-col items-center justify-center text-white">
                  <CameraIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>Failed to load image</p>
                </div>
              ) : (
                <motion.div
                  className="relative"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transformOrigin: 'center'
                  }}
                  animate={{ scale: zoom }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <Image
                    src={currentPhoto.file_path}
                    alt={currentPhoto.caption || 'Photo'}
                    width={800}
                    height={600}
                    className={cn(
                      "max-w-[90vw] max-h-[90vh] object-contain",
                      !imageLoaded && "opacity-0"
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    priority
                  />
                </motion.div>
              )}
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="bg-white/20 text-white min-w-[60px]">
                    {Math.round(zoom * 100)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 5}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetZoom}
                    className="text-white hover:bg-white/20"
                  >
                    Reset
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRotate}
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 ml-4">
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
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Sidebar */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-80 bg-white border-l border-gray-200 overflow-y-auto"
              >
                <div className="p-4 space-y-6">
                  {/* Photo Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CameraIcon className="h-4 w-4" />
                      Photo Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      {currentPhoto.caption && (
                        <div>
                          <span className="font-medium text-gray-700">Caption:</span>
                          <p className="text-gray-600 mt-1">{currentPhoto.caption}</p>
                        </div>
                      )}

                      {(currentPhoto.width || currentPhoto.height) && (
                        <div>
                          <span className="font-medium text-gray-700">Dimensions:</span>
                          <p className="text-gray-600">{currentPhoto.width} × {currentPhoto.height}</p>
                        </div>
                      )}

                      {currentPhoto.file_size && (
                        <div>
                          <span className="font-medium text-gray-700">File Size:</span>
                          <p className="text-gray-600">{formatFileSize(currentPhoto.file_size)}</p>
                        </div>
                      )}

                      <div>
                        <span className="font-medium text-gray-700">Uploaded:</span>
                        <p className="text-gray-600">{formatDate(currentPhoto.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Location Info */}
                  {(currentPhoto.latitude || currentPhoto.longitude || currentPhoto.city || currentPhoto.country) && (
                    <>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </h4>
                        <div className="space-y-2 text-sm">
                          {(currentPhoto.city || currentPhoto.country) && (
                            <p className="text-gray-600">
                              {currentPhoto.city && currentPhoto.country
                                ? `${currentPhoto.city}, ${currentPhoto.country}`
                                : currentPhoto.city || currentPhoto.country}
                            </p>
                          )}
                          {(currentPhoto.latitude && currentPhoto.longitude) && (
                            <div>
                              <p className="text-gray-600">
                                {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
                              </p>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() => {
                                  window.open(
                                    `https://www.google.com/maps?q=${currentPhoto.latitude},${currentPhoto.longitude}`,
                                    '_blank'
                                  )
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View on map
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Date Info */}
                  {currentPhoto.taken_at && (
                    <>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date Taken
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(currentPhoto.taken_at)}
                        </p>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* EXIF Data */}
                  {currentPhoto.exif_data && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Camera Settings</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(currentPhoto.exif_data as Record<string, unknown>).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium text-gray-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-gray-600">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => navigator.clipboard.writeText(currentPhoto.file_path)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Image URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => window.open(currentPhoto.file_path, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}