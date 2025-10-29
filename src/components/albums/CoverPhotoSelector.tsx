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
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="text-sm text-gray-600 mb-4">
        Click a photo to select it as your cover image.
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className={cn(
              "relative w-24 h-24 flex-shrink-0 group cursor-pointer rounded-lg overflow-hidden transition-all border-2",
              selectedCoverId === index
                ? "border-teal-500 ring-2 ring-teal-200"
                : "border-gray-200 hover:border-gray-300"
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
              <div className="absolute top-1 left-1 bg-teal-500 text-white text-xs px-2 py-0.5 rounded">
                Cover
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemovePhoto(index)
              }}
              className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
