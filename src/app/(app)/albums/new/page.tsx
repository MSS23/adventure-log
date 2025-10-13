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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, MapPin, Camera, Loader2, X, Plus, Globe, Users, Lock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { LocationDropdown } from '@/components/location/LocationDropdown'
import { type LocationData } from '@/lib/utils/locationUtils'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import { Toast } from '@capacitor/toast'
import { CoverPhotoPositionEditor } from '@/components/albums/CoverPhotoPositionEditor'
import { takePhoto, selectFromGallery, isNativeApp } from '@/lib/capacitor/camera'
import { LICENSE_OPTIONS, getLicenseInfo } from '@/lib/utils/license-info'

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
  copyright_holder: z.string().max(200, 'Copyright holder name must be less than 200 characters').optional(),
  license_type: z.enum(['all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'cc0', 'public-domain']).optional(),
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

interface PhotoFile {
  file: File
  preview: string
}

export default function NewAlbumPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number>(0)
  const [albumLocation, setAlbumLocation] = useState<LocationData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [positionEditorOpen, setPositionEditorOpen] = useState(false)
  const [coverPosition, setCoverPosition] = useState<{
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset?: number
    yOffset?: number
  }>({})
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

  const visibility = watch('visibility')

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
      const newPhoto: PhotoFile = {
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
  }

  const addTag = (tagText?: string) => {
    const textToAdd = (tagText || newTag).trim()
    if (textToAdd && !tags.includes(textToAdd)) {
      setTags([...tags, textToAdd])
      if (!tagText) setNewTag('')
    }
  }

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Detect comma or explicit space after a word
    if (value.includes(',') || (value.endsWith(' ') && value.trim().length > 0)) {
      // Split by comma or space and add all non-empty tags
      const newTags = value.split(/[,\s]+/).filter(t => t.trim().length > 0)

      newTags.forEach(tag => {
        if (tag && !tags.includes(tag)) {
          addTag(tag)
        }
      })

      setNewTag('')
    } else {
      setNewTag(value)
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4 text-green-600" />
      case 'friends':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'private':
        return <Lock className="h-4 w-4 text-gray-800" />
      default:
        return <Globe className="h-4 w-4 text-gray-800" />
    }
  }

  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Anyone can view this album'
      case 'friends':
        return 'Only your friends can view this album'
      case 'private':
        return 'Only you can view this album'
      default:
        return ''
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
          tags: tags.length > 0 ? tags : null,
          status: status,
          copyright_holder: data.copyright_holder || null,
          license_type: data.license_type || 'all-rights-reserved',
          license_url: data.license_type ? getLicenseInfo(data.license_type).url : null,
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className={cn(instagramStyles.card, "sticky top-0 z-10 border-b")}>
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
          <Link href="/albums">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className={cn(instagramStyles.text.heading, "text-lg")}>
            New Album
          </h1>
          <div className="w-[72px]"></div> {/* Spacer for alignment */}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Set up your album&apos;s basic details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Album Title *</Label>
              <Input
                id="title"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
                placeholder="e.g., Summer Trip to Italy"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
                placeholder="Tell the story of your adventure..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location & Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Dates
            </CardTitle>
            <CardDescription>
              Add location and date information for your adventure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_name">Location *</Label>
              <LocationDropdown
                value={albumLocation}
                onChange={setAlbumLocation}
                placeholder="Search destinations or pick a popular one..."
                allowCurrentLocation={true}
                showPopularDestinations={true}
              />
              {albumLocation && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-blue-800 font-medium">Selected: {albumLocation.display_name}</p>
                  <p className="text-blue-600 text-sm">
                    Coordinates: {albumLocation.latitude.toFixed(6)}, {albumLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  className={errors.start_date ? 'border-red-500' : ''}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-600">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  className={errors.end_date ? 'border-red-500' : ''}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-600">{errors.end_date.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Visibility</CardTitle>
            <CardDescription>
              Control who can see this album
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setValue('visibility', value as 'private' | 'friends' | 'public')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Friends Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {visibility && (
                <p className="text-sm text-gray-800 flex items-center gap-2">
                  {getVisibilityIcon(visibility)}
                  {getVisibilityDescription(visibility)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Copyright & Licensing */}
        <Card>
          <CardHeader>
            <CardTitle>Copyright & Licensing</CardTitle>
            <CardDescription>
              Set copyright and licensing information for your photos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copyright_holder">Copyright Holder</Label>
              <Input
                id="copyright_holder"
                {...register('copyright_holder')}
                className={errors.copyright_holder ? 'border-red-500' : ''}
                placeholder="e.g., Your Name or Organization"
              />
              {errors.copyright_holder && (
                <p className="text-sm text-red-600">{errors.copyright_holder.message}</p>
              )}
              <p className="text-sm text-gray-500">
                Who owns the copyright to these photos? Leave blank to default to your name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_type">License Type</Label>
              <Select
                value={watch('license_type')}
                onValueChange={(value) => setValue('license_type', value as 'all-rights-reserved' | 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nc-nd' | 'cc0' | 'public-domain')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a license" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_OPTIONS.map((license) => (
                    <SelectItem key={license.value} value={license.value}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{license.shortLabel}</span>
                        <span className="text-xs text-gray-500">{license.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {watch('license_type') && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-blue-800 font-medium">
                    {getLicenseInfo(watch('license_type')).label}
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    {getLicenseInfo(watch('license_type')).description}
                  </p>
                  {getLicenseInfo(watch('license_type')).url && (
                    <a
                      href={getLicenseInfo(watch('license_type')).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-xs mt-2 inline-block"
                    >
                      Learn more →
                    </a>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Add tags to help organize and find your albums
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={handleTagInput}
                placeholder="Add a tag (comma or space to add multiple)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" onClick={() => addTag()} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos
              </span>
              {photos.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Add photos to your album (optional - you can add them later)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mobile Action Buttons */}
            {isNativeApp() && (
              <div className="grid grid-cols-2 gap-2">
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

            {/* Upload Area (Desktop/Fallback) */}
            {!isNativeApp() && (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                  isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <input {...getInputProps()} />
                <Camera className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                {isDragActive ? (
                  <p className="text-base font-medium text-blue-600">Drop photos here</p>
                ) : (
                  <div>
                    <p className="text-base font-medium text-gray-900 mb-1">
                      Tap to add photos
                    </p>
                    <p className="text-sm text-gray-500">
                      or drag and drop
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {photos.length > 1 && (
                    <p className="text-sm text-gray-600">
                      Tap a photo to select it as your cover
                    </p>
                  )}
                  {photos.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPositionEditorOpen(true)}
                    >
                      Adjust Cover Position
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className={cn(
                        "relative aspect-square group cursor-pointer",
                        selectedCoverIndex === index && "ring-4 ring-blue-500 rounded-lg"
                      )}
                      onClick={() => setSelectedCoverIndex(index)}
                    >
                      <Image
                        src={photo.preview}
                        alt={`Photo ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      {selectedCoverIndex === index && (
                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          Cover
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removePhoto(index)
                          if (selectedCoverIndex >= photos.length - 1) {
                            setSelectedCoverIndex(Math.max(0, photos.length - 2))
                          }
                        }}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-between">
          <Link href="/albums">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={isSubmitting || !albumLocation}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
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
