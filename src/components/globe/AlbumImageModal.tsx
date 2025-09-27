'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EnhancedLightbox } from '@/components/photos/EnhancedLightbox'
import { Photo } from '@/types/database'
import { CityCluster } from '@/types/globe'
import {
  MapPin,
  Calendar,
  Images,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

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
    created_at: new Date().toISOString()
  }
}

export function AlbumImageModal({
  isOpen,
  onClose,
  cluster,
  showProgressionControls = false,
  currentLocationIndex = 0,
  totalLocations = 0,
  progressionMode = 'auto',
  onNextLocation,
  onPreviousLocation,
  onContinueJourney,
  canGoNext = false,
  canGoPrevious = false
}: AlbumImageModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>()

  // Convert cluster data to photos array
  const photos = useMemo(() => {
    if (!cluster) return []

    const allPhotos: Photo[] = []

    cluster.cities.forEach((city) => {
      // Add favorite photos
      if (city.favoritePhotoUrls && city.favoritePhotoUrls.length > 0) {
        city.favoritePhotoUrls.forEach((url, photoIndex) => {
          allPhotos.push(createPhotoFromUrl(url, photoIndex, `${city.id}-favorites`))
        })
      }

      // Add cover photo if it's not already in favorites
      if (city.coverPhotoUrl &&
          (!city.favoritePhotoUrls || !city.favoritePhotoUrls.includes(city.coverPhotoUrl))) {
        allPhotos.push(createPhotoFromUrl(city.coverPhotoUrl, 0, `${city.id}-cover`))
      }
    })

    return allPhotos
  }, [cluster])

  const handlePhotoClick = (photoId: string) => {
    setSelectedPhotoId(photoId)
    setLightboxOpen(true)
  }

  const handleLightboxClose = () => {
    setLightboxOpen(false)
    setSelectedPhotoId(undefined)
  }

  if (!cluster) return null

  const isMultiCity = cluster.cities.length > 1
  const primaryCity = cluster.cities[0]

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-auto overflow-hidden p-0 gap-0 bg-white dark:bg-gray-900 border-0 shadow-xl rounded-3xl"
        >
          <DialogDescription className="sr-only">
            Photo gallery showing images and details from {cluster.cities.length > 1 ? `${cluster.cities.length} cities in this area` : primaryCity.name}
          </DialogDescription>

          {/* Simplified Header */}
          <div className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    {isMultiCity
                      ? `${cluster.cities.length} Cities`
                      : primaryCity.name
                    }
                  </DialogTitle>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Images className="h-3 w-3" />
                      {photos.length} photos
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {cluster.totalAlbums} albums
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 p-0"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </div>

              {/* City list for multi-city clusters */}
              {isMultiCity && (
                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap gap-2">
                    {cluster.cities.map((city) => (
                      <Badge key={city.id} variant="outline" className="text-xs border-gray-200 dark:border-gray-700">
                        {city.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Photo Grid */}
          <div className="flex-1 overflow-y-auto">
            {photos.length > 0 ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-105"
                      onClick={() => handlePhotoClick(photo.id)}
                    >
                      <Image
                        src={photo.file_path}
                        alt={photo.caption || `Photo ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Photo index indicator */}
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Images className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">No photos yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Photos from this location will appear here once uploaded.</p>
                </div>
              </div>
            )}
          </div>

          {/* Journey Progression Controls */}
          {showProgressionControls && (
            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Journey Navigation</h4>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {currentLocationIndex + 1} of {totalLocations}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((currentLocationIndex + 1) / totalLocations) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreviousLocation}
                    disabled={!canGoPrevious}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="font-medium">Previous</span>
                  </Button>

                  {progressionMode === 'manual' && onContinueJourney && (
                    <Button
                      size="sm"
                      onClick={onContinueJourney}
                      className="w-full sm:w-auto px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200"
                    >
                      Continue Journey
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextLocation}
                    disabled={!canGoNext}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                  >
                    <span className="font-medium">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      progressionMode === 'manual' ? "bg-orange-500" : "bg-green-500"
                    )} />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {progressionMode === 'manual' ? 'Manual' : 'Auto'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="w-4 h-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>Tap any photo to view</span>
                </div>
                <div className="flex gap-2">
                  {!isMultiCity && (
                    <Link href={`/albums?location=${encodeURIComponent(primaryCity.name)}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="transition-all duration-200"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View All
                      </Button>
                    </Link>
                  )}
                  <Button
                    onClick={onClose}
                    size="sm"
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white transition-all duration-200"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
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