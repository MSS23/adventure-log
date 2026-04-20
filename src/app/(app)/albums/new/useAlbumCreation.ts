'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { type LocationData } from '@/lib/utils/locationUtils'
import { log } from '@/lib/utils/logger'
import { Toast } from '@capacitor/toast'
import { extractPhotoLocation } from '@/lib/utils/exif-extraction'
import { type UploadedPhoto } from '@/components/albums/CoverPhotoSelector'
import { useAchievementNotifications } from '@/components/achievements/AchievementProvider'
import { type Season, convertYearSeasonToDateRange } from '@/components/albums/YearSeasonSelector'
import { sanitizeText, validateImageFile } from '@/lib/utils/input-validation'
import { takePhoto, selectFromGallery } from '@/lib/capacitor/camera'

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

export type AlbumFormData = z.infer<typeof albumSchema>
export type QuickPostFormData = z.infer<typeof quickPostSchema>

export const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends', label: 'Friends', description: 'Only friends' },
  { value: 'private', label: 'Private', description: 'Only you' },
]

function generateTitleFromLocation(location: LocationData): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year = now.getFullYear()

  let shortLocation = location.display_name || ''
  if (shortLocation.includes(',')) {
    shortLocation = shortLocation.split(',')[0].trim()
  }

  if (shortLocation) {
    return `${shortLocation}, ${month} ${year}`
  }
  return `Adventure, ${month} ${year}`
}

export function useAlbumCreation() {
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
  const fullForm = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      visibility: 'public'
    }
  })

  // Quick post form
  const quickForm = useForm<QuickPostFormData>({
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

  return {
    // State
    photos,
    selectedCoverIndex,
    albumLocation,
    isSubmitting,
    error,
    positionEditorOpen,
    coverPosition,
    isExtractingLocation,
    selectedYear,
    selectedSeason,
    fileErrors,
    mode,
    suggestedTitle,
    locationAutoExtracted,

    // Forms
    fullForm,
    quickForm,

    // Actions
    setSelectedCoverIndex,
    setAlbumLocation,
    setError,
    setPositionEditorOpen,
    setCoverPosition,
    setSelectedYear,
    setSelectedSeason,
    setFileErrors,
    setMode,
    setLocationAutoExtracted,
    onDrop,
    handleTakePhoto,
    handleSelectFromGallery,
    removePhoto,
    autoFillLocationFromPhotos,
    onSubmitFull,
    onSubmitQuick,

    // Router
    router,
  }
}
