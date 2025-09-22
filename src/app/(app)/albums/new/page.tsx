'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Plus, X, Globe, Users, Lock, MapPin, Upload, Camera, FileImage, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { LocationSearch } from '@/components/location/LocationSearch'
import { LocationDropdown } from '@/components/location/LocationDropdown'
import { log } from '@/lib/utils/logger'
import { ErrorHandler, handleUploadError, handleFormError } from '@/lib/utils/errorHandler'
import { useLoadingState, LOADING_STAGES } from '@/lib/hooks/useLoadingState'
import { FormLoading, LoadingOverlay, ButtonLoading } from '@/components/ui/loading'
import { useImageOptimization } from '@/lib/hooks/useImageOptimization'
import { formatFileSize, getCompressionPercentage } from '@/lib/utils/imageOptimization'

const albumSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  visibility: z.enum(['private', 'friends', 'public']),
  tags: z.array(z.string())
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

type AlbumFormData = z.infer<typeof albumSchema>

interface LocationData {
  latitude: number
  longitude: number
  display_name: string
  place_id?: string
}

interface PhotoFile {
  file: File
  preview: string
  caption: string
  manualLocation?: LocationData | null
  exifData?: {
    dateTime?: string
    latitude?: number
    longitude?: number
    cameraMake?: string
    cameraModel?: string
  }
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error'
  uploadError?: string
  // Image optimization metadata
  originalSize?: number
  optimizedSize?: number
  compressionRatio?: number
  optimizationError?: string
}

