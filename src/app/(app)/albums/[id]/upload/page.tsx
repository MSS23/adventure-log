'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
  CheckCircle2,
  Globe,
  Eye,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { LocationSearch } from '@/components/location/LocationSearch'
import { log } from '@/lib/utils/logger'
import { uploadPhoto as uploadToStorage, getUploadErrorMessage, filterPhotosPayload } from '@/lib/utils/storage'
import { Native } from '@/lib/utils/native'
import { Platform } from '@/lib/utils/platform'
import { extractPhotoLocation } from '@/lib/utils/exif-extraction'

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
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error' | 'duplicate'
  uploadError?: string
  fileHash?: string
  isDuplicate?: boolean
}

export default function PhotoUploadPage() {
  const params = useParams()
  const albumId = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { user, profile, profileLoading } = useAuth()
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState(0)
  const [existingPhotoHashes, setExistingPhotoHashes] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Calculate file hash for duplicate detection
  const calculateFileHash = useCallback(async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }, [])

  // Load existing photo hashes for duplicate detection
  useEffect(() => {
    const loadExistingHashes = async () => {
      try {
        const { data: existingPhotos, error } = await supabase
          .from('photos')
          .select('file_hash')
          .eq('album_id', albumId)
          .not('file_hash', 'is', null)

        if (error) {
          log.warn('Failed to load existing photo hashes', {
            component: 'PhotoUploadPage',
            action: 'loadExistingHashes',
            error: error.message
          })
          return
        }

        const hashes = new Set(existingPhotos.map(photo => photo.file_hash).filter(Boolean))
        setExistingPhotoHashes(hashes)

        log.debug('Loaded existing photo hashes', {
          component: 'PhotoUploadPage',
          action: 'loadExistingHashes',
          hashCount: hashes.size
        })
      } catch (err) {
        log.error('Error loading existing photo hashes', {
          component: 'PhotoUploadPage',
          action: 'loadExistingHashes',
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    if (albumId) {
      loadExistingHashes()
    }
  }, [albumId, supabase])

  const extractExifData = useCallback(async (file: File): Promise<PhotoFile['exifData']> => {

    try {
      // Use the enhanced EXIF extraction utility
      const locationData = await extractPhotoLocation(file, {
        timeout: 8000,
        fallbackEnabled: true,
        validateCoordinates: true
      })


      // Convert to legacy format for compatibility
      const exifData: PhotoFile['exifData'] = {}

      if (locationData?.latitude && locationData?.longitude) {
        exifData.latitude = locationData.latitude
        exifData.longitude = locationData.longitude
      }

      // Log successful location extraction
      if (exifData.latitude && exifData.longitude) {
        log.info('Photo location extracted successfully', {
          component: 'PhotoUploadPage',
          action: 'extractExifData',
          fileName: file.name,
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          accuracy: locationData?.accuracy
        })
      }

      return exifData

    } catch (err) {

      log.debug('Enhanced EXIF extraction failed - photo will be uploaded without location metadata', {
        component: 'PhotoUploadPage',
        action: 'extractExifData',
        fileName: file.name,
        error: err
      })

      // Return empty object - this should not block upload
      return {}
    }
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    log.debug('Processing dropped files', {
      component: 'PhotoUploadPage',
      action: 'onDrop',
      fileCount: acceptedFiles.length,
      files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    })

    const newPhotos: PhotoFile[] = []

    for (const file of acceptedFiles) {
      log.debug('Processing file', {
        component: 'PhotoUploadPage',
        action: 'processFile',
        fileName: file.name
      })
      const preview = URL.createObjectURL(file)

      // Calculate file hash for duplicate detection
      let fileHash = ''
      let isDuplicate = false
      try {
        fileHash = await calculateFileHash(file)
        isDuplicate = existingPhotoHashes.has(fileHash)

        log.debug('File hash calculated', {
          component: 'PhotoUploadPage',
          action: 'calculateFileHash',
          fileName: file.name,
          fileHash: fileHash.substring(0, 8) + '...', // Log only first 8 chars for privacy
          isDuplicate
        })
      } catch (error) {
        log.warn('Failed to calculate file hash', {
          component: 'PhotoUploadPage',
          action: 'calculateFileHash',
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Extract EXIF data but don't let it block the process
      let exifData: PhotoFile['exifData'] = {}
      try {
        exifData = await extractExifData(file) || {}
        log.debug('EXIF processed successfully', {
          component: 'PhotoUploadPage',
          action: 'extractExifData',
          fileName: file.name
        })
      } catch (error) {
        log.warn('EXIF processing failed for file', {
          component: 'PhotoUploadPage',
          action: 'extractExifData',
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue without EXIF data
        exifData = {}
      }

      newPhotos.push({
        file,
        preview,
        caption: '',
        manualLocation: null,
        exifData,
        uploadProgress: 0,
        uploadStatus: isDuplicate ? 'duplicate' : 'pending',
        fileHash,
        isDuplicate
      })
    }

    log.debug('All files processed', {
      component: 'PhotoUploadPage',
      action: 'onDrop',
      photoCount: newPhotos.length
    })
    setPhotos(prev => [...prev, ...newPhotos])
  }, [extractExifData])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.heic']
    },
    multiple: true,
    onError: (error) => {
      log.error('Dropzone error occurred', {
        component: 'PhotoUploadPage',
        action: 'dropzone',
        error: error instanceof Error ? error.message : String(error)
      })
    },
    onDropRejected: (rejectedFiles) => {
      log.warn('Files rejected by dropzone', {
        component: 'PhotoUploadPage',
        action: 'dropzone',
        rejectedFiles: rejectedFiles.map(f => ({
          file: f.file.name,
          errors: f.errors.map(e => e.message)
        }))
      })
    }
  })

  const handleNativeCamera = useCallback(async (source: 'camera' | 'photos' = 'camera') => {
    try {
      setError(null)

      // Request permissions first on native platforms
      if (Platform.isNative()) {
        const permissions = await Native.requestPermissions(['camera'])
        if (!permissions.camera) {
          await Native.showToast('Camera permission is required to take photos')
          return
        }
      }

      log.debug('Taking photo with native camera', {
        component: 'PhotoUploadPage',
        action: 'takePhoto'
      })
      const imageUri = await Native.takePhoto({
        quality: 90,
        allowEditing: true,
        resultType: 'uri',
        source: source
      })

      log.debug('Native camera result received', {
        component: 'PhotoUploadPage',
        action: 'takePhoto',
        hasResult: !!imageUri
      })

      // Convert the image URI to a File object for consistency with dropzone
      let file: File
      if (Platform.isNative() && imageUri.startsWith('file://') || imageUri.startsWith('capacitor://')) {
        // For native platforms, we need to create a File object from the URI
        // This is a simplified approach - in production you might want more robust handling
        const response = await fetch(imageUri)
        const blob = await response.blob()
        file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      } else if (imageUri.startsWith('data:')) {
        // Base64 data URL
        const response = await fetch(imageUri)
        const blob = await response.blob()
        file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      } else {
        // Blob URL from web
        const response = await fetch(imageUri)
        const blob = await response.blob()
        file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      }

      log.debug('Created File object from camera', {
        component: 'PhotoUploadPage',
        action: 'takePhoto',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      // Use the same processing as dropzone
      const preview = URL.createObjectURL(file)

      // Try to get location if on native platform
      let locationData: LocationData | null = null
      try {
        if (Platform.isNative()) {
          const location = await Native.getCurrentLocation(5000)
          locationData = {
            latitude: location.latitude,
            longitude: location.longitude,
            display_name: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
          }
          log.debug('Got location data for camera photo', {
            component: 'PhotoUploadPage',
            action: 'takePhoto',
            latitude: locationData.latitude,
            longitude: locationData.longitude
          })
        }
      } catch (locationError) {
        log.warn('Could not get location for camera photo', {
          component: 'PhotoUploadPage',
          action: 'takePhoto',
          error: locationError instanceof Error ? locationError.message : String(locationError)
        })
        // Continue without location - this is not critical
      }

      // Extract EXIF data
      let exifData: PhotoFile['exifData'] = {}
      try {
        exifData = await extractExifData(file) || {}
        log.debug('EXIF processed for camera photo', {
          component: 'PhotoUploadPage',
          action: 'takePhoto'
        })
      } catch (error) {
        log.warn('EXIF processing failed for camera photo', {
          component: 'PhotoUploadPage',
          action: 'takePhoto',
          error: error instanceof Error ? error.message : String(error)
        })
        exifData = {}
      }

      const newPhoto: PhotoFile = {
        file,
        preview,
        caption: '',
        manualLocation: locationData,
        exifData,
        uploadProgress: 0,
        uploadStatus: 'pending'
      }

      log.debug('Adding camera photo to photos list', {
        component: 'PhotoUploadPage',
        action: 'takePhoto'
      })
      setPhotos(prev => [...prev, newPhoto])

      await Native.showToast('Photo captured successfully!')
    } catch (error) {
      log.error('Native camera error occurred', {
        component: 'PhotoUploadPage',
        action: 'takePhoto',
        error: error instanceof Error ? error.message : String(error)
      })
      const errorMessage = error instanceof Error ? error.message : 'Failed to take photo'
      setError(errorMessage)
      await Native.showToast(`Camera error: ${errorMessage}`)
    }
  }, [extractExifData])


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
    log.debug('Starting photo upload', {
      component: 'PhotoUploadPage',
      action: 'uploadPhoto',
      photoIndex: index + 1,
      fileName: photo.file.name,
      fileSize: photo.file.size,
      fileType: photo.file.type,
      isDuplicate: photo.isDuplicate
    })

    // Skip duplicates
    if (photo.isDuplicate) {
      log.info('Skipping duplicate photo upload', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        photoIndex: index + 1,
        fileName: photo.file.name,
        fileHash: photo.fileHash?.substring(0, 8) + '...'
      })

      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'duplicate'
        newPhotos[index].uploadProgress = 100
        newPhotos[index].uploadError = 'This photo already exists in the album'
        return newPhotos
      })

      return false // Don't count as success for upload completion
    }

    try {
      // Update status to uploading
      setPhotos(prev => {
        const newPhotos = [...prev]
        newPhotos[index].uploadStatus = 'uploading'
        newPhotos[index].uploadProgress = 0
        newPhotos[index].uploadError = undefined
        return newPhotos
      })

      // Get current user with proper auth method
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }
      if (!currentUser) {
        throw new Error('User not authenticated. Please sign in to upload photos.')
      }

      log.debug('Calling uploadToStorage', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        photoIndex: index + 1
      })
      // Upload using storage helper with retry logic
      const publicUrl = await uploadToStorage(photo.file, currentUser.id)
      log.debug('Upload successful', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        photoIndex: index + 1,
        publicUrl
      })

      // Determine which location to use (manual location overrides EXIF)
      const finalLatitude = photo.manualLocation?.latitude ?? photo.exifData?.latitude ?? null
      const finalLongitude = photo.manualLocation?.longitude ?? photo.exifData?.longitude ?? null

      // Prepare EXIF data with camera info and metadata
      const exifDataForDb = {
        ...photo.exifData,
        cameraMake: photo.exifData?.cameraMake,
        cameraModel: photo.exifData?.cameraModel,
        mimeType: photo.file.type,
        orderIndex: index,
        fileName: photo.file.name
      }

      // Create database payload and filter to only valid columns
      const rawPayload = {
        album_id: albumId,
        user_id: currentUser.id,
        file_path: publicUrl,
        caption: photo.caption || null,
        taken_at: photo.exifData?.dateTime || null,
        latitude: finalLatitude,
        longitude: finalLongitude,
        file_size: photo.file.size,
        exif_data: exifDataForDb,
        order_index: index,
        processing_status: 'completed' as const,
        file_hash: photo.fileHash || null
      }

      const filteredPayload = filterPhotosPayload(rawPayload)

      log.debug('Saving photo to database', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        photoIndex: index + 1,
        albumId: albumId,
        userId: currentUser.id,
        filePath: publicUrl
      })

      // Save photo record to database with proper error handling
      const { data: insertedPhoto, error: dbError } = await supabase
        .from('photos')
        .insert(filteredPayload)
        .select()
        .single()

      if (dbError) {
        // Handle PGRST204 column not found errors with friendly messages
        if (dbError.code === 'PGRST204' && dbError.message.includes("Could not find the '")) {
          const columnMatch = dbError.message.match(/Could not find the '(.+?)' column/)
          const missingColumn = columnMatch ? columnMatch[1] : 'unknown'
          throw new Error(`Missing DB column: ${missingColumn}. Remove it from the insert or add it to the table.`)
        }
        throw dbError
      }

      log.debug('Database insert successful', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        photoIndex: index + 1,
        insertedPhotoId: insertedPhoto?.id
      })

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
        photoIndex: index + 1,
        error: err instanceof Error ? err.message : String(err)
      })

      log.error('Photo upload failed', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        albumId: albumId,
        fileName: photo.file.name,
        fileSize: photo.file.size,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))

      // Use the improved error message helper
      const errorMessage = getUploadErrorMessage(err)
      log.debug('Generated user-friendly error message', {
        component: 'PhotoUploadPage',
        action: 'uploadPhoto',
        photoIndex: index + 1,
        errorMessage
      })

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
    const duplicateCount = photos.filter(photo => photo.isDuplicate).length
    const eligibleCount = photos.length - duplicateCount

    setUploading(false)

    if (successCount === eligibleCount) {
      // All non-duplicate photos uploaded successfully
      setUploadedPhotoCount(successCount)
      setShowChoiceModal(true)
    } else if (successCount > 0) {
      const message = duplicateCount > 0
        ? `${successCount}/${eligibleCount} photos uploaded successfully (${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped). Please retry failed uploads.`
        : `${successCount}/${photos.length} photos uploaded successfully. Please retry failed uploads.`
      setError(message)
    } else {
      const message = duplicateCount === photos.length
        ? `All ${duplicateCount} photo${duplicateCount !== 1 ? 's are' : ' is'} duplicate${duplicateCount !== 1 ? 's' : ''}. No new photos to upload.`
        : 'No photos were uploaded successfully. Please check for errors and retry.'
      setError(message)
    }
  }

  // Navigation functions for post-upload choices
  const goToAlbum = () => {
    setShowChoiceModal(false)
    router.push(`/albums/${albumId}`)
  }

  const goToGlobe = () => {
    setShowChoiceModal(false)
    router.push('/globe')
  }

  // Remove photo from upload list
  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev]
      // Clean up preview URL to prevent memory leaks
      if (newPhotos[index].preview) {
        URL.revokeObjectURL(newPhotos[index].preview)
      }
      newPhotos.splice(index, 1)
      return newPhotos
    })

    log.debug('Photo removed from upload list', {
      component: 'PhotoUploadPage',
      action: 'removePhoto',
      photoIndex: index
    })
  }

  const getStatusIcon = (status: PhotoFile['uploadStatus']) => {
    switch (status) {
      case 'pending':
        return <Camera className="h-4 w-4 text-gray-700" />
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'duplicate':
        return <X className="h-4 w-4 text-yellow-600" />
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
              <p className="mt-2 text-sm text-gray-800">Loading profile...</p>
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
                <Link href={`/albums/${albumId}`}>
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
        <Link href={`/albums/${albumId}`} className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Album
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
          <p className="text-gray-800">Add photos to your adventure album</p>
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
            <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-700" />
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">Drop photos here...</p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag photos here or click to browse
                </p>
                <p className="text-sm text-gray-800">
                  Upload multiple photos at once. We&apos;ll automatically extract location and date information.
                </p>
              </>
            )}
          </div>

          {/* Native Camera Buttons */}
          {Platform.isNative() && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-800 mb-4">
                  Or use your device camera
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleNativeCamera('camera')}
                    className="flex items-center gap-2"
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleNativeCamera('photos')}
                    className="flex items-center gap-2"
                    disabled={uploading}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Choose from Gallery
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                {photos.some(p => p.isDuplicate) && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {photos.filter(p => p.isDuplicate).length} duplicate{photos.filter(p => p.isDuplicate).length !== 1 ? 's' : ''}
                  </Badge>
                )}
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
                        className={cn(
                          "object-cover transition-all",
                          photo.isDuplicate ? "opacity-60 grayscale" : ""
                        )}
                      />

                      {/* Duplicate Overlay */}
                      {photo.isDuplicate && (
                        <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                          <div className="bg-yellow-600 text-white px-2 py-1 rounded-md text-sm font-medium shadow-lg">
                            ⚠️ Duplicate
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Status Overlay */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
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

                  {/* Duplicate Warning */}
                  {photo.uploadStatus === 'duplicate' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-yellow-800 text-sm font-medium mb-1">Duplicate Photo Detected</p>
                          <p className="text-yellow-700 text-sm mb-3">
                            This photo already exists in your album. We&apos;ve automatically skipped uploading it to prevent duplicates.
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removePhoto(index)}
                              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                            >
                              Remove from List
                            </Button>
                          </div>
                        </div>
                      </div>
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
                      <p className="text-sm text-gray-800 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Using GPS from photo: {photo.exifData.latitude.toFixed(6)}, {photo.exifData.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>

                  {/* EXIF Info */}
                  {photo.exifData && (
                    <div className="text-sm text-gray-800 space-y-1">
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

      {/* Post-Upload Choice Modal */}
      <Dialog open={showChoiceModal} onOpenChange={setShowChoiceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="text-center mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-green-800">
                Upload Complete! 🎉
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Success Summary */}
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Successfully uploaded {uploadedPhotoCount} photo{uploadedPhotoCount !== 1 ? 's' : ''} to your album
              </p>

              {/* Success Stats */}
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{uploadedPhotoCount}</div>
                  <div className="text-sm text-gray-600">Photos Added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm text-gray-600">All Processed</div>
                </div>
              </div>
            </div>

            {/* Choice Description */}
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">What would you like to do next?</h3>
              <p className="text-sm text-gray-600 mb-6">
                View your updated album or explore your travel journey on the globe
              </p>
            </div>

            {/* Choice Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={goToAlbum}
                className="h-20 flex flex-col items-center justify-center gap-2 text-center bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="h-6 w-6" />
                <div>
                  <div className="font-semibold">View Album</div>
                  <div className="text-xs opacity-90">See your photos</div>
                </div>
              </Button>

              <Button
                onClick={goToGlobe}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 text-center border-2 hover:bg-purple-50"
              >
                <Globe className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="font-semibold text-purple-600">Explore Globe</div>
                  <div className="text-xs text-purple-600">See your journey</div>
                </div>
              </Button>
            </div>

            {/* Additional Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Star className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Your photos are now live!</p>
                  <p>They&apos;ve been automatically organized by location and date for easy discovery.</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}