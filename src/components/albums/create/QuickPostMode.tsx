'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, ChevronRight, LocateFixed, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getCurrentLocation } from '@/lib/capacitor/geolocation'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { YearSeasonSelector, type Season } from '@/components/albums/YearSeasonSelector'
import { FloatingTextarea } from '@/components/ui/floating-input'
import { Card, CardContent } from '@/components/ui/card'
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

  const [isLocating, setIsLocating] = useState(false)

  // One-tap GPS: Capacitor geolocation (web + native, permissions/toasts
  // handled inside), reverse-geocode via our proxy, then fill the picked
  // location exactly like a search selection would.
  const handleUseCurrentLocation = async () => {
    if (isLocating) return
    setIsLocating(true)
    try {
      const position = await getCurrentLocation()
      // Permission denied / lookup failure already surfaced a toast inside
      // getCurrentLocation — nothing more to do.
      if (!position) return

      const params = new URLSearchParams({
        reverse: 'true',
        lat: position.latitude.toString(),
        lon: position.longitude.toString(),
      })
      const response = await apiFetch(`/api/geocode?${params.toString()}`)
      const data = response.ok ? await response.json() : null

      onSetAlbumLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        display_name:
          data?.display_name ||
          `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`,
        place_id: data?.place_id ? String(data.place_id) : undefined,
        country_code: data?.address?.country_code?.toUpperCase() || undefined,
      })
      onSetLocationAutoExtracted(false)
    } catch {
      toast.error("Couldn't determine your location. Try searching instead.")
    } finally {
      setIsLocating(false)
    }
  }

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
          <Card>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Where & When */}
          <Card>
            <CardContent className="space-y-5">
              {/* Where — search input + one-tap GPS button */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
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
                    allowCurrentLocation={false}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating || isSubmitting}
                  title="Use current location"
                  aria-label="Use current location"
                  className="mt-7 h-11 w-11 shrink-0"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                </Button>
              </div>

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
                  className="px-3 py-2 rounded-xl bg-muted/50"
                >
                  <p className="text-xs text-muted-foreground mb-0.5">Album title (auto-generated)</p>
                  <p className="text-sm font-medium text-foreground">{suggestedTitle}</p>
                </motion.div>
              )}

              {/* Visibility - inline */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-muted-foreground">Visible to:</span>
                <div className="flex gap-1.5">
                  {visibilityOptions.map((option) => {
                    const isSelected = watchQuick('visibility') === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValueQuick('visibility', option.value as 'public' | 'friends' | 'private')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.natural, delay: 0.2 }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <EnhancedButton
                type="submit"
                variant="default"
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
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-all duration-200 py-2 cursor-pointer hover:translate-x-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Need more options? Switch to Full Album
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Forgiving guidance when Post can't proceed yet */}
            {!isSubmitting && (photos.length === 0 || !albumLocation) && (
              <p className="text-xs text-muted-foreground">
                {photos.length === 0 && !albumLocation
                  ? 'Add at least one photo and a place to post.'
                  : photos.length === 0
                    ? 'Add at least one photo to post.'
                    : 'Add a place to post.'}
              </p>
            )}
          </motion.div>
        </div>
      </form>
    </motion.div>
  )
}
