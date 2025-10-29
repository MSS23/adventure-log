'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UploadedPhoto {
  file: File
  preview: string
}

interface CoverPhotoSelectorProps {
  photos: UploadedPhoto[]
  selectedCoverId: number
  onSelectCover: (photoIndex: number) => void
  onRemovePhoto: (photoIndex: number) => void
}

export function CoverPhotoSelector({
  photos,
  selectedCoverId,
  onSelectCover,
  onRemovePhoto
}: CoverPhotoSelectorProps) {
  if (photos.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        Click a photo to select it as your cover image.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div
            key={index}
            className={cn(
              "relative aspect-square group cursor-pointer rounded-lg overflow-hidden transition-all",
              selectedCoverId === index
                ? "ring-4 ring-teal-500 shadow-lg"
                : "hover:ring-2 hover:ring-gray-300"
            )}
            onClick={() => onSelectCover(index)}
          >
            <Image
              src={photo.preview}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover"
            />

            {selectedCoverId === index && (
              <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-md">
                Cover
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemovePhoto(index)
              }}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