export default function NewAlbumPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Enhanced loading state management
  const loadingState = useLoadingState({
    logContext: {
      component: 'CreateAlbumPage',
      action: 'album-creation'
    }
  })

  const uploadLoadingState = useLoadingState({
    logContext: {
      component: 'CreateAlbumPage',
      action: 'file-upload'
    }
  })

  // Image optimization system
  const imageOptimization = useImageOptimization({
    autoOptimize: true,
    optimizationOptions: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
      format: 'jpeg'
    },
    onProgress: (progress) => {
      if (progress.isOptimizing) {
        uploadLoadingState.updateProgress(
          `Optimizing ${progress.currentFileName}... (${progress.currentFile}/${progress.totalFiles})`,
          progress.progress
        )
      }
    },
    onComplete: (results) => {
      const summary = imageOptimization.getOptimizationSummary()
      if (summary && summary.totalSavings > 0) {
        log.info('Image optimization completed', {
          component: 'CreateAlbumPage',
          action: 'optimize-images',
          totalSavings: summary.formattedSavings,
          averageCompression: summary.averageCompression
        })
      }
    }
  })
  const [tagInput, setTagInput] = useState('')
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [albumLocation, setAlbumLocation] = useState<LocationData | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      visibility: 'public',
      tags: []
    }
  })

  const watchedTags = watch('tags')
  const watchedVisibility = watch('visibility')

  // Photo handling functions
  const extractExifData = async (file: File): Promise<PhotoFile['exifData']> => {
    try {
      const exifr = await import('exifr')
      const exifData = await exifr.parse(file)

      return {
        dateTime: exifData?.DateTime || exifData?.DateTimeOriginal,
        latitude: exifData?.latitude,
        longitude: exifData?.longitude,
        cameraMake: exifData?.Make,
        cameraModel: exifData?.Model
      }
    } catch (err) {
      log.warn('EXIF extraction failed for photo', {
        component: 'CreateAlbumPage',
        action: 'extract-exif',
        fileName: file.name
      }, err)
      return {}
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Start optimization process
    uploadLoadingState.startLoading('Optimizing images...', [
      { key: 'optimizing', text: 'Optimizing images...', weight: 60 },
      { key: 'processing', text: 'Processing metadata...', weight: 40 }
    ])

    try {
      // Optimize images first
      const optimizationResults = await imageOptimization.optimizeImages(acceptedFiles)

      uploadLoadingState.nextStage('Processing metadata...')

      const newPhotos: PhotoFile[] = []

      for (let i = 0; i < optimizationResults.length; i++) {
        const result = optimizationResults[i]

        if (result.success && result.optimizedBlob) {
          // Create optimized file
          const optimizedFile = new File(
            [result.optimizedBlob],
            result.originalFile.name,
            { type: result.optimizedBlob.type }
          )

          const preview = URL.createObjectURL(result.optimizedBlob)
          const exifData = await extractExifData(result.originalFile)

          newPhotos.push({
            file: optimizedFile,
            preview,
            caption: '',
            manualLocation: null,
            exifData,
            uploadProgress: 0,
            uploadStatus: 'pending',
            originalSize: result.originalSize,
            optimizedSize: result.optimizedSize,
            compressionRatio: result.compressionRatio
          })
        } else {
          // Handle failed optimization by using original file
          const file = result.originalFile
          const preview = URL.createObjectURL(file)
          const exifData = await extractExifData(file)

          newPhotos.push({
            file,
            preview,
            caption: '',
            manualLocation: null,
            exifData,
            uploadProgress: 0,
            uploadStatus: 'pending',
            optimizationError: result.error
          })
        }
      }

      setPhotos(prev => [...prev, ...newPhotos])
      uploadLoadingState.completeLoading('Images optimized successfully!')

      // Show optimization summary if significant savings
      const summary = imageOptimization.getOptimizationSummary()
      if (summary && summary.totalSavings > 100000) { // > 100KB savings
        log.info(`Image optimization saved ${summary.formattedSavings}`, {
          component: 'CreateAlbumPage',
          action: 'image-optimization-summary',
          averageCompression: summary.averageCompression
        })
      }

    } catch (error) {
      uploadLoadingState.errorLoading('Failed to optimize images')
      log.error('Image optimization failed in onDrop', {
        component: 'CreateAlbumPage',
        action: 'optimize-on-drop'
      }, error)

      // Fallback to original files without optimization
      const newPhotos: PhotoFile[] = []
      for (const file of acceptedFiles) {
        const preview = URL.createObjectURL(file)
        const exifData = await extractExifData(file)

        newPhotos.push({
          file,
          preview,
          caption: '',
          manualLocation: null,
          exifData,
          uploadProgress: 0,
          uploadStatus: 'pending'
        })
      }
      setPhotos(prev => [...prev, ...newPhotos])
    }
  }, [imageOptimization, uploadLoadingState])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    },
    multiple: true
  })

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev]
      URL.revokeObjectURL(newPhotos[index].preview)
      newPhotos.splice(index, 1)
      return newPhotos
    })
  }

  const updateCaption = (index: number, caption: string) => {
    setPhotos(prev => {
      const newPhotos = [...prev]
      newPhotos[index].caption = caption
      return newPhotos
    })
  }

  const updateLocation = (index: number, location: LocationData | null) => {
    setPhotos(prev => {
      const newPhotos = [...prev]
      newPhotos[index].manualLocation = location
      return newPhotos
    })
  }

  const addTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !watchedTags.includes(trimmedTag) && watchedTags.length < 10) {
      setValue('tags', [...watchedTags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const uploadPhoto = async (photo: PhotoFile, albumId: string, index: number): Promise<boolean> => {
    try {
      // Update status to uploading
      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'uploading'
        newPhotos[index].uploadProgress = 0
        newPhotos[index].uploadError = undefined
        return newPhotos
      })

      // Generate unique filename
      const fileExt = photo.file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `photos/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, photo.file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      // Determine which location to use (manual location overrides EXIF)
      const finalLatitude = photo.manualLocation?.latitude ?? photo.exifData?.latitude ?? null
      const finalLongitude = photo.manualLocation?.longitude ?? photo.exifData?.longitude ?? null
      const locationName = photo.manualLocation?.display_name ?? null

      // Save photo record to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          album_id: albumId,
          user_id: user?.id,
          file_path: data.publicUrl,
          caption: photo.caption || null,
          order_index: index,
          taken_at: photo.exifData?.dateTime || null,
          latitude: finalLatitude,
          longitude: finalLongitude,
          location_name: locationName,
          camera_make: photo.exifData?.cameraMake || null,
          camera_model: photo.exifData?.cameraModel || null,
          file_size: photo.file.size,
          mime_type: photo.file.type
        })

      if (dbError) throw dbError

      // Update status to completed
      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'completed'
        newPhotos[index].uploadProgress = 100
        return newPhotos
      })

      return true
    } catch (err) {
      const standardError = handleUploadError(err, {
        component: 'CreateAlbumPage',
        action: 'upload-photo',
        fileName: file.name,
        fileSize: file.size
      })

      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'error'
        newPhotos[index].uploadError = standardError.userMessage
        return newPhotos
      })

      return false
    }
  }

  const onSubmit = async (data: AlbumFormData) => {
    if (!user) return

    try {
      setError(null)
      loadingState.startLoading('Creating album...', LOADING_STAGES.ALBUM_CREATION)

      // Step 1: Create the album
      loadingState.nextStage('Creating album...')
      const albumData = {
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        location_name: albumLocation?.display_name || null,
        latitude: albumLocation?.latitude || null,
        longitude: albumLocation?.longitude || null,
        city_id: albumLocation?.city_id || null,
        country_id: albumLocation?.country_id || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        visibility: data.visibility,
        tags: data.tags.length > 0 ? data.tags : null
      }

      const { data: album, error } = await supabase
        .from('albums')
        .insert([albumData])
        .select()
        .single()

      if (error) throw error

      // Step 2: Upload photos if any
      if (photos.length > 0) {
        loadingState.nextStage(`Uploading ${photos.length} photos...`)
        let successCount = 0
        const promises = photos.map((photo, index) => uploadPhoto(photo, album.id, index))
        const results = await Promise.all(promises)
        successCount = results.filter(Boolean).length

        if (successCount < photos.length) {
          setError(`Album created! ${successCount}/${photos.length} photos uploaded successfully. You can add more photos later.`)
        }
      }

      // Navigate to the new album
      loadingState.nextStage('Finalizing album...')
      loadingState.completeLoading('Album created successfully!')
      router.push(`/albums/${album.id}`)
    } catch (err) {
      const standardError = handleFormError(err, {
        component: 'CreateAlbumPage',
        action: 'create-album',
        userId: user?.id,
        albumTitle: formData.title
      })
      loadingState.errorLoading(standardError.userMessage)
      setError(standardError.userMessage)
    }
  }

  const visibilityOptions = [
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone can see this album',
      icon: Globe
    },
    {
      value: 'friends',
      label: 'Friends',
      description: 'Only people you follow can see this',
      icon: Users
    },
    {
      value: 'private',
      label: 'Private',
      description: 'Only you can see this album',
      icon: Lock
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Album</h1>
        <p className="text-gray-600 mt-2">
          Organize your travel photos and memories into a beautiful album
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your album a title and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading Progress */}
            <FormLoading loadingState={loadingState} />

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Album Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Summer Trip to Italy"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell the story of your trip..."
                rows={4}
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
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
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location & Dates
            </CardTitle>
            <CardDescription>
              Where and when did this adventure take place?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_name">Location</Label>
              <LocationDropdown
                value={albumLocation}
                onChange={setAlbumLocation}
                placeholder="Search destinations or pick a popular one..."
                allowCurrentLocation={true}
                showPopularDestinations={true}
                className={errors.location_name ? 'border-red-500' : ''}
              />
              {errors.location_name && (
                <p className="text-sm text-red-600">{errors.location_name.message}</p>
              )}
              {albumLocation && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-blue-800 font-medium">Selected: {albumLocation.display_name}</p>
                  <p className="text-blue-600 text-xs">
                    Coordinates: {albumLocation.latitude.toFixed(6)}, {albumLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Privacy & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Choose who can see your album
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibilityOptions.map((option) => {
                const Icon = option.icon
                return (
                  <label
                    key={option.value}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      watchedVisibility === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('visibility')}
                      className="mt-1"
                    />
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      watchedVisibility === option.value ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        watchedVisibility === option.value ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </p>
                      <p className={`text-sm ${
                        watchedVisibility === option.value ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Add tags to help organize and find your album later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1"
                disabled={watchedTags.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || watchedTags.includes(tagInput.trim()) || watchedTags.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
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

            {watchedTags.length >= 10 && (
              <p className="text-sm text-gray-500">Maximum of 10 tags allowed</p>
            )}
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos (Optional)
            </CardTitle>
            <CardDescription>
              Add photos to your album now, or upload them later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              <input {...getInputProps()} />
              <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg font-medium text-blue-600">Drop photos here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drag photos here or click to browse
                  </p>
                  <p className="text-sm text-gray-600">
                    JPEG, PNG, WebP, and HEIC formats supported. EXIF data will be extracted automatically.
                  </p>
                </>
              )}
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Photos ({photos.length})</h4>
                  {uploading && (
                    <div className="text-sm text-blue-600">Uploading photos...</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {photos.map((photo, index) => (
                    <div key={index} className="space-y-3">
                      <div className="relative group">
                        <div className="relative w-full h-32 rounded-lg overflow-hidden">
                          <Image
                            src={photo.preview}
                            alt={`Upload ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </button>

                        {/* Status Overlay */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          {photo.uploadStatus === 'pending' && <Camera className="h-3 w-3 text-gray-400" />}
                          {photo.uploadStatus === 'uploading' && <Upload className="h-3 w-3 text-blue-600 animate-pulse" />}
                          {photo.uploadStatus === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                          {photo.uploadStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-600" />}
                          <span className="capitalize">{photo.uploadStatus}</span>
                        </div>
                      </div>

                      {/* Upload Progress */}
                      {photo.uploadStatus === 'uploading' && (
                        <Progress value={photo.uploadProgress} className="w-full" />
                      )}

                      {/* Caption */}
                      <div className="space-y-1">
                        <Label htmlFor={`caption-${index}`} className="text-xs">Caption</Label>
                        <Textarea
                          id={`caption-${index}`}
                          value={photo.caption}
                          onChange={(e) => updateCaption(index, e.target.value)}
                          placeholder="Add a caption..."
                          rows={2}
                          disabled={uploading}
                          className="text-sm"
                        />
                      </div>

                      {/* Location */}
                      <div className="space-y-1">
                        <Label className="text-xs">Location</Label>
                        <LocationSearch
                          value={photo.manualLocation}
                          onChange={(location) => updateLocation(index, location)}
                          placeholder={
                            photo.exifData?.latitude && photo.exifData?.longitude
                              ? "Override GPS location..."
                              : "Search for location..."
                          }
                          allowCurrentLocation={true}
                        />
                        {photo.exifData?.latitude && photo.exifData?.longitude && !photo.manualLocation && (
                          <p className="text-xs text-gray-600">
                            📍 GPS location detected from photo
                          </p>
                        )}
                      </div>

                      {/* Error Message */}
                      {photo.uploadStatus === 'error' && photo.uploadError && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-red-600 text-xs">{photo.uploadError}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/albums" className="flex-1">
            <Button variant="outline" className="w-full" disabled={loadingState.isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={loadingState.isLoading}>
            <ButtonLoading
              isLoading={loadingState.isLoading}
              loadingText={loadingState.loadingText}
            >
              {photos.length > 0 ? 'Create Album & Upload Photos' : 'Create Album'}
            </ButtonLoading>
          </Button>
        </div>
      </form>
    </div>
  )
}