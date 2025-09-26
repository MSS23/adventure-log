'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
          className="max-w-4xl max-h-[95vh] w-[95vw] sm:w-auto overflow-y-auto p-4 sm:p-6"
          aria-describedby="album-modal-description"
        >
          <div id="album-modal-description" className="sr-only">
            Photo gallery showing images and details from {cluster.cities.length > 1 ? `${cluster.cities.length} cities in this area` : primaryCity.name}
          </div>

          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {isMultiCity
                  ? `${cluster.cities.length} Cities in this Area`
                  : primaryCity.name
                }
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Images className="h-4 w-4" />
                <span>{photos.length} photos</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{cluster.totalAlbums} albums</Badge>
              </div>
              {!isMultiCity && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(primaryCity.visitDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* City list for multi-city clusters */}
            {isMultiCity && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Cities in this area:</h4>
                <div className="flex flex-wrap gap-2">
                  {cluster.cities.map((city) => (
                    <Badge key={city.id} variant="outline" className="text-xs">
                      {city.name} ({city.albumCount} albums)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Photo Grid */}
          {photos.length > 0 ? (
            <div className="mt-4 sm:mt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group active:scale-95 hover:ring-2 hover:ring-blue-500 transition-all touch-manipulation"
                    onClick={() => handlePhotoClick(photo.id)}
                  >
                    <Image
                      src={photo.file_path}
                      alt={photo.caption || `Photo ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/30 transition-colors" />

                    {/* Touch indicator for mobile */}
                    <div className="absolute bottom-2 right-2 sm:hidden">
                      <div className="bg-black/50 rounded-full p-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center py-8 text-gray-500">
              <Images className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No photos available for this location</p>
            </div>
          )}

          {/* Journey Progression Controls */}
          {showProgressionControls && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  🧭 Journey Controls
                </h4>
                <div className="text-xs text-gray-600">
                  {currentLocationIndex + 1} of {totalLocations}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={onPreviousLocation}
                  disabled={!canGoPrevious}
                  className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous Location</span>
                  <span className="sm:hidden">Previous</span>
                </Button>

                {progressionMode === 'manual' && onContinueJourney && (
                  <Button
                    size="default"
                    onClick={onContinueJourney}
                    className="w-full sm:w-auto min-h-11 bg-green-600 hover:bg-green-700 text-white touch-manipulation"
                  >
                    ▶ Continue Journey
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="default"
                  onClick={onNextLocation}
                  disabled={!canGoNext}
                  className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 touch-manipulation"
                >
                  <span className="hidden sm:inline">Next Location</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 text-xs text-center text-gray-600">
                <div className="mb-1">
                  {progressionMode === 'manual' ? '🎮 Manual Mode' : '🔄 Auto Mode'}
                </div>
                <div className="hidden sm:block">
                  {progressionMode === 'manual'
                    ? 'Use the controls above to navigate through your journey at your own pace'
                    : 'Journey will continue automatically after viewing this album'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 sm:mt-6 pt-4 border-t">
            <div className="text-sm text-gray-500 text-center sm:text-left mb-3 sm:mb-0">
              <span className="hidden sm:inline">Click on any photo to view in full size</span>
              <span className="sm:hidden">Tap photos to view full size</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
              {!isMultiCity && (
                <Link href={`/albums?location=${encodeURIComponent(primaryCity.name)}`} className="w-full sm:w-auto">
                  <Button variant="outline" size="default" className="w-full sm:w-auto min-h-11 touch-manipulation">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All Albums
                  </Button>
                </Link>
              )}
              <Button onClick={onClose} size="default" className="w-full sm:w-auto min-h-11 touch-manipulation">
                Close
              </Button>
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