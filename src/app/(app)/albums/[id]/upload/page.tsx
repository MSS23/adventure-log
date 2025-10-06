'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Camera,
  Loader2,
  X,
  MapPin,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Upload,
  FileImage
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { extractPhotoExif, type ExifData } from '@/lib/utils/exif-extraction'
import { Toast } from '@capacitor/toast'
import type { Album } from '@/types/database'

interface PhotoUpload {
  id: string
  file: File
  preview: string
  exif?: ExifData
  caption?: string
  location?: string
  uploading: boolean
  uploaded: boolean
  error?: string
  progress: number
}

export default function UploadPhotosPage() {
  const router = useRouter()
  const params = useParams()
  const albumId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()

  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<PhotoUpload[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [overallProgress, setOverallProgress] = useState(0)

  // Load album data
  useEffect(() => {
    const loadAlbum = async () => {
      if (!albumId) return

      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single()

      if (error) {
        log.error('Failed to load album', { error, albumId })
        await Toast.show({
          text: 'Failed to load album',
          duration: 'short',
          position: 'bottom'
        })
        router.push('/albums')
        return
      }

      if (data.user_id !== user?.id) {
        await Toast.show({
          text: 'You do not have permission to upload to this album',
          duration: 'short',
          position: 'bottom'
        })
        router.push(`/albums/${albumId}`)
        return
      }

      setAlbum(data)
    }

    loadAlbum()
  }, [albumId, supabase, user, router])

  // Handle file drop
  const onDrop = async (acceptedFiles: File[]) => {
    setIsProcessing(true)

    const newPhotos: PhotoUpload[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
      progress: 0
    }))

    setPhotos(prev => [...prev, ...newPhotos])

    // Extract EXIF data in background
    for (const photo of newPhotos) {
      try {
        log.info('Extracting EXIF data', {
          component: 'UploadPhotosPage',
          fileName: photo.file.name
        })

        const exif = await extractPhotoExif(photo.file)

        setPhotos(prev =>
          prev.map(p =>
            p.id === photo.id
              ? {
                  ...p,
                  exif,
                  location: exif.location?.latitude && exif.location?.longitude
                    ? `${exif.location.latitude.toFixed(6)}, ${exif.location.longitude.toFixed(6)}`
                    : undefined
                }
              : p
          )
        )

        log.info('EXIF extraction complete', {
          component: 'UploadPhotosPage',
          fileName: photo.file.name,
          hasLocation: !!(exif.location?.latitude && exif.location?.longitude),
          hasCamera: !!(exif.camera?.make || exif.camera?.model),
          hasDateTime: !!(exif.dateTime?.dateTimeOriginal)
        })
      } catch (error) {
        log.error('EXIF extraction failed', {
          component: 'UploadPhotosPage',
          fileName: photo.file.name,
          error
        })
      }
    }

    setIsProcessing(false)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    },
    multiple: true,
    disabled: isUploading
  })

  // Remove photo
  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId)
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter(p => p.id !== photoId)
    })
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null)
    }
  }

  // Update photo caption
  const updateCaption = (photoId: string, caption: string) => {
    setPhotos(prev =>
      prev.map(p => (p.id === photoId ? { ...p, caption } : p))
    )
  }

  // Upload all photos
  const uploadPhotos = async () => {
    if (!album || !user) return

    setIsUploading(true)
    let uploadedCount = 0
    const totalPhotos = photos.filter(p => !p.uploaded).length

    for (const photo of photos) {
      if (photo.uploaded) continue

      try {
        // Update photo state to uploading
        setPhotos(prev =>
          prev.map(p => (p.id === photo.id ? { ...p, uploading: true, progress: 0 } : p))
        )

        const fileExt = photo.file.name.split('.').pop()
        const fileName = `${album.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

        // Upload to Supabase storage with progress tracking
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Simulate progress (Supabase doesn't provide upload progress)
        setPhotos(prev =>
          prev.map(p => (p.id === photo.id ? { ...p, progress: 50 } : p))
        )

        // Prepare photo metadata
        const photoData: Record<string, unknown> = {
          album_id: album.id,
          user_id: user.id,
          file_path: fileName,
          caption: photo.caption || null,
          order_index: photos.indexOf(photo),
          created_at: new Date().toISOString()
        }

        // Add EXIF data if available
        if (photo.exif) {
          photoData.exif_data = photo.exif

          // Extract GPS coordinates
          if (photo.exif.location?.latitude && photo.exif.location?.longitude) {
            photoData.latitude = photo.exif.location.latitude
            photoData.longitude = photo.exif.location.longitude
            photoData.altitude = photo.exif.location.altitude || null
          }

          // Extract camera data
          if (photo.exif.camera?.make || photo.exif.camera?.model) {
            photoData.camera_make = photo.exif.camera.make || null
            photoData.camera_model = photo.exif.camera.model || null
          }

          // Extract date taken
          if (photo.exif.dateTime?.dateTimeOriginal) {
            photoData.taken_at = photo.exif.dateTime.dateTimeOriginal
          }
        }

        // Insert photo record
        const { error: insertError } = await supabase
          .from('photos')
          .insert(photoData)

        if (insertError) throw insertError

        // Update photo state to uploaded
        setPhotos(prev =>
          prev.map(p =>
            p.id === photo.id
              ? { ...p, uploading: false, uploaded: true, progress: 100 }
              : p
          )
        )

        uploadedCount++
        setOverallProgress((uploadedCount / totalPhotos) * 100)

        log.info('Photo uploaded successfully', {
          component: 'UploadPhotosPage',
          albumId: album.id,
          fileName: photo.file.name,
          hasExif: !!photo.exif,
          hasLocation: !!(photo.exif?.location?.latitude && photo.exif?.location?.longitude)
        })
      } catch (error) {
        log.error('Photo upload failed', {
          component: 'UploadPhotosPage',
          albumId: album.id,
          fileName: photo.file.name,
          error
        })

        setPhotos(prev =>
          prev.map(p =>
            p.id === photo.id
              ? {
                  ...p,
                  uploading: false,
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : p
          )
        )
      }
    }

    setIsUploading(false)

    // Update album status to published if it was a draft
    if (album.status === 'draft') {
      await supabase
        .from('albums')
        .update({ status: 'published' })
        .eq('id', album.id)
    }

    await Toast.show({
      text: `Successfully uploaded ${uploadedCount} photo${uploadedCount !== 1 ? 's' : ''}!`,
      duration: 'long',
      position: 'bottom'
    })

    router.push(`/albums/${album.id}`)
  }

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId)
  const uploadedPhotos = photos.filter(p => p.uploaded).length
  const failedPhotos = photos.filter(p => p.error).length
  const pendingPhotos = photos.filter(p => !p.uploaded && !p.error).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
          <Link href={`/albums/${albumId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Upload Photos</h1>
          <Button
            onClick={uploadPhotos}
            disabled={isUploading || photos.length === 0 || photos.every(p => p.uploaded)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
            size="sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {pendingPhotos > 0 ? `(${pendingPhotos})` : ''}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Album Info */}
        {album && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {album.title}
              </CardTitle>
              <CardDescription>
                Add photos to your album
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading photos...</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{photos.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">{uploadedPhotos}</div>
                <div className="text-sm text-gray-600">Uploaded</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-orange-600">{pendingPhotos}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <Card>
              <CardContent className="pt-6">
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                >
                  <input {...getInputProps()} />
                  <FileImage className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-base font-medium text-blue-600">Drop photos here</p>
                  ) : (
                    <div>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        Tap to add photos or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        JPEG, PNG, WebP, HEIC supported
                      </p>
                      {isProcessing && (
                        <p className="text-sm text-blue-600 mt-2 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing EXIF data...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Photos ({photos.length})</span>
                    {failedPhotos > 0 && (
                      <Badge variant="destructive">{failedPhotos} failed</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className={cn(
                          "relative aspect-square group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                          selectedPhotoId === photo.id
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-transparent hover:border-gray-300",
                          photo.uploaded && "opacity-70"
                        )}
                        onClick={() => setSelectedPhotoId(photo.id)}
                      >
                        <Image
                          src={photo.preview}
                          alt={photo.file.name}
                          fill
                          className="object-cover"
                        />

                        {/* Status Overlay */}
                        {photo.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        )}

                        {photo.uploaded && (
                          <div className="absolute top-2 left-2">
                            <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                          </div>
                        )}

                        {photo.error && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                          </div>
                        )}

                        {/* EXIF Badges */}
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {photo.exif?.location?.latitude && photo.exif?.location?.longitude && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                          {photo.exif?.dateTime?.dateTimeOriginal && (
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Date
                            </Badge>
                          )}
                        </div>

                        {/* Remove Button */}
                        {!photo.uploading && !photo.uploaded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removePhoto(photo.id)
                            }}
                            className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Photo Details Panel */}
          <div className="space-y-6">
            {selectedPhoto ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Photo Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Preview */}
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={selectedPhoto.preview}
                        alt={selectedPhoto.file.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Caption */}
                    <div className="space-y-2">
                      <Label htmlFor="caption">Caption</Label>
                      <Textarea
                        id="caption"
                        value={selectedPhoto.caption || ''}
                        onChange={(e) => updateCaption(selectedPhoto.id, e.target.value)}
                        placeholder="Add a caption..."
                        rows={3}
                        disabled={selectedPhoto.uploaded || selectedPhoto.uploading}
                      />
                    </div>

                    {/* EXIF Info */}
                    {selectedPhoto.exif && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-medium text-sm">EXIF Data</h4>

                        {/* Location */}
                        {selectedPhoto.exif.location?.latitude && selectedPhoto.exif.location?.longitude && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">Location</span>
                            </div>
                            <p className="text-xs text-gray-800 pl-6">
                              {selectedPhoto.exif.location.latitude.toFixed(6)}, {selectedPhoto.exif.location.longitude.toFixed(6)}
                            </p>
                            {selectedPhoto.exif.location.altitude && (
                              <p className="text-xs text-gray-600 pl-6">
                                Altitude: {selectedPhoto.exif.location.altitude.toFixed(0)}m
                              </p>
                            )}
                          </div>
                        )}

                        {/* Camera */}
                        {(selectedPhoto.exif.camera?.make || selectedPhoto.exif.camera?.model) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Camera className="h-4 w-4" />
                              <span className="font-medium">Camera</span>
                            </div>
                            <p className="text-xs text-gray-800 pl-6">
                              {selectedPhoto.exif.camera.make} {selectedPhoto.exif.camera.model}
                            </p>
                            {selectedPhoto.exif.camera.lens && (
                              <p className="text-xs text-gray-600 pl-6">{selectedPhoto.exif.camera.lens}</p>
                            )}
                          </div>
                        )}

                        {/* Date */}
                        {selectedPhoto.exif.dateTime?.dateTimeOriginal && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">Date Taken</span>
                            </div>
                            <p className="text-xs text-gray-800 pl-6">
                              {new Date(selectedPhoto.exif.dateTime.dateTimeOriginal).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error */}
                    {selectedPhoto.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        {selectedPhoto.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a photo to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
