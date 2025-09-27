'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Photo } from '@/types/database'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Minimize2,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Native } from '@/lib/utils/native'
import { Platform } from '@/lib/utils/platform'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface EnhancedLightboxProps {
  photos: Photo[]
  initialPhotoId?: string
  isOpen: boolean
  onClose: () => void
}

export function EnhancedLightbox({
  photos,
  initialPhotoId,
  isOpen,
  onClose
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

  // Navigation functions
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

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
  }, [isOpen, showInfo, onClose, goToNext, goToPrevious])

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

    try {
      const shareTitle = currentPhoto.caption || 'Photo from Adventure Log'
      const shareText = `Check out this photo${currentPhoto.caption ? `: ${currentPhoto.caption}` : ''}`

      if (Platform.isCapabilityAvailable('share')) {
        await Native.share({
          title: shareTitle,
          text: shareText,
          url: currentPhoto.file_path
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareText} ${currentPhoto.file_path}`)
        await Native.showToast('Photo link copied to clipboard!')
      }
    } catch (error) {
      console.error('Failed to share photo:', error)
      await Native.showToast('Failed to share photo. Please try again.')
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
        className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 bg-black/98 backdrop-blur-xl border-0 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="relative w-full h-full flex">
          {/* Main Image Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Enhanced Top Controls */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-white/20 backdrop-blur-sm px-3 py-1.5 font-medium">
                    {currentIndex + 1} of {photos.length}
                  </Badge>
                  {currentPhoto.caption && (
                    <h3 className="text-xl font-bold line-clamp-1 text-white drop-shadow-lg">
                      {currentPhoto.caption}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => setShowInfo(!showInfo)}
                    className={cn(
                      "text-white backdrop-blur-sm border border-white/20 transition-all duration-200 h-11 w-11 p-0",
                      showInfo
                        ? "bg-gradient-to-r from-indigo-500/40 to-purple-500/40 hover:from-indigo-500/50 hover:to-purple-500/50"
                        : "hover:bg-white/20"
                    )}
                  >
                    <Info className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-200 h-11 w-11 p-0"
                  >
                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={onClose}
                    className="text-white hover:bg-red-500/30 hover:border-red-400/50 backdrop-blur-sm border border-white/20 transition-all duration-200 h-11 w-11 p-0"
                  >
                    <X className="h-5 w-5" />
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
                <div className="flex flex-col items-center justify-center text-white">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                      <CameraIcon className="h-8 w-8 text-white/70" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400/50 animate-ping"></div>
                  </div>
                  <span className="text-lg font-semibold text-white/90 drop-shadow-lg">Loading image...</span>
                  <span className="text-sm text-white/70 mt-1">Please wait</span>
                </div>
              )}

              {imageError ? (
                <div className="flex flex-col items-center justify-center text-white">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-red-400/20">
                    <CameraIcon className="h-10 w-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Failed to load image</h3>
                  <p className="text-white/70">Please try refreshing or check your connection</p>
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

            {/* Enhanced Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={goToPrevious}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-gradient-to-r hover:from-indigo-500/30 hover:to-purple-500/30 backdrop-blur-sm border border-white/20 transition-all duration-300 h-14 w-14 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <ChevronLeft className="h-7 w-7" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={goToNext}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-gradient-to-r hover:from-indigo-500/30 hover:to-purple-500/30 backdrop-blur-sm border border-white/20 transition-all duration-300 h-14 w-14 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <ChevronRight className="h-7 w-7" />
                </Button>
              </>
            )}

            {/* Enhanced Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.5}
                      className="text-white hover:bg-white/20 h-9 w-9 p-0 disabled:opacity-50"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary" className="bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-white/20 min-w-[70px] font-medium">
                      {Math.round(zoom * 100)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoom >= 5}
                      className="text-white hover:bg-white/20 h-9 w-9 p-0 disabled:opacity-50"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={resetZoom}
                    className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-200 px-4"
                  >
                    <span className="font-medium">Reset</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={handleRotate}
                    className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-200 h-10 w-10 p-0"
                  >
                    <RotateCw className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      className="text-white hover:bg-green-500/30 hover:border-green-400/50 transition-all duration-200 h-9 w-9 p-0 border border-transparent"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="text-white hover:bg-blue-500/30 hover:border-blue-400/50 transition-all duration-200 h-9 w-9 p-0 border border-transparent"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-200 h-9 w-9 p-0 border border-transparent"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-blue-500/30 hover:border-blue-400/50 transition-all duration-200 h-9 w-9 p-0 border border-transparent"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-yellow-500/30 hover:border-yellow-400/50 transition-all duration-200 h-9 w-9 p-0 border border-transparent"
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
                className="w-96 bg-gradient-to-br from-white via-gray-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 border-l-0 shadow-2xl backdrop-blur-sm overflow-y-auto"
              >
                <div className="p-6 space-y-8">
                  {/* Enhanced Photo Details */}
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <CameraIcon className="h-4 w-4 text-white" />
                      </div>
                      Photo Details
                    </h4>
                    <div className="space-y-4 text-sm bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      {currentPhoto.caption && (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <MessageCircle className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            Caption:
                          </span>
                          <p className="text-gray-800 dark:text-gray-200 mt-2 leading-relaxed">{currentPhoto.caption}</p>
                        </div>
                      )}

                      {(currentPhoto.width || currentPhoto.height) && (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Maximize2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            Dimensions:
                          </span>
                          <p className="text-gray-800 dark:text-gray-200 mt-1">{currentPhoto.width} × {currentPhoto.height}</p>
                        </div>
                      )}

                      {currentPhoto.file_size && (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Download className="h-3 w-3 text-green-600 dark:text-green-400" />
                            File Size:
                          </span>
                          <p className="text-gray-800 dark:text-gray-200 mt-1">{formatFileSize(currentPhoto.file_size)}</p>
                        </div>
                      )}

                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          Uploaded:
                        </span>
                        <p className="text-gray-800 dark:text-gray-200 mt-1">{formatDate(currentPhoto.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                  {/* Location Info */}
                  {(currentPhoto.latitude || currentPhoto.longitude || currentPhoto.city || currentPhoto.country) && (
                    <>
                      <div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          Location
                        </h4>
                        <div className="space-y-3 text-sm bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                          {(currentPhoto.city || currentPhoto.country) && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <p className="text-gray-800 dark:text-gray-200 font-medium">
                                {currentPhoto.city && currentPhoto.country
                                  ? `${currentPhoto.city}, ${currentPhoto.country}`
                                  : currentPhoto.city || currentPhoto.country}
                              </p>
                            </div>
                          )}
                          {(currentPhoto.latitude && currentPhoto.longitude) && (
                            <div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <p className="text-gray-800 dark:text-gray-200 font-mono text-xs">
                                  {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-sm"
                                onClick={() => {
                                  window.open(
                                    `https://www.google.com/maps?q=${currentPhoto.latitude},${currentPhoto.longitude}`,
                                    '_blank'
                                  )
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-2" />
                                View on map
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                    </>
                  )}

                  {/* Date Info */}
                  {currentPhoto.taken_at && (
                    <>
                      <div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          Date Taken
                        </h4>
                        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                            {formatDate(currentPhoto.taken_at)}
                          </p>
                        </div>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                    </>
                  )}

                  {/* EXIF Data */}
                  {currentPhoto.exif_data && (
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                          <CameraIcon className="h-4 w-4 text-white" />
                        </div>
                        Camera Settings
                      </h4>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                        <div className="space-y-3 text-sm">
                          {Object.entries(currentPhoto.exif_data as Record<string, unknown>).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Quick Actions */}
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <Star className="h-4 w-4 text-white" />
                      </div>
                      Quick Actions
                    </h4>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-start bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 transition-all duration-200"
                        onClick={() => navigator.clipboard.writeText(currentPhoto.file_path)}
                      >
                        <Copy className="h-4 w-4 mr-3" />
                        Copy Image URL
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-start bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 transition-all duration-200"
                        onClick={() => window.open(currentPhoto.file_path, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-3" />
                        Open in New Tab
                      </Button>
                    </div>
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