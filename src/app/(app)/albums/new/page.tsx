'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Camera, Plus, X, MapPin, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { type LocationData } from '@/lib/utils/locationUtils'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { Toast } from '@capacitor/toast'
import { CoverPhotoPositionEditor } from '@/components/albums/CoverPhotoPositionEditor'
import { takePhoto, selectFromGallery, isNativeApp } from '@/lib/capacitor/camera'
import { extractPhotoLocation } from '@/lib/utils/exif-extraction'
import { PhotoUploadArea } from '@/components/albums/PhotoUploadArea'
import { type UploadedPhoto } from '@/components/albums/CoverPhotoSelector'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { UserNav } from '@/components/layout/UserNav'
import { useAchievementNotifications } from '@/components/achievements/AchievementProvider'
import { transitions } from '@/lib/animations/spring-configs'

// Modern UI Components
import { FloatingInput, FloatingTextarea } from '@/components/ui/floating-input'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/glass-card'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { YearSeasonSelector, type Season, convertYearSeasonToDateRange } from '@/components/albums/YearSeasonSelector'

// Safety utilities
import { sanitizeText, validateImageFile } from '@/lib/utils/input-validation'

const albumSchema = z.object({
  title: z.string()
    .min(1, 'Album name is required')
    .max(100, 'Album name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  memories: z.string()
    .max(1000, 'Memories must be less than 1000 characters')
    .optional(),
  visibility: z.enum(['private', 'friends', 'public']),
})

type AlbumFormData = z.infer<typeof albumSchema>

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends', label: 'Friends', description: 'Only friends' },
  { value: 'private', label: 'Private', description: 'Only you' },
]

