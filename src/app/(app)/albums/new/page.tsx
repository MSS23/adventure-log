'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Camera, Plus, X, MapPin, FileText, Sparkles, Zap, BookOpen, ChevronRight, Images, Move } from 'lucide-react'
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

const quickPostSchema = z.object({
  caption: z.string()
    .max(500, 'Caption must be less than 500 characters')
    .optional(),
  visibility: z.enum(['private', 'friends', 'public']),
})

type AlbumFormData = z.infer<typeof albumSchema>
type QuickPostFormData = z.infer<typeof quickPostSchema>

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends', label: 'Friends', description: 'Only friends' },
  { value: 'private', label: 'Private', description: 'Only you' },
]

/**
 * Generate a title suggestion from location + current date.
 * e.g. "Paris, March 2026"
 */
function generateTitleFromLocation(location: LocationData): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year = now.getFullYear()

  // Extract a short location name (city or first part of display_name)
  let shortLocation = location.display_name || ''
  // If it's a long display_name like "Paris, Île-de-France, France", take the first part
  if (shortLocation.includes(',')) {
    shortLocation = shortLocation.split(',')[0].trim()
  }

  if (shortLocation) {
    return `${shortLocation}, ${month} ${year}`
  }
  return `Adventure, ${month} ${year}`
}

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
  const [mode, setMode] = useState<'quick' | 'full'>('quick')
  const [suggestedTitle, setSuggestedTitle] = useState<string>('')
  const [locationAutoExtracted, setLocationAutoExtracted] = useState(false)
  const autoExtractAttemptedRef = useRef(false)
  const supabase = createClient()

  // Full album form
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

  // Quick post form
  const {
    register: registerQuick,
    handleSubmit: handleSubmitQuick,
    formState: { errors: quickErrors },
    watch: watchQuick,
    setValue: setValueQuick,
  } = useForm<QuickPostFormData>({
    resolver: zodResolver(quickPostSchema),
    defaultValues: {
      visibility: 'public'
    }
  })

  // Update suggested title when location or date changes
  useEffect(() => {
    if (albumLocation) {
      let shortLocation = albumLocation.display_name || ''
      if (shortLocation.includes(',')) {
        shortLocation = shortLocation.split(',')[0].trim()
      }

      // Build date label from year/season or fallback to current date
      let dateLabel: string
      if (selectedYear && selectedSeason) {
        const seasonName = selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)
        dateLabel = `${seasonName} ${selectedYear}`
      } else if (selectedYear) {
        dateLabel = `${selectedYear}`
      } else {
        const now = new Date()
        dateLabel = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`
      }

      setSuggestedTitle(shortLocation ? `${shortLocation}, ${dateLabel}` : `Adventure, ${dateLabel}`)
    } else {
      setSuggestedTitle('')
    }
  }, [albumLocation, selectedYear, selectedSeason])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        URL.revokeObjectURL(photo.preview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only cleanup on unmount
  }, [])

  // Auto-extract GPS from photos when new photos are added
  const autoExtractLocationFromPhotos = useCallback(async (newPhotos: UploadedPhoto[]) => {
    // Don't auto-extract if location is already set
    if (albumLocation) return
    if (newPhotos.length === 0) return

    setIsExtractingLocation(true)
    setLocationAutoExtracted(false)

    try {
      for (const photo of newPhotos) {
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

            setLocationAutoExtracted(true)

            await Toast.show({
              text: 'Location auto-filled from photo GPS data!',
              duration: 'long',
              position: 'bottom'
            })

            log.info('Location auto-extracted from photo on upload', {
              component: 'NewAlbumPage',
              latitude: locationData.latitude,
              longitude: locationData.longitude
            })

            return
          }
        }
      }
    } catch (error) {
      log.error('Failed to auto-extract location from photos', {
        component: 'NewAlbumPage',
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsExtractingLocation(false)
    }
  }, [albumLocation])

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
      // Auto-extract GPS location from the newly added photos
      if (!albumLocation && !autoExtractAttemptedRef.current) {
        autoExtractAttemptedRef.current = true
        autoExtractLocationFromPhotos(validPhotos)
      }
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
        // Auto-extract GPS for camera photos too
        if (!albumLocation && !autoExtractAttemptedRef.current) {
          autoExtractAttemptedRef.current = true
          autoExtractLocationFromPhotos([newPhoto])
        }
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

  // Manual fallback for auto-fill location
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

  // Shared submission logic for both modes
  const submitAlbum = async (opts: {
    title: string
    description: string | null
    visibility: string
    dateStart: string | null
    dateEnd: string | null
  }) => {
    if (!user) return
    if (!albumLocation) {
      setError('Please select a location')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const status = photos.length === 0 ? 'draft' : 'published'

      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: opts.title,
          description: opts.description,
          location_name: albumLocation.display_name || null,
          country_code: albumLocation.country_code || null,
          latitude: albumLocation.latitude,
          longitude: albumLocation.longitude,
          visibility: opts.visibility || 'public',
          date_start: opts.dateStart,
          date_end: opts.dateEnd,
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
        photoCount: photos.length,
        mode
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
          text: mode === 'quick'
            ? `Posted! Your adventure is now live.`
            : `Album "${opts.title}" created with ${photos.length} photo${photos.length > 1 ? 's' : ''}!`,
          duration: 'long',
          position: 'bottom'
        })
      }

      router.push(`/albums/${album.id}?created=true`)
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

  // Full album submit handler
  const onSubmitFull = async (data: AlbumFormData) => {
    const sanitizedTitle = sanitizeText(data.title)
    const sanitizedDescription = data.description ? sanitizeText(data.description) : null
    const sanitizedMemories = data.memories ? sanitizeText(data.memories) : null

    const fullDescription = [sanitizedDescription, sanitizedMemories]
      .filter(Boolean)
      .join('\n\n---\n\n') || null

    let dateStart: string | null = null
    let dateEnd: string | null = null

    if (selectedYear && selectedSeason) {
      const dateRange = convertYearSeasonToDateRange(selectedYear, selectedSeason)
      dateStart = dateRange.start
      dateEnd = dateRange.end
    } else if (selectedYear) {
      dateStart = `${selectedYear}-01-01`
      dateEnd = `${selectedYear}-12-31`
    }

    await submitAlbum({
      title: sanitizedTitle,
      description: fullDescription,
      visibility: data.visibility,
      dateStart,
      dateEnd,
    })
  }

  // Quick post submit handler
  const onSubmitQuick = async (data: QuickPostFormData) => {
    if (photos.length === 0) {
      setError('Please add at least one photo')
      return
    }

    const title = sanitizeText(suggestedTitle || generateTitleFromLocation(albumLocation!))
    const caption = data.caption ? sanitizeText(data.caption) : null

    // Use same date logic as full album
    let dateStart: string | null = null
    let dateEnd: string | null = null

    if (selectedYear && selectedSeason) {
      const dateRange = convertYearSeasonToDateRange(selectedYear, selectedSeason)
      dateStart = dateRange.start
      dateEnd = dateRange.end
    } else if (selectedYear) {
      dateStart = `${selectedYear}-01-01`
      dateEnd = `${selectedYear}-12-31`
    } else {
      // Fallback to current date
      const now = new Date().toISOString().split('T')[0]
      dateStart = now
      dateEnd = now
    }

    await submitAlbum({
      title,
      description: caption,
      visibility: data.visibility,
      dateStart,
      dateEnd,
    })
  }

  const currentTitle = watch('title')

  // Photo grid component (shared between modes)
  const PhotoGrid = () => (
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
            onClick={handleTakePhoto}
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
            onClick={handleSelectFromGallery}
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
              onClick={() => setFileErrors([])}
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
                          setPositionEditorOpen(true)
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
                      removePhoto(index)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/50 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl mx-auto">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-olive-500 to-olive-500 rounded-lg flex items-center justify-center shadow-lg shadow-olive-500/20">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="text-xl font-semibold text-stone-900 hidden sm:block">Adventure Log</span>
          </Link>
          <UserNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Page Title & Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.natural}
          className="mb-6 md:mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
            Create a New Adventure
          </h1>
          <p className="text-stone-500 mt-1">Share your journey with the world</p>

          {/* Mode Toggle */}
          <div className="mt-4 inline-flex items-center bg-stone-100 rounded-xl p-1 gap-0.5">
            <button
              type="button"
              onClick={() => setMode('quick')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none",
                mode === 'quick'
                  ? "bg-white text-olive-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              <Zap className="h-4 w-4" />
              Quick Post
            </button>
            <button
              type="button"
              onClick={() => setMode('full')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none",
                mode === 'full'
                  ? "bg-white text-olive-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Full Album
            </button>
          </div>

          {/* Import from Photos Link */}
          <div className="mt-3">
            <Link
              href="/albums/import"
              className="inline-flex items-center gap-2 text-sm text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium transition-all duration-200 cursor-pointer hover:translate-x-0.5"
            >
              <Images className="h-4 w-4" />
              Import from Photos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
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

        {/* Quick Post Mode */}
        <AnimatePresence mode="wait">
          {mode === 'quick' ? (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transitions.natural}
            >
              <form onSubmit={handleSubmitQuick(onSubmitQuick)}>
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* Photo Upload - compact for quick post */}
                  <GlassCard animate staggerIndex={0} hover="lift" glow="subtle">
                    <GlassCardContent className="space-y-4 pt-5">
                      <PhotoGrid />
                    </GlassCardContent>
                  </GlassCard>

                  {/* Where & When */}
                  <GlassCard animate staggerIndex={1} hover="lift" glow="subtle">
                    <GlassCardContent className="space-y-5 pt-5">
                      {/* Where */}
                      <LocationSearchInput
                        value={albumLocation}
                        onChange={(loc) => {
                          setAlbumLocation(loc)
                          setLocationAutoExtracted(false)
                        }}
                        placeholder="Where did you go?"
                        label="Where"
                        required
                        showAutoFillButton={photos.length > 0 && !albumLocation}
                        onAutoFill={autoFillLocationFromPhotos}
                        isAutoFilling={isExtractingLocation}
                      />

                      {/* When */}
                      <YearSeasonSelector
                        year={selectedYear}
                        season={selectedSeason}
                        onYearChange={setSelectedYear}
                        onSeasonChange={setSelectedSeason}
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
                      onClick={() => setMode('full')}
                      className="flex items-center justify-center gap-1 text-sm text-stone-500 hover:text-olive-600 transition-all duration-200 py-2 cursor-pointer hover:translate-x-0.5"
                    >
                      Need more options? Switch to Full Album
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Full Album Mode */
            <motion.div
              key="full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transitions.natural}
            >
              <form onSubmit={handleSubmit(onSubmitFull)}>
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
                        <PhotoGrid />
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
                          onYearChange={setSelectedYear}
                          onSeasonChange={setSelectedSeason}
                        />

                        {/* Location */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-stone-700">Location</label>
                          <LocationSearchInput
                            value={albumLocation}
                            onChange={(loc) => {
                              setAlbumLocation(loc)
                              setLocationAutoExtracted(false)
                            }}
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
                        onClick={() => {
                          // If title is empty, use the suggested title before submitting
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
                            // If title is empty, use the suggested title before submitting
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
          )}
        </AnimatePresence>
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
