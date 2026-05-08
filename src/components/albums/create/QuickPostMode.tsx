'use client'

import { motion } from 'framer-motion'
import { Zap, ChevronRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { YearSeasonSelector, type Season } from '@/components/albums/YearSeasonSelector'
import { FloatingTextarea } from '@/components/ui/floating-input'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { transitions } from '@/lib/animations/spring-configs'
import { type LocationData } from '@/lib/utils/locationUtils'
import { type UploadedPhoto } from '@/components/albums/CoverPhotoSelector'
import type { UseFormReturn } from 'react-hook-form'
import type { QuickPostFormData } from '@/app/(app)/albums/new/useAlbumCreation'
import { PhotoUploadSection } from './PhotoUploadSection'

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends', label: 'Friends', description: 'Only friends' },
  { value: 'private', label: 'Private', description: 'Only you' },
]

interface QuickPostModeProps {
  quickForm: UseFormReturn<QuickPostFormData>
  onSubmit: (data: QuickPostFormData) => void
  photos: UploadedPhoto[]
  selectedCoverIndex: number
  albumLocation: LocationData | null
  isSubmitting: boolean
  isExtractingLocation: boolean
  locationAutoExtracted: boolean
  fileErrors: string[]
  suggestedTitle: string
  selectedYear: number | null
  selectedSeason: Season | null
  onSetAlbumLocation: (loc: LocationData | null) => void
  onSetLocationAutoExtracted: (val: boolean) => void
  onAutoFill: () => void
  onYearChange: (year: number | null) => void
  onSeasonChange: (season: Season | null) => void
  onDrop: (files: File[]) => void
  onTakePhoto: () => void
  onSelectFromGallery: () => void
  onRemovePhoto: (index: number) => void
  onSelectCover: (index: number) => void
  onOpenPositionEditor: () => void
  onClearFileErrors: () => void
  onSwitchToFull: () => void
}

export function QuickPostMode({
  quickForm,
  onSubmit,
  photos,
  selectedCoverIndex,
  albumLocation,
  isSubmitting,
  isExtractingLocation,
  locationAutoExtracted,
  fileErrors,
  suggestedTitle,
  selectedYear,
  selectedSeason,
  onSetAlbumLocation,
  onSetLocationAutoExtracted,
  onAutoFill,
  onYearChange,
  onSeasonChange,
  onDrop,
  onTakePhoto,
  onSelectFromGallery,
  onRemovePhoto,
  onSelectCover,
  onOpenPositionEditor,
  onClearFileErrors,
  onSwitchToFull,
}: QuickPostModeProps) {
  const { register: registerQuick, handleSubmit: handleSubmitQuick, formState: { errors: quickErrors }, watch: watchQuick, setValue: setValueQuick } = quickForm

  return (
    <motion.div
      key="quick"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transitions.natural}
    >
      <form onSubmit={handleSubmitQuick(onSubmit)}>
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Photo Upload - compact for quick post */}
          <GlassCard animate staggerIndex={0} hover="lift" glow="subtle">
            <GlassCardContent className="space-y-4 pt-5">
              <PhotoUploadSection
                photos={photos}
                selectedCoverIndex={selectedCoverIndex}
                isSubmitting={isSubmitting}
                isExtractingLocation={isExtractingLocation}
                locationAutoExtracted={locationAutoExtracted}
                albumLocation={albumLocation}
                fileErrors={fileErrors}
                mode="quick"
                onDrop={onDrop}
                onTakePhoto={onTakePhoto}
                onSelectFromGallery={onSelectFromGallery}
                onRemovePhoto={onRemovePhoto}
                onSelectCover={onSelectCover}
                onOpenPositionEditor={onOpenPositionEditor}
                onClearFileErrors={onClearFileErrors}
              />
            </GlassCardContent>
          </GlassCard>

          {/* Where & When */}
          <GlassCard animate staggerIndex={1} hover="lift" glow="subtle">
            <GlassCardContent className="space-y-5 pt-5">
              {/* Where */}
              <LocationSearchInput
                value={albumLocation}
                onChange={(loc) => {
                  onSetAlbumLocation(loc)
                  onSetLocationAutoExtracted(false)
                }}
                placeholder="Where did you go?"
                label="Where"
                required
                showAutoFillButton={photos.length > 0 && !albumLocation}
                onAutoFill={onAutoFill}
                isAutoFilling={isExtractingLocation}
              />

              {/* When */}
              <YearSeasonSelector
                year={selectedYear}
                season={selectedSeason}
                onYearChange={onYearChange}
                onSeasonChange={onSeasonChange}
              />

              {/* Caption */}
              <FloatingTextarea
                label="Caption (optional)"
                {...registerQuick('caption')}
                error={quickErrors.caption?.message}
                maxLength={500}
                helperText="Add a note about this moment"
              />

              {/* Auto-generated title preview */}
              {albumLocation && suggestedTitle && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-3 py-2 bg-olive-50/50 dark:bg-olive-900/20 border border-olive-100 dark:border-olive-800/40 rounded-lg"
                >
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Album title (auto-generated)</p>
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{suggestedTitle}</p>
                </motion.div>
              )}

              {/* Visibility - inline */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-stone-500 dark:text-stone-400">Visible to:</span>
                <div className="flex gap-1.5">
                  {visibilityOptions.map((option) => {
                    const isSelected = watchQuick('visibility') === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValueQuick('visibility', option.value as 'public' | 'friends' | 'private')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none',
                          isSelected
                            ? 'bg-olive-50 dark:bg-olive-900/30 border-olive-400 dark:border-olive-600 text-olive-700 dark:text-olive-300'
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.natural, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <EnhancedButton
              type="submit"
              variant="glow"
              disabled={isSubmitting || !albumLocation || photos.length === 0}
              loading={isSubmitting}
              loadingText="Posting..."
              className="flex-1 sm:flex-none"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Post
            </EnhancedButton>

            <button
              type="button"
              onClick={onSwitchToFull}
              className="flex items-center justify-center gap-1 text-sm text-stone-500 hover:text-olive-600 transition-all duration-200 py-2 cursor-pointer hover:translate-x-0.5"
            >
              Need more options? Switch to Full Album
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  )
}
