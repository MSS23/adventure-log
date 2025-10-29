'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { type LocationData } from '@/lib/utils/locationUtils'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { Toast } from '@capacitor/toast'
import { CoverPhotoPositionEditor } from '@/components/albums/CoverPhotoPositionEditor'
import { takePhoto, selectFromGallery, isNativeApp } from '@/lib/capacitor/camera'
import { extractPhotoLocation } from '@/lib/utils/exif-extraction'
import { PhotoUploadArea } from '@/components/albums/PhotoUploadArea'
import { CoverPhotoSelector, type UploadedPhoto } from '@/components/albums/CoverPhotoSelector'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { DateRangePicker } from '@/components/albums/DateRangePicker'

const albumSchema = z.object({
  title: z.string()
    .min(1, 'Album name is required')
    .max(100, 'Album name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  visibility: z.enum(['private', 'friends', 'public']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine(
  (data) => {
    if (!data.start_date || !data.end_date) return true
    return new Date(data.start_date) <= new Date(data.end_date)
  },
  {
    message: 'End date must be after start date',
    path: ['end_date']
  }
)

type AlbumFormData = z.infer<typeof albumSchema>

export default function NewAlbumPage() {
  const { user } = useAuth()
  const router = useRouter()
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
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      visibility: 'public'
    }
  })

  const onDrop = (acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    },
    multiple: true
  })

  const handleTakePhoto = async () => {
    const file = await takePhoto()
    if (file) {
      const newPhoto: UploadedPhoto = {
        file,
        preview: URL.createObjectURL(file)
      }
      setPhotos(prev => [...prev, newPhoto])
    }
  }

  const handleSelectFromGallery = async () => {
    const files = await selectFromGallery({}, true) // Enable multiple selection
    if (files.length > 0) {
      const newPhotos = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }))
      setPhotos(prev => [...prev, ...newPhotos])
    }
  }

  const removePhoto = (index: number) => {
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
      // Try to extract location from the first photo with GPS data
      for (const photo of photos) {
        const locationData = await extractPhotoLocation(photo.file)

        if (locationData?.latitude && locationData?.longitude) {
          // Reverse geocode to get location name
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

      // No photos had GPS data
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
      const status = photos.length === 0 ? 'draft' : 'published'

      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description || null,
          location_name: albumLocation.display_name || null,
          country_code: albumLocation.country_code || null,
          latitude: albumLocation.latitude,
          longitude: albumLocation.longitude,
          visibility: data.visibility || 'public',
          date_start: data.start_date || null,
          date_end: data.end_date || null,
          show_exact_dates: true,
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

          // Upload to Supabase storage
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

          // Insert photo record
          await supabase.from('photos').insert({
            album_id: album.id,
            user_id: user.id,
            file_path: fileName,
            order_index: i,
            created_at: new Date().toISOString()
          })
        }

        // Set the selected photo as cover photo
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

      // Show success message and redirect
      if (photos.length === 0) {
        await Toast.show({
          text: `Saved to drafts! Add photos to publish your album.`,
          duration: 'long',
          position: 'bottom'
        })
      } else {
        await Toast.show({
          text: `Album "${data.title}" created with ${photos.length} photo${photos.length > 1 ? 's' : ''}!`,
          duration: 'long',
          position: 'bottom'
        })
      }

      // Redirect to the album detail page
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

      // Also show toast for better visibility
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
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between h-16 px-6 max-w-7xl mx-auto">
          <Link href="/albums" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Adventure Log</span>
          </Link>
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto px-6 py-8"  >
        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create a New Adventure</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Upload & Photos (2/5 width) */}
          <div className="lg:col-span-2 space-y-6">
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-6"
                  onClick={handleTakePhoto}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-6 w-6" />
                    <span className="text-sm font-medium">Take Photo</span>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-6"
                  onClick={handleSelectFromGallery}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="h-6 w-6" />
                    <span className="text-sm font-medium">From Gallery</span>
                  </div>
                </Button>
              </div>
            )}

            {/* Photo Thumbnails */}
            {photos.length > 0 && (
              <CoverPhotoSelector
                photos={photos}
                selectedCoverId={selectedCoverIndex}
                onSelectCover={setSelectedCoverIndex}
                onRemovePhoto={removePhoto}
              />
            )}

            {photos.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPositionEditorOpen(true)}
                className="w-full"
              >
                Adjust Cover Position
              </Button>
            )}
          </div>

          {/* Right Column: Form Fields (3/5 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Album Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Album Title
              </Label>
              <Input
                id="title"
                {...register('title')}
                className={cn(
                  "h-11 border-gray-300 rounded-lg",
                  errors.title && "border-red-500"
                )}
                placeholder="e.g., Summer Trip to the Alps"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Location */}
            <LocationSearchInput
              value={albumLocation}
              onChange={setAlbumLocation}
              placeholder="Search for a city or country"
              label="Location"
              required
              showAutoFillButton={photos.length > 0}
              onAutoFill={autoFillLocationFromPhotos}
              isAutoFilling={isExtractingLocation}
            />

            {/* Dates */}
            <DateRangePicker
              startDate={watch('start_date') || ''}
              endDate={watch('end_date') || ''}
              onStartDateChange={(date) => setValue('start_date', date)}
              onEndDateChange={(date) => setValue('end_date', date)}
              label="Dates"
              startDateError={errors.start_date?.message}
              endDateError={errors.end_date?.message}
            />

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                className={cn(
                  "min-h-24 border-gray-300 rounded-lg",
                  errors.description && "border-red-500"
                )}
                placeholder="A short and sweet summary of your adventure."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Memories & Stories */}
            <div className="space-y-2">
              <Label htmlFor="memories" className="text-sm font-medium text-gray-700">
                Memories & Stories
              </Label>
              <Textarea
                id="memories"
                className="min-h-32 border-gray-300 rounded-lg"
                placeholder="Share your favorite moments, tips, or funny stories from the trip."
                rows={6}
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4 mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/albums')}
            className="px-6 py-2.5 rounded-lg border-gray-300"
          >
            Save Draft
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !albumLocation}
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Album'
            )}
          </Button>
        </div>
      </form>

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
