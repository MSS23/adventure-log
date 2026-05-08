'use client'

import { motion } from 'framer-motion'
import { FileText, Sparkles, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { YearSeasonSelector, type Season } from '@/components/albums/YearSeasonSelector'
import { FloatingInput, FloatingTextarea } from '@/components/ui/floating-input'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/glass-card'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { transitions } from '@/lib/animations/spring-configs'
import { type LocationData } from '@/lib/utils/locationUtils'
import { type UploadedPhoto } from '@/components/albums/CoverPhotoSelector'
import type { UseFormReturn } from 'react-hook-form'
import type { AlbumFormData } from '@/app/(app)/albums/new/useAlbumCreation'
import { PhotoUploadSection } from './PhotoUploadSection'

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends', label: 'Friends', description: 'Only friends' },
  { value: 'private', label: 'Private', description: 'Only you' },
]

interface AlbumDetailsFormProps {
  fullForm: UseFormReturn<AlbumFormData>
  onSubmit: (data: AlbumFormData) => void
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
}

export function AlbumDetailsForm({
  fullForm,
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
}: AlbumDetailsFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = fullForm
  const currentTitle = watch('title')

  return (
    <motion.div
      key="full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transitions.natural}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left Column - Photo Upload */}
          <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
            <GlassCard
              variant="featured"
              animate
              staggerIndex={0}
              hover="lift"
              glow="subtle"
              className="overflow-visible"
            >
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-olive-500" />
                  Photos
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <PhotoUploadSection
                  photos={photos}
                  selectedCoverIndex={selectedCoverIndex}
                  isSubmitting={isSubmitting}
                  isExtractingLocation={isExtractingLocation}
                  locationAutoExtracted={locationAutoExtracted}
                  albumLocation={albumLocation}
                  fileErrors={fileErrors}
                  mode="full"
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
          </div>

          {/* Right Column - Form Fields */}
          <div className="lg:col-span-3 space-y-6">
            {/* Album Details Section */}
            <GlassCard animate staggerIndex={1} hover="lift" glow="subtle">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-olive-500" />
                  Album Details
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-5">
                {/* Album Title */}
                <FloatingInput
                  label="Album Title"
                  placeholder={suggestedTitle || undefined}
                  {...register('title')}
                  error={errors.title?.message}
                  success={!errors.title && !!watch('title')}
                  helperText={
                    suggestedTitle && !currentTitle
                      ? `Suggestion: "${suggestedTitle}" (leave empty to use)`
                      : "Give your adventure a memorable name"
                  }
                />

                {/* Suggestion chip when location is set but title is empty */}
                {suggestedTitle && !currentTitle && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setValue('title', suggestedTitle)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-olive-50 hover:bg-olive-100 border border-olive-200 rounded-full text-sm text-olive-700 transition-all duration-200 cursor-pointer active:scale-[0.97]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Use &ldquo;{suggestedTitle}&rdquo;
                  </motion.button>
                )}

                {/* Description */}
                <FloatingTextarea
                  label="Description"
                  {...register('description')}
                  error={errors.description?.message}
                  maxLength={500}
                  helperText="A short summary of your adventure"
                />

                {/* Memories & Stories */}
                <FloatingTextarea
                  label="Memories & Stories"
                  {...register('memories')}
                  error={errors.memories?.message}
                  maxLength={1000}
                  helperText="Share your favorite moments, tips, or funny stories"
                />

                {/* Visibility */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700">Who can see this?</label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map((option) => {
                      const isSelected = watch('visibility') === option.value
                      return (
                        <motion.button
                          key={option.value}
                          type="button"
                          onClick={() => setValue('visibility', option.value as 'public' | 'friends' | 'private')}
                          className={cn(
                            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none',
                            isSelected
                              ? 'bg-olive-50 border-olive-500 text-olive-700'
                              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {option.label}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* When & Where Section */}
            <GlassCard animate staggerIndex={2} hover="lift" glow="subtle">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-olive-500" />
                  When & Where
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                {/* Year & Season */}
                <YearSeasonSelector
                  year={selectedYear}
                  season={selectedSeason}
                  onYearChange={onYearChange}
                  onSeasonChange={onSeasonChange}
                />

                {/* Location */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700">Location</label>
                  <LocationSearchInput
                    value={albumLocation}
                    onChange={(loc) => {
                      onSetAlbumLocation(loc)
                      onSetLocationAutoExtracted(false)
                    }}
                    placeholder="Search for a city or country"
                    label=""
                    required
                    showAutoFillButton={photos.length > 0}
                    onAutoFill={onAutoFill}
                    isAutoFilling={isExtractingLocation}
                  />
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.natural, delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-2"
            >
              <EnhancedButton
                type="submit"
                variant="outline"
                disabled={isSubmitting || !albumLocation}
                loading={isSubmitting && photos.length === 0}
                loadingText="Saving..."
                className="order-2 sm:order-1"
                onClick={() => {
                  if (!currentTitle && suggestedTitle) {
                    setValue('title', suggestedTitle)
                  }
                }}
              >
                Save Draft
              </EnhancedButton>

              {photos.length > 0 && (
                <EnhancedButton
                  type="submit"
                  variant="glow"
                  disabled={isSubmitting || !albumLocation}
                  loading={isSubmitting}
                  loadingText="Creating..."
                  className="order-1 sm:order-2"
                  onClick={() => {
                    if (!currentTitle && suggestedTitle) {
                      setValue('title', suggestedTitle)
                    }
                  }}
                >
                  Create Album
                </EnhancedButton>
              )}
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