export default function NewAlbumPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { triggerAchievementCheck } = useAchievementNotifications()
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number>(0)
  const [albumLocation, setAlbumLocation] = useState<LocationData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [positionEditorOpen, setPositionEditorOpen] = useState(false)
  const [coverPosition, setCoverPosition] = useState<{
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset?: number
    yOffset?: number
  }>({})
  const [isExtractingLocation, setIsExtractingLocation] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      visibility: 'public'
    }
  })

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        URL.revokeObjectURL(photo.preview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only cleanup on unmount
  }, [])

  const onDrop = (acceptedFiles: File[]) => {
    const validPhotos: UploadedPhoto[] = []
    const errors: string[] = []

    for (const file of acceptedFiles) {
      const validation = validateImageFile(file)
      if (validation.valid) {
        validPhotos.push({
          file,
          preview: URL.createObjectURL(file)
        })
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    }

    if (errors.length > 0) {
      setFileErrors(errors)
      Toast.show({
        text: `${errors.length} file(s) rejected. Check file requirements.`,
        duration: 'long',
        position: 'bottom'
      })
    }

    if (validPhotos.length > 0) {
      setPhotos(prev => [...prev, ...validPhotos])
    }
  }

  const handleTakePhoto = async () => {
    const file = await takePhoto()
    if (file) {
      const validation = validateImageFile(file)
      if (validation.valid) {
        const newPhoto: UploadedPhoto = {
          file,
          preview: URL.createObjectURL(file)
        }
        setPhotos(prev => [...prev, newPhoto])
      } else {
        Toast.show({
          text: validation.error || 'Invalid file',
          duration: 'short',
          position: 'bottom'
        })
      }
    }
  }

  const handleSelectFromGallery = async () => {
    const files = await selectFromGallery({}, true)
    if (files.length > 0) {
      onDrop(files)
    }
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview)
    setPhotos(prev => prev.filter((_, i) => i !== index))
    if (selectedCoverIndex >= photos.length - 1) {
      setSelectedCoverIndex(Math.max(0, photos.length - 2))
    }
  }

  const autoFillLocationFromPhotos = async () => {
    if (photos.length === 0) {
      await Toast.show({
        text: 'Please add photos first to extract location data',
        duration: 'short',
        position: 'bottom'
      })
      return
    }

    setIsExtractingLocation(true)

    try {
      for (const photo of photos) {
        const locationData = await extractPhotoLocation(photo.file)

        if (locationData?.latitude && locationData?.longitude) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${locationData.latitude}&lon=${locationData.longitude}&format=json&addressdetails=1`
          )

          if (response.ok) {
            const geocodeData = await response.json()

            setAlbumLocation({
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              display_name: geocodeData.display_name || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`,
              country_code: geocodeData.address?.country_code?.toUpperCase() || undefined
            })

            await Toast.show({
              text: 'Location auto-filled from photo GPS data!',
              duration: 'long',
              position: 'bottom'
            })

            log.info('Location auto-filled from photo', {
              component: 'NewAlbumPage',
              latitude: locationData.latitude,
              longitude: locationData.longitude
            })

            return
          }
        }
      }

      await Toast.show({
        text: 'No GPS data found in photos. Please select location manually.',
        duration: 'long',
        position: 'bottom'
      })

    } catch (error) {
      log.error('Failed to auto-fill location', {
        component: 'NewAlbumPage',
        error: error instanceof Error ? error.message : String(error)
      })

      await Toast.show({
        text: 'Failed to extract location from photos',
        duration: 'short',
        position: 'bottom'
      })
    } finally {
      setIsExtractingLocation(false)
    }
  }

  const onSubmit = async (data: AlbumFormData) => {
    if (!user) return
    if (!albumLocation) {
      setError('Please select a location')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Sanitize all text inputs
      const sanitizedTitle = sanitizeText(data.title)
      const sanitizedDescription = data.description ? sanitizeText(data.description) : null
      const sanitizedMemories = data.memories ? sanitizeText(data.memories) : null

      // Combine description and memories for storage
      const fullDescription = [sanitizedDescription, sanitizedMemories]
        .filter(Boolean)
        .join('\n\n---\n\n') || null

      // Convert year/season to date range if provided
      let dateStart: string | null = null
      let dateEnd: string | null = null

      if (selectedYear && selectedSeason) {
        const dateRange = convertYearSeasonToDateRange(selectedYear, selectedSeason)
        dateStart = dateRange.start
        dateEnd = dateRange.end
      } else if (selectedYear) {
        // If only year is selected, use the full year
        dateStart = `${selectedYear}-01-01`
        dateEnd = `${selectedYear}-12-31`
      }

      const status = photos.length === 0 ? 'draft' : 'published'

      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: sanitizedTitle,
          description: fullDescription,
          location_name: albumLocation.display_name || null,
          country_code: albumLocation.country_code || null,
          latitude: albumLocation.latitude,
          longitude: albumLocation.longitude,
          visibility: data.visibility || 'public',
          date_start: dateStart,
          date_end: dateEnd,
          show_exact_dates: false,
          status: status,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (albumError) {
        log.error('Album creation failed', {
          component: 'NewAlbumPage',
          error: albumError,
          code: albumError.code,
          message: albumError.message,
          details: albumError.details,
          hint: albumError.hint
        })
        throw new Error(`Failed to create album: ${albumError.message || 'Unknown error'}`)
      }

      // Upload photos if any
      if (photos.length > 0) {
        const uploadedPhotoPaths: string[] = []

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i]
          const fileExt = photo.file.name.split('.').pop()
          const fileName = `${album.id}/${Date.now()}-${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, photo.file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            log.error('Failed to upload photo', { error: uploadError, fileName })
            continue
          }

          uploadedPhotoPaths.push(fileName)

          await supabase.from('photos').insert({
            album_id: album.id,
            user_id: user.id,
            file_path: fileName,
            order_index: i,
            created_at: new Date().toISOString()
          })
        }

        if (uploadedPhotoPaths.length > 0) {
          const coverPhotoIndex = Math.min(selectedCoverIndex, uploadedPhotoPaths.length - 1)
          await supabase
            .from('albums')
            .update({
              cover_photo_url: uploadedPhotoPaths[coverPhotoIndex],
              favorite_photo_urls: uploadedPhotoPaths.slice(0, 3),
              cover_photo_position: coverPosition.position || 'center',
              cover_photo_x_offset: coverPosition.xOffset || 50,
              cover_photo_y_offset: coverPosition.yOffset || 50
            })
            .eq('id', album.id)
        }
      }

      log.info('Album created', {
        component: 'NewAlbumPage',
        albumId: album.id,
        status,
        photoCount: photos.length
      })

      triggerAchievementCheck()

      if (photos.length === 0) {
        await Toast.show({
          text: `Saved to drafts! Add photos to publish your album.`,
          duration: 'long',
          position: 'bottom'
        })
      } else {
        await Toast.show({
          text: `Album "${sanitizedTitle}" created with ${photos.length} photo${photos.length > 1 ? 's' : ''}!`,
          duration: 'long',
          position: 'bottom'
        })
      }

      router.push(`/albums/${album.id}`)
    } catch (err) {
      log.error('Failed to create album', {
        component: 'NewAlbumPage',
        error: err,
        user_id: user?.id,
        location: albumLocation
      })
      const errorMessage = err instanceof Error ? err.message : 'Failed to create album'
      setError(errorMessage)

      await Toast.show({
        text: `Error: ${errorMessage}`,
        duration: 'long',
        position: 'bottom'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl mx-auto">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 hidden sm:block">Adventure Log</span>
          </Link>
          <UserNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.natural}
          className="mb-6 md:mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Create a New Adventure
          </h1>
          <p className="text-gray-500 mt-1">Share your journey with the world</p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

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
                glow="teal"
                className="overflow-visible"
              >
                <GlassCardHeader>
                  <GlassCardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-500" />
                    Photos
                  </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
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
                        onClick={handleTakePhoto}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="h-6 w-6 text-teal-600" />
                          <span className="text-sm font-medium">Take Photo</span>
                        </div>
                      </EnhancedButton>
                      <EnhancedButton
                        type="button"
                        variant="outline"
                        className="h-auto py-5"
                        onClick={handleSelectFromGallery}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Plus className="h-6 w-6 text-teal-600" />
                          <span className="text-sm font-medium">Gallery</span>
                        </div>
                      </EnhancedButton>
                    </div>
                  )}

                  {/* File Errors */}
                  <AnimatePresence>
                    {fileErrors.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"
                      >
                        <p className="font-medium text-amber-800 mb-1">Some files were rejected:</p>
                        <ul className="text-amber-700 text-xs space-y-0.5">
                          {fileErrors.slice(0, 3).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {fileErrors.length > 3 && (
                            <li>...and {fileErrors.length - 3} more</li>
                          )}
                        </ul>
                        <button
                          type="button"
                          onClick={() => setFileErrors([])}
                          className="text-amber-600 hover:text-amber-800 text-xs mt-2 underline"
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
                        <p className="text-sm text-gray-600 mb-3">
                          Tap a photo to select it as your cover image.
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                                  ? "ring-2 ring-teal-500 ring-offset-2"
                                  : "hover:opacity-90"
                              )}
                              onClick={() => setSelectedCoverIndex(index)}
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
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="absolute top-1.5 left-1.5 bg-teal-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-lg"
                                >
                                  Cover
                                </motion.div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removePhoto(index)
                                }}
                                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCardContent>
              </GlassCard>
            </div>

            {/* Right Column - Form Fields */}
            <div className="lg:col-span-3 space-y-6">
              {/* Album Details Section */}
              <GlassCard animate staggerIndex={1} hover="lift" glow="subtle">
                <GlassCardHeader>
                  <GlassCardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-500" />
                    Album Details
                  </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-5">
                  {/* Album Title */}
                  <FloatingInput
                    label="Album Title"
                    {...register('title')}
                    error={errors.title?.message}
                    success={!errors.title && !!watch('title')}
                    helperText="Give your adventure a memorable name"
                  />

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
                    <label className="block text-sm font-medium text-gray-700">Who can see this?</label>
                    <div className="flex flex-wrap gap-2">
                      {visibilityOptions.map((option) => {
                        const isSelected = watch('visibility') === option.value
                        return (
                          <motion.button
                            key={option.value}
                            type="button"
                            onClick={() => setValue('visibility', option.value as 'public' | 'friends' | 'private')}
                            className={cn(
                              'px-4 py-2 rounded-full text-sm font-medium transition-all border-2',
                              isSelected
                                ? 'bg-teal-50 border-teal-500 text-teal-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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
                    <MapPin className="h-5 w-5 text-teal-500" />
                    When & Where
                  </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="space-y-6">
                  {/* Year & Season */}
                  <YearSeasonSelector
                    year={selectedYear}
                    season={selectedSeason}
                    onYearChange={setSelectedYear}
                    onSeasonChange={setSelectedSeason}
                  />

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <LocationSearchInput
                      value={albumLocation}
                      onChange={setAlbumLocation}
                      placeholder="Search for a city or country"
                      label=""
                      required
                      showAutoFillButton={photos.length > 0}
                      onAutoFill={autoFillLocationFromPhotos}
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
                  >
                    Create Album
                  </EnhancedButton>
                )}
              </motion.div>
            </div>
          </div>
        </form>
      </main>

      {/* Cover Photo Position Editor */}
      {positionEditorOpen && photos.length > 0 && (
        <CoverPhotoPositionEditor
          imageUrl={photos[selectedCoverIndex].preview}
          isOpen={positionEditorOpen}
          onClose={() => setPositionEditorOpen(false)}
          onSave={(position) => {
            setCoverPosition(position)
            setPositionEditorOpen(false)
          }}
          currentPosition={coverPosition}
        />
      )}
    </div>
  )
}
