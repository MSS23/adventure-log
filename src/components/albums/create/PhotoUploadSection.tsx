'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Camera, Plus, X, MapPin, Move } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isNativeApp } from '@/lib/capacitor/camera'
import { PhotoUploadArea } from '@/components/albums/PhotoUploadArea'
import { type UploadedPhoto } from '@/components/albums/CoverPhotoSelector'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { transitions } from '@/lib/animations/spring-configs'
import type { LocationData } from '@/lib/utils/locationUtils'

interface PhotoUploadSectionProps {
  photos: UploadedPhoto[]
  selectedCoverIndex: number
  isSubmitting: boolean
  isExtractingLocation: boolean
  locationAutoExtracted: boolean
  albumLocation: LocationData | null
  fileErrors: string[]
  mode: 'quick' | 'full'
  onDrop: (files: File[]) => void
  onTakePhoto: () => void
  onSelectFromGallery: () => void
  onRemovePhoto: (index: number) => void
  onSelectCover: (index: number) => void
  onOpenPositionEditor: () => void
  onClearFileErrors: () => void
}

export function PhotoUploadSection({
  photos,
  selectedCoverIndex,
  isSubmitting,
  isExtractingLocation,
  locationAutoExtracted,
  albumLocation,
  fileErrors,
  mode,
  onDrop,
  onTakePhoto,
  onSelectFromGallery,
  onRemovePhoto,
  onSelectCover,
  onOpenPositionEditor,
  onClearFileErrors,
}: PhotoUploadSectionProps) {
  return (
    <>
      {/* Upload Area */}
      {!isNativeApp() && (
        <PhotoUploadArea
          onFilesSelected={onDrop}
          isUploading={isSubmitting}
        />
      )}

      {/* Mobile Action Buttons */}
      {isNativeApp() && (
        <div className="grid grid-cols-2 gap-3">
          <EnhancedButton
            type="button"
            variant="outline"
            className="h-auto py-5"
            onClick={onTakePhoto}
          >
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6 text-olive-600" />
              <span className="text-sm font-medium">Take Photo</span>
            </div>
          </EnhancedButton>
          <EnhancedButton
            type="button"
            variant="outline"
            className="h-auto py-5"
            onClick={onSelectFromGallery}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-6 w-6 text-olive-600" />
              <span className="text-sm font-medium">Gallery</span>
            </div>
          </EnhancedButton>
        </div>
      )}

      {/* Auto-extract indicator */}
      <AnimatePresence>
        {isExtractingLocation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-olive-50 border border-olive-200 rounded-lg text-sm text-olive-700"
          >
            <div className="h-4 w-4 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
            Extracting location from photo GPS data...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location auto-extracted success */}
      <AnimatePresence>
        {locationAutoExtracted && albumLocation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"
          >
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Location detected: {albumLocation.display_name?.split(',').slice(0, 2).join(',')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Errors */}
      <AnimatePresence>
        {fileErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-olive-50 border border-olive-200 rounded-lg p-3 text-sm"
          >
            <p className="font-medium text-olive-800 mb-1">Some files were rejected:</p>
            <ul className="text-olive-700 text-xs space-y-0.5">
              {fileErrors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {fileErrors.length > 3 && (
                <li>...and {fileErrors.length - 3} more</li>
              )}
            </ul>
            <button
              type="button"
              onClick={onClearFileErrors}
              className="text-olive-600 hover:text-olive-800 text-xs mt-2 underline cursor-pointer transition-all duration-200"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Grid */}
      <AnimatePresence>
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {mode === 'full' && (
              <p className="text-sm text-stone-600 mb-3">
                Tap a photo to select it as your cover image.
              </p>
            )}
            <div className={cn(
              "grid gap-1.5 sm:gap-2",
              "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
            )}>
              {photos.map((photo, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ ...transitions.natural, delay: index * 0.05 }}
                  className={cn(
                    "relative aspect-square group cursor-pointer rounded-xl overflow-hidden transition-all",
                    selectedCoverIndex === index
                      ? "ring-2 ring-olive-500 ring-offset-2"
                      : "hover:opacity-90"
                  )}
                  onClick={() => onSelectCover(index)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Image
                    src={photo.preview}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />

                  {selectedCoverIndex === index && (
                    <>
                      {photos.length > 1 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-1.5 left-1.5 bg-olive-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-lg"
                        >
                          Cover
                        </motion.div>
                      )}
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenPositionEditor()
                        }}
                        className="absolute bottom-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-sm"
                      >
                        <Move className="h-2.5 w-2.5" />
                        Adjust
                      </motion.button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemovePhoto(index)
                    }}
                    className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer active:scale-[0.9]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
