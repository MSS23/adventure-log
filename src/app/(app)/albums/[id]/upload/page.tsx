'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Camera,
  MapPin,
  Calendar,
  FileImage,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { LocationSearch } from '@/components/location/LocationSearch'
import { log } from '@/lib/utils/logger'
import { uploadPhoto as uploadToStorage, StorageError } from '@/lib/utils/storage'

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
}

export default function PhotoUploadPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile, profileLoading } = useAuth()
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const extractExifData = async (file: File): Promise<PhotoFile['exifData']> => {
    try {
      // Dynamic import to avoid SSR issues
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
      log.debug('EXIF extraction failed - photo will be uploaded without metadata', {
        component: 'PhotoUploadPage',
        action: 'extractExifData',
        fileName: file.name,
        error: err
      })
      return {}
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
  }, [])

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

  const uploadPhoto = async (photo: PhotoFile, index: number): Promise<boolean> => {
    try {
      // Update status to uploading
      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'uploading'
        newPhotos[index].uploadProgress = 0
        newPhotos[index].uploadError = undefined
        return newPhotos
      })

      // Upload using storage helper with retry logic
      const publicUrl = await uploadToStorage(photo.file, user?.id)

      // Determine which location to use (manual location overrides EXIF)
      const finalLatitude = photo.manualLocation?.latitude ?? photo.exifData?.latitude ?? null
      const finalLongitude = photo.manualLocation?.longitude ?? photo.exifData?.longitude ?? null
      const locationName = photo.manualLocation?.display_name ?? null

      // Save photo record to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          album_id: params.id as string,
          user_id: user?.id,
          file_path: publicUrl,
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
      log.error('Photo upload failed', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        albumId: Array.isArray(params.id) ? params.id[0] : params.id,
        fileName: photo.file.name,
        fileSize: photo.file.size,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      let errorMessage = 'Upload failed'

      if (err instanceof StorageError) {
        // Use the specific error message from StorageError
        errorMessage = err.message
      } else if (err instanceof Error) {
        if (err.message.includes('413')) {
          errorMessage = 'File too large. Please choose a smaller image.'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('storage')) {
          errorMessage = 'Storage error. Please try again.'
        } else {
          errorMessage = err.message
        }
      }

      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'error'
        newPhotos[index].uploadError = errorMessage
        return newPhotos
      })

      return false
    }
  }

  const uploadAllPhotos = async () => {
    if (photos.length === 0) return

    setUploading(true)
    setError(null)

    let successCount = 0
    const promises = photos.map((photo, index) => uploadPhoto(photo, index))
    const results = await Promise.all(promises)

    successCount = results.filter(Boolean).length

    setUploading(false)

    if (successCount === photos.length) {
      router.push(`/albums/${params.id}`)
    } else {
      setError(`${successCount}/${photos.length} photos uploaded successfully. Please retry failed uploads.`)
    }
  }

  const getStatusIcon = (status: PhotoFile['uploadStatus']) => {
    switch (status) {
      case 'pending':
        return <Camera className="h-4 w-4 text-gray-400" />
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  // Show loading state while profile is being fetched
  if (profileLoading) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading profile...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if user is authenticated but no profile exists
  if (user && !profile) {
    return (
      <div className="space-y-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Profile Setup Required</h3>
              <p className="text-yellow-700 mb-4">
                You need to complete your profile setup before uploading photos.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/setup">
                  <Button>Complete Profile Setup</Button>
                </Link>
                <Link href={`/albums/${params.id}`}>
                  <Button variant="outline">Back to Album</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link href={`/albums/${params.id}`} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Album
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
          <p className="text-gray-600">Add photos to your adventure album</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Select Photos
          </CardTitle>
          <CardDescription>
            Drag and drop photos or click to browse. JPEG, PNG, WebP, and HEIC formats supported.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  Upload multiple photos at once. We&apos;ll automatically extract location and date information.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Photos ({photos.length})
              </span>
              <Button
                onClick={uploadAllPhotos}
                disabled={uploading || photos.every(p => p.uploadStatus === 'completed')}
                className="ml-auto"
              >
                {uploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo, index) => (
                <div key={index} className="space-y-4">
                  <div className="relative group">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image
                        src={photo.preview}
                        alt={`Upload ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Status Overlay */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      {getStatusIcon(photo.uploadStatus)}
                      <span className="capitalize">{photo.uploadStatus}</span>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {photo.uploadStatus === 'uploading' && (
                    <Progress value={photo.uploadProgress} className="w-full" />
                  )}

                  {/* Error Message */}
                  {photo.uploadStatus === 'error' && photo.uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600 text-sm mb-2">{photo.uploadError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => uploadPhoto(photo, index)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Retry Upload
                      </Button>
                    </div>
                  )}

                  {/* Caption */}
                  <div className="space-y-2">
                    <Label htmlFor={`caption-${index}`}>Caption</Label>
                    <Textarea
                      id={`caption-${index}`}
                      value={photo.caption}
                      onChange={(e) => updateCaption(index, e.target.value)}
                      placeholder="Add a caption for this photo..."
                      rows={2}
                      disabled={uploading}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <LocationSearch
                      value={photo.manualLocation}
                      onChange={(location) => updateLocation(index, location)}
                      placeholder={
                        photo.exifData?.latitude && photo.exifData?.longitude
                          ? "Override GPS location or search..."
                          : "Search for location..."
                      }
                      allowCurrentLocation={true}
                    />
                    {photo.exifData?.latitude && photo.exifData?.longitude && !photo.manualLocation && (
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Using GPS from photo: {photo.exifData.latitude.toFixed(6)}, {photo.exifData.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>

                  {/* EXIF Info */}
                  {photo.exifData && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {photo.exifData.dateTime && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(photo.exifData.dateTime).toLocaleDateString()}</span>
                        </div>
                      )}
                      {(photo.manualLocation || (photo.exifData.latitude && photo.exifData.longitude)) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {photo.manualLocation
                              ? `Manual: ${photo.manualLocation.display_name.substring(0, 30)}...`
                              : "GPS location detected"
                            }
                          </span>
                        </div>
                      )}
                      {photo.exifData.cameraMake && (
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          <span>{photo.exifData.cameraMake} {photo.exifData.cameraModel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}