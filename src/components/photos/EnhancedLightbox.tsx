'use client'

import { Photo } from '@/types/database'
import { PhotoViewer } from './PhotoViewer'

interface EnhancedLightboxProps {
  photos: Photo[]
  initialPhotoId?: string
  isOpen: boolean
  onClose: () => void
}

export function EnhancedLightbox({ photos, initialPhotoId, isOpen, onClose }: EnhancedLightboxProps) {
  return (
    <PhotoViewer
      photos={photos}
      initialPhotoId={initialPhotoId}
      isOpen={isOpen}
      onClose={onClose}
    />
  )
}
