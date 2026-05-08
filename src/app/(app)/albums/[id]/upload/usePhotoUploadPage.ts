'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { extractPhotoExif, type ExifData } from '@/lib/utils/exif-extraction'
import { hashFile } from '@/lib/utils/file-hash'
import { Toast } from '@capacitor/toast'
import type { Album, Photo } from '@/types/database'

export interface PhotoUpload {
  id: string
  file: File
  preview: string
  exif?: ExifData | null
  fileHash?: string | null
  isDuplicate?: boolean | null
  duplicateOf?: Photo
  caption?: string
  location?: string
  uploading: boolean
  uploaded: boolean
  error?: string
  progress: number
}

export function usePhotoUploadPage() {
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
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name'>('date-desc')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())

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

    // Extract EXIF data and hash files in background
    for (const photo of newPhotos) {
      try {
        log.info('Processing photo', {
          component: 'UploadPhotosPage',
          fileName: photo.file.name
        })

        const fileHash = await hashFile(photo.file)

        const { data: existingPhotos } = await supabase
          .from('photos')
          .select('id, file_path, album_id, albums!inner(title)')
          .eq('user_id', user?.id)
          .eq('file_hash', fileHash)
          .limit(1)

        const isDuplicate = existingPhotos && existingPhotos.length > 0
        const duplicateOf = isDuplicate ? existingPhotos[0] as unknown as Photo : undefined

        const exif = await extractPhotoExif(photo.file)

        setPhotos(prev =>
          prev.map(p =>
            p.id === photo.id
              ? {
                  ...p,
                  exif,
                  fileHash,
                  isDuplicate,
                  duplicateOf,
                  location: exif.location?.latitude && exif.location?.longitude
                    ? `${exif.location.latitude.toFixed(6)}, ${exif.location.longitude.toFixed(6)}`
                    : undefined
                }
              : p
          )
        )

        log.info('Photo processing complete', {
          component: 'UploadPhotosPage',
          fileName: photo.file.name,
          hasLocation: !!(exif.location?.latitude && exif.location?.longitude),
          hasCamera: !!(exif.camera?.make || exif.camera?.model),
          hasDateTime: !!(exif.dateTime?.dateTimeOriginal),
          isDuplicate
        })
      } catch (error) {
        log.error('Photo processing failed', {
          component: 'UploadPhotosPage',
          fileName: photo.file.name,
          error
        })
      }
    }

    setIsProcessing(false)
  }

  const dropzone = useDropzone({
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

  // Bulk edit functions
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const selectAllPhotos = () => {
    setSelectedPhotoIds(new Set(photos.filter(p => !p.uploaded).map(p => p.id)))
  }

  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set())
  }

  const bulkUpdateCaptions = (caption: string) => {
    setPhotos(prev =>
      prev.map(p =>
        selectedPhotoIds.has(p.id) && !p.uploaded ? { ...p, caption } : p
      )
    )
    Toast.show({
      text: `Updated ${selectedPhotoIds.size} photo captions`,
      duration: 'short',
      position: 'bottom'
    })
  }

  const bulkRemovePhotos = () => {
    selectedPhotoIds.forEach(id => {
      const photo = photos.find(p => p.id === id)
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview)
      }
    })
    setPhotos(prev => prev.filter(p => !selectedPhotoIds.has(p.id)))
    setSelectedPhotoIds(new Set())
    setBulkEditMode(false)
    Toast.show({
      text: 'Removed selected photos',
      duration: 'short',
      position: 'bottom'
    })
  }

  // Upload all photos
  const uploadPhotos = async () => {
    if (!album || !user) return

    setIsUploading(true)
    let uploadedCount = 0
    let skippedDuplicates = 0
    const totalPhotos = photos.filter(p => !p.uploaded && !p.isDuplicate).length

    for (const photo of photos) {
      if (photo.uploaded) continue

      if (photo.isDuplicate) {
        skippedDuplicates++
        continue
      }

      try {
        setPhotos(prev =>
          prev.map(p => (p.id === photo.id ? { ...p, uploading: true, progress: 0 } : p))
        )

        const fileExt = photo.file.name.split('.').pop()
        const fileName = `${album.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        setPhotos(prev =>
          prev.map(p => (p.id === photo.id ? { ...p, progress: 50 } : p))
        )

        const photoData: Record<string, unknown> = {
          album_id: album.id,
          user_id: user.id,
          file_path: fileName,
          file_hash: photo.fileHash || null,
          caption: photo.caption || null,
          order_index: photos.indexOf(photo),
          created_at: new Date().toISOString()
        }

        if (photo.exif) {
          photoData.exif_data = photo.exif

          if (photo.exif.location?.latitude && photo.exif.location?.longitude) {
            photoData.latitude = photo.exif.location.latitude
            photoData.longitude = photo.exif.location.longitude
            photoData.altitude = photo.exif.location.altitude || null
          }

          if (photo.exif.camera?.make || photo.exif.camera?.model) {
            photoData.camera_make = photo.exif.camera.make || null
            photoData.camera_model = photo.exif.camera.model || null
          }

          if (photo.exif.camera?.iso) {
            photoData.iso = photo.exif.camera.iso
          }
          if (photo.exif.camera?.aperture) {
            photoData.aperture = photo.exif.camera.aperture.toString()
          }
          if (photo.exif.camera?.shutterSpeed) {
            photoData.shutter_speed = photo.exif.camera.shutterSpeed
          }

          if (photo.exif.dateTime?.dateTimeOriginal) {
            photoData.taken_at = photo.exif.dateTime.dateTimeOriginal
          }
        }

        const { error: insertError } = await supabase
          .from('photos')
          .insert(photoData)

        if (insertError) throw insertError

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

    // Update album status and cover
    if (album.status === 'draft') {
      const updates: { status: string; cover_photo_url?: string } = {
        status: 'published'
      }

      if (!album.cover_photo_url && photos.length > 0) {
        const firstUploadedPhoto = photos.find(p => p.uploaded)
        if (firstUploadedPhoto) {
          const { data: photoData } = await supabase
            .from('photos')
            .select('file_path')
            .eq('album_id', album.id)
            .order('order_index', { ascending: true })
            .limit(1)
            .single()

          if (photoData?.file_path) {
            updates.cover_photo_url = photoData.file_path
          }
        }
      }

      await supabase
        .from('albums')
        .update(updates)
        .eq('id', album.id)
    }

    let message = `Successfully uploaded ${uploadedCount} photo${uploadedCount !== 1 ? 's' : ''}!`
    if (skippedDuplicates > 0) {
      message += ` (${skippedDuplicates} duplicate${skippedDuplicates !== 1 ? 's' : ''} skipped)`
    }

    await Toast.show({
      text: message,
      duration: 'long',
      position: 'bottom'
    })

    router.push(`/albums/${album.id}`)
  }

  // Sort and filter photos
  const sortedAndFilteredPhotos = useMemo(() => {
    let filtered = photos

    if (dateFilter) {
      filtered = filtered.filter(photo => {
        const photoDate = photo.exif?.dateTime?.dateTimeOriginal
        if (!photoDate) return false
        const dateStr = new Date(photoDate).toISOString().split('T')[0]
        return dateStr === dateFilter
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date-asc' || sortBy === 'date-desc') {
        const dateA = a.exif?.dateTime?.dateTimeOriginal
        const dateB = b.exif?.dateTime?.dateTimeOriginal

        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1

        const timeA = new Date(dateA).getTime()
        const timeB = new Date(dateB).getTime()

        return sortBy === 'date-asc' ? timeA - timeB : timeB - timeA
      } else {
        return a.file.name.localeCompare(b.file.name)
      }
    })

    return sorted
  }, [photos, sortBy, dateFilter])

  // Group photos by date for display
  const photosByDate = useMemo(() => {
    const groups: Record<string, PhotoUpload[]> = {}

    sortedAndFilteredPhotos.forEach(photo => {
      const date = photo.exif?.dateTime?.dateTimeOriginal
      const dateStr = date
        ? new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : 'No date'

      if (!groups[dateStr]) {
        groups[dateStr] = []
      }
      groups[dateStr].push(photo)
    })

    return groups
  }, [sortedAndFilteredPhotos])

  // Get unique dates for filter dropdown
  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    photos.forEach(photo => {
      const date = photo.exif?.dateTime?.dateTimeOriginal
      if (date) {
        const dateStr = new Date(date).toISOString().split('T')[0]
        dates.add(dateStr)
      }
    })
    return Array.from(dates).sort().reverse()
  }, [photos])

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId)
  const uploadedPhotos = photos.filter(p => p.uploaded).length
  const failedPhotos = photos.filter(p => p.error).length
  const pendingPhotos = photos.filter(p => !p.uploaded && !p.error).length

  return {
    // State
    album,
    photos,
    isProcessing,
    isUploading,
    selectedPhotoId,
    overallProgress,
    sortBy,
    dateFilter,
    bulkEditMode,
    selectedPhotoIds,
    selectedPhoto,
    uploadedPhotos,
    failedPhotos,
    pendingPhotos,
    sortedAndFilteredPhotos,
    photosByDate,
    availableDates,

    // Dropzone
    dropzone,

    // Actions
    setSortBy,
    setDateFilter,
    setBulkEditMode,
    setSelectedPhotoId,
    removePhoto,
    updateCaption,
    togglePhotoSelection,
    selectAllPhotos,
    deselectAllPhotos,
    bulkUpdateCaptions,
    bulkRemovePhotos,
    uploadPhotos,

    // Router
    router,
  }
}
