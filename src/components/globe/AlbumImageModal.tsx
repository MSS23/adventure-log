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
  X
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
    created_at: new Date().toISOString()
  }
}

export function AlbumImageModal({ isOpen, onClose, cluster }: AlbumImageModalProps) {
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <div className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={() => handlePhotoClick(photo.id)}
                  >
                    <Image
                      src={photo.file_path}
                      alt={photo.caption || `Photo ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
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

          {/* Actions */}
          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Click on any photo to view in full size
            </div>
            <div className="flex gap-2">
              {!isMultiCity && (
                <Link href={`/albums?location=${encodeURIComponent(primaryCity.name)}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All Albums
                  </Button>
                </Link>
              )}
              <Button onClick={onClose}>Close</Button>
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