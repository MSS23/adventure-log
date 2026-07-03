'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { prepareImageForUpload } from '@/lib/utils/prepare-upload'
import { takePhoto, selectFromGallery } from '@/lib/capacitor/camera'
import { localizePath } from '@/lib/utils/native-routes'
import { apiFetch } from '@/lib/api/client'

// Reverse-geocode via our own /api/geocode proxy (Mapbox → Photon, keyless-
// safe). MUST go through apiFetch, not a direct Nominatim call: on the APK the
// WebView origin is capacitor://localhost, so a bare cross-origin fetch to
// nominatim.openstreetmap.org is CORS/policy-blocked — which silently broke
// photo-GPS auto-fill on native.
async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ display_name?: string; country_code?: string } | null> {
  try {
    const params = new URLSearchParams({ reverse: 'true', lat: String(lat), lon: String(lng) })
    const res = await apiFetch(`/api/geocode?${params.toString()}`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      display_name: data?.display_name || undefined,
      country_code: data?.address?.country_code?.toUpperCase() || undefined,
    }
  } catch {
    return null
  }
}

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

// Local calendar "today" as YYYY-MM-DD for the default travel date.
// toISOString() would give UTC "today", which is the wrong calendar day for
// users in negative offsets in the evening (or positive offsets in the
// morning). date_start/date_end are DATE columns, so the local day is what
// the user means. (parseLocalDate in @/lib/utils/travel-date is the
// read-side counterpart; no write-side formatter exists there yet.)
function localTodayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function generateTitleFromLocation(location: LocationData | null): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year = now.getFullYear()

  let shortLocation = location?.display_name || ''
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
  const searchParams = useSearchParams()
  const { triggerAchievementCheck } = useAchievementNotifications()
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number>(0)

  // Prefill location from query params (e.g. when redirected from
  // wishlist tick → "/albums/new?location=Paris&country=FR&lat=…&lng=…").
  // Computed once at hook init so the user can edit freely afterwards.
  const initialPrefilledLocation: LocationData | null = (() => {
    const name = searchParams.get('location')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const latNum = lat !== null ? Number(lat) : NaN
    const lngNum = lng !== null ? Number(lng) : NaN
    if (!name || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null
    return {
      display_name: name,
      country_code: searchParams.get('country') ?? '',
      latitude: latNum,
      longitude: lngNum,
    } as LocationData
  })()

  // Prefill description from wishlist notes when arriving via the
  // wishlist→album conversion (`?notes=…`). Until this prefill existed
  // the user's typed wishlist notes were silently dropped during
  // conversion; now they land in the album description by default.
  const initialPrefilledDescription: string = searchParams.get('notes') ?? ''

  const [albumLocation, setAlbumLocation] = useState<LocationData | null>(
    initialPrefilledLocation,
  )
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
      visibility: 'public',
      description: initialPrefilledDescription || undefined,
    }
  })

  // Quick post form
  const quickForm = useForm<QuickPostFormData>({
    resolver: zodResolver(quickPostSchema),
    defaultValues: {
      visibility: 'public'
    }
  })

  // Update suggested title when location or date changes. A title is ALWAYS
  // produced now (location is optional) — falls back to "Adventure, <month>"
  // so a location-less quick post still gets a sensible name.
  useEffect(() => {
    let shortLocation = albumLocation?.display_name || ''
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
          const geo = await reverseGeocode(locationData.latitude, locationData.longitude)

          setAlbumLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            display_name: geo?.display_name || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`,
            country_code: geo?.country_code,
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
    // Removing a photo before the cover shifts every later index down by one;
    // without remapping, the cover silently moves to the wrong photo.
    setSelectedCoverIndex(prev => {
      if (index < prev) return prev - 1
      if (index === prev) return 0 // the cover itself was removed
      return prev
    })
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
          const geo = await reverseGeocode(locationData.latitude, locationData.longitude)

          setAlbumLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            display_name: geo?.display_name || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`,
            country_code: geo?.country_code,
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

    setIsSubmitting(true)
    setError(null)

    try {
      const status = photos.length === 0 ? 'draft' : 'published'

      // Location is optional (Instagram-style posting). Without it the album
      // just doesn't get pinned on the globe — the user can add a place later
      // from the album's edit screen.
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: opts.title,
          description: opts.description,
          location_name: albumLocation?.display_name || null,
          country_code: albumLocation?.country_code || null,
          latitude: albumLocation?.latitude ?? null,
          longitude: albumLocation?.longitude ?? null,
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
      let failedPhotoCount = 0
      if (photos.length > 0) {
        // Keep each uploaded path paired with its ORIGINAL index: failures
        // compact this array, so positions alone no longer match the cover
        // index the user picked in the UI.
        const uploadedPhotos: Array<{ path: string; originalIndex: number }> = []

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i]
          // Strip GPS/EXIF before upload — buckets are public, so the original
          // bytes (with home coordinates baked in) must never reach storage.
          const preparedFile = await prepareImageForUpload(photo.file)
          const fileExt = preparedFile.name.split('.').pop()
          const fileName = `${album.id}/${Date.now()}-${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, preparedFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            log.error('Failed to upload photo', { error: uploadError, fileName })
            failedPhotoCount++
            continue
          }

          const { error: photoInsertError } = await supabase.from('photos').insert({
            album_id: album.id,
            user_id: user.id,
            file_path: fileName,
            order_index: i,
            created_at: new Date().toISOString()
          })

          // A failed insert means no photo row exists — treat it like a failed
          // upload so the cover/favorites never reference a nonexistent record
          // and the toast doesn't overcount.
          if (photoInsertError) {
            log.error('Failed to insert photo record', {
              component: 'NewAlbumPage',
              error: photoInsertError,
              fileName
            })
            failedPhotoCount++
            continue
          }

          uploadedPhotos.push({ path: fileName, originalIndex: i })
        }

        if (uploadedPhotos.length > 0) {
          // Resolve the cover by the photo's original index; if the chosen
          // cover failed to upload, fall back to the first surviving photo.
          const coverEntry =
            uploadedPhotos.find(p => p.originalIndex === selectedCoverIndex) ??
            uploadedPhotos[0]
          await supabase
            .from('albums')
            .update({
              cover_photo_url: coverEntry.path,
              favorite_photo_urls: uploadedPhotos.slice(0, 3).map(p => p.path),
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

      // Auto-complete any matching wishlist items. A wishlist destination is
      // considered "visited" only when the user actually creates an album for
      // it — either via the tick on the wishlist page (passes wishlistItemId)
      // or by creating an album with a location that's close to a wishlist
      // entry. ±0.01° (~1.1km) catches users picking a slightly different
      // pin for the same destination. Skipped entirely for location-less posts.
      try {
        const wishlistItemId = searchParams.get('wishlistItemId')
        const EPS = 0.01
        const lat = albumLocation?.latitude
        const lng = albumLocation?.longitude

        // Location-less posts can't spatially match a wishlist entry; only
        // an explicit wishlistItemId (from the wishlist tick) still applies.
        if (lat != null && lng != null) {
          let matchQuery = supabase
            .from('wishlist_items')
            .select('id, location_name')
            .eq('user_id', user.id)
            .is('completed_at', null)

          if (wishlistItemId) {
            matchQuery = matchQuery.or(
              `id.eq.${wishlistItemId},and(latitude.gte.${lat - EPS},latitude.lte.${lat + EPS},longitude.gte.${lng - EPS},longitude.lte.${lng + EPS})`
            )
          } else {
            matchQuery = matchQuery
              .gte('latitude', lat - EPS)
              .lte('latitude', lat + EPS)
              .gte('longitude', lng - EPS)
              .lte('longitude', lng + EPS)
          }

          const { data: matchingItems, error: matchErr } = await matchQuery

          if (matchErr) {
            // Table may not exist yet on older instances — ignore quietly.
            if (matchErr.code !== '42P01' && matchErr.code !== 'PGRST205' && matchErr.code !== 'PGRST200') {
              log.warn('Failed to look up matching wishlist items', {
                component: 'NewAlbumPage',
                action: 'auto-complete-wishlist',
                albumId: album.id,
              }, matchErr)
            }
          } else if (matchingItems && matchingItems.length > 0) {
            const ids = matchingItems.map((i) => i.id)
            const { error: completeErr } = await supabase
              .from('wishlist_items')
              .update({ completed_at: new Date().toISOString() })
              .in('id', ids)
              .eq('user_id', user.id)

            if (completeErr) {
              log.warn('Failed to auto-complete wishlist items', {
                component: 'NewAlbumPage',
                action: 'auto-complete-wishlist',
                albumId: album.id,
              }, completeErr)
            } else {
              log.info('Auto-completed wishlist items from album', {
                component: 'NewAlbumPage',
                action: 'auto-complete-wishlist',
                albumId: album.id,
                count: ids.length,
              })
            }
          }
        }
      } catch (wishlistErr) {
        // Non-fatal — never let wishlist sync block album creation.
        log.warn('Wishlist auto-completion errored', {
          component: 'NewAlbumPage',
          action: 'auto-complete-wishlist',
        }, wishlistErr as Error)
      }

      triggerAchievementCheck()

      if (photos.length === 0) {
        await Toast.show({
          text: `Saved to drafts! Add photos to publish your album.`,
          duration: 'long',
          position: 'bottom'
        })
      } else if (failedPhotoCount > 0) {
        // Don't claim full success when some photos never made it — say
        // exactly how many uploaded vs. failed.
        const okCount = photos.length - failedPhotoCount
        await Toast.show({
          text: `Album created — ${okCount} of ${photos.length} photos uploaded, ${failedPhotoCount} failed.`,
          duration: 'long',
          position: 'bottom'
        })
      } else {
        await Toast.show({
          text: mode === 'quick'
            ? `Posted! Your album is now live.`
            : `Album "${opts.title}" created with ${photos.length} photo${photos.length > 1 ? 's' : ''}!`,
          duration: 'long',
          position: 'bottom'
        })
      }

      router.push(localizePath(`/albums/${album.id}?created=true`))
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

    const title = sanitizeText(suggestedTitle || generateTitleFromLocation(albumLocation))
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
      const today = localTodayString()
      dateStart = today
      dateEnd = today
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
