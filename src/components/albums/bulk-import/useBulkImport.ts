'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { extractPhotoExif } from '@/lib/utils/exif-extraction'
import type { ProcessedPhoto, PhotoGroup, Stage } from './types'
import {
  groupPhotosByTrip,
  computeGroupCenter,
  computeDateRange,
  generateGroupId,
} from './utils'

const MAX_PHOTOS = 200
const MAX_TOTAL_SIZE_BYTES = 500 * 1024 * 1024 // 500MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export function useBulkImport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [stage, setStage] = useState<Stage>('dropzone')
  const [files, setFiles] = useState<File[]>([])
  const [processedPhotos, setProcessedPhotos] = useState<ProcessedPhoto[]>([])
  const [groups, setGroups] = useState<PhotoGroup[]>([])
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingFile, setProcessingFile] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingGroup, setUploadingGroup] = useState('')
  const [createdAlbumIds, setCreatedAlbumIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sizeWarning, setSizeWarning] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<string | null>(null)
  const abortRef = useRef(false)

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      processedPhotos.forEach(p => URL.revokeObjectURL(p.preview))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // PROCESSING
  // =========================================================================

  const processFiles = async (filesToProcess: File[]) => {
    setStage('processing')
    setProcessingProgress(0)
    abortRef.current = false

    const results: ProcessedPhoto[] = []

    for (let i = 0; i < filesToProcess.length; i++) {
      if (abortRef.current) break

      const file = filesToProcess[i]
      setProcessingFile(file.name)
      setProcessingProgress(((i + 1) / filesToProcess.length) * 100)

      let lat: number | null = null
      let lng: number | null = null
      let date: Date | null = null
      let exif: import('@/lib/utils/exif-extraction').ExifData | null = null

      try {
        exif = await extractPhotoExif(file, { timeout: 5000 })

        if (exif.location?.latitude && exif.location?.longitude) {
          lat = exif.location.latitude
          lng = exif.location.longitude
        }

        if (exif.dateTime?.dateTimeOriginal) {
          const parsed = new Date(exif.dateTime.dateTimeOriginal)
          if (!isNaN(parsed.getTime())) {
            date = parsed
          }
        } else if (exif.dateTime?.dateTime) {
          const parsed = new Date(exif.dateTime.dateTime)
          if (!isNaN(parsed.getTime())) {
            date = parsed
          }
        }
      } catch (err) {
        log.warn('EXIF extraction failed for file', {
          component: 'BulkPhotoImport',
          fileName: file.name,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Fallback: use file last modified date
      if (!date) {
        date = new Date(file.lastModified)
      }

      results.push({
        id: `photo-${i}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        lat,
        lng,
        date,
        exif,
      })
    }

    setProcessedPhotos(results)

    // Group photos
    const photoGroups = groupPhotosByTrip(results)
    setGroups(photoGroups)

    // Reverse geocode each group
    await reverseGeocodeGroups(photoGroups)

    setStage('review')
  }

  const reverseGeocodeGroups = async (photoGroups: PhotoGroup[]) => {
    const updatedGroups = [...photoGroups]

    for (let i = 0; i < updatedGroups.length; i++) {
      const group = updatedGroups[i]
      if (group.centerLat === null || group.centerLng === null) {
        updatedGroups[i] = {
          ...group,
          locationName: 'No location data',
          name: group.name || `Album ${i + 1}`,
        }
        continue
      }

      try {
        const res = await fetch(
          `/api/geocode?reverse=true&lat=${group.centerLat}&lon=${group.centerLng}`
        )
        if (res.ok) {
          const data = await res.json()
          const locationName = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(',').trim()
            : 'Unknown location'

          // Generate a nice album name
          const city = data.address?.city || data.address?.town || data.address?.village || ''
          const country = data.address?.country || ''
          const dateStr = group.dateStart
            ? group.dateStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : ''

          let albumName = ''
          if (city && dateStr) {
            albumName = `${city}, ${dateStr}`
          } else if (city && country) {
            albumName = `${city}, ${country}`
          } else if (country && dateStr) {
            albumName = `${country}, ${dateStr}`
          } else if (locationName) {
            albumName = locationName.split(',')[0]
          } else {
            albumName = `Album ${i + 1}`
          }

          updatedGroups[i] = {
            ...group,
            locationName,
            name: group.name || albumName,
          }
        } else {
          updatedGroups[i] = {
            ...group,
            locationName: 'Location unavailable',
            name: group.name || `Album ${i + 1}`,
          }
        }
      } catch {
        updatedGroups[i] = {
          ...group,
          locationName: 'Location unavailable',
          name: group.name || `Album ${i + 1}`,
        }
      }

      // Add a small delay between geocode requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1100))
    }

    setGroups(updatedGroups)
  }

  // =========================================================================
  // DROP ZONE
  // =========================================================================

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    if (acceptedFiles.length > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos per batch. You selected ${acceptedFiles.length}.`)
      return
    }

    const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0)
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      setSizeWarning(true)
    }

    setFiles(acceptedFiles)
    setError(null)
    processFiles(acceptedFiles)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dropzone = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxFiles: MAX_PHOTOS,
    disabled: stage !== 'dropzone',
  })

  // =========================================================================
  // GROUP MANAGEMENT
  // =========================================================================

  const renameGroup = (groupId: string, newName: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, name: newName } : g
    ))
  }

  const removeGroup = (groupId: string) => {
    setGroups(prev => {
      const group = prev.find(g => g.id === groupId)
      if (group) {
        group.photos.forEach(p => URL.revokeObjectURL(p.preview))
      }
      return prev.filter(g => g.id !== groupId)
    })
  }

  const removePhotoFromGroup = (groupId: string, photoId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const photo = g.photos.find(p => p.id === photoId)
      if (photo) URL.revokeObjectURL(photo.preview)
      const updatedPhotos = g.photos.filter(p => p.id !== photoId)
      if (updatedPhotos.length === 0) return null as unknown as PhotoGroup
      const center = computeGroupCenter(updatedPhotos)
      const range = computeDateRange(updatedPhotos)
      return {
        ...g,
        photos: updatedPhotos,
        centerLat: center.lat,
        centerLng: center.lng,
        dateStart: range.start,
        dateEnd: range.end,
      }
    }).filter(Boolean))
  }

  const mergeGroups = (groupId1: string, groupId2: string) => {
    setGroups(prev => {
      const g1 = prev.find(g => g.id === groupId1)
      const g2 = prev.find(g => g.id === groupId2)
      if (!g1 || !g2) return prev

      const mergedPhotos = [...g1.photos, ...g2.photos]
      const center = computeGroupCenter(mergedPhotos)
      const range = computeDateRange(mergedPhotos)

      const merged: PhotoGroup = {
        id: generateGroupId(),
        name: g1.name,
        photos: mergedPhotos,
        centerLat: center.lat,
        centerLng: center.lng,
        dateStart: range.start,
        dateEnd: range.end,
        locationName: g1.locationName,
        expanded: true,
      }

      return prev.filter(g => g.id !== groupId1 && g.id !== groupId2).concat(merged)
    })
  }

  const toggleGroupExpanded = (groupId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, expanded: !g.expanded } : g
    ))
  }

  // =========================================================================
  // UPLOAD
  // =========================================================================

  const startUpload = async () => {
    if (!user) return
    setStage('uploading')
    setUploadProgress(0)
    setError(null)

    const totalPhotos = groups.reduce((sum, g) => sum + g.photos.length, 0)
    let uploadedCount = 0
    const albumIds: string[] = []

    for (const group of groups) {
      if (group.photos.length === 0) continue
      setUploadingGroup(group.name)

      try {
        // Create album
        const albumData: Record<string, unknown> = {
          user_id: user.id,
          title: group.name || 'Imported Album',
          caption: `Imported ${group.photos.length} photos`,
          privacy: 'private',
        }

        if (group.centerLat !== null && group.centerLng !== null) {
          albumData.latitude = group.centerLat
          albumData.longitude = group.centerLng
          albumData.location_name = group.locationName
        }

        if (group.dateStart) {
          albumData.date_start = group.dateStart.toISOString()
        }
        if (group.dateEnd) {
          albumData.date_end = group.dateEnd.toISOString()
        }

        const { data: album, error: albumError } = await supabase
          .from('albums')
          .insert(albumData)
          .select('*')
          .single()

        if (albumError) {
          log.error('Failed to create album', {
            component: 'BulkPhotoImport',
            error: albumError.message,
          })
          throw new Error(`Failed to create album "${group.name}": ${albumError.message}`)
        }

        albumIds.push(album.id)

        // Upload photos
        for (let i = 0; i < group.photos.length; i++) {
          const photo = group.photos[i]
          const fileExt = photo.file.name.split('.').pop() || 'jpg'
          const fileName = `${album.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, photo.file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            log.error('Failed to upload photo', {
              component: 'BulkPhotoImport',
              fileName: photo.file.name,
              error: uploadError.message,
            })
            // Continue with remaining photos
            continue
          }

          // Create photo record
          const photoData: Record<string, unknown> = {
            album_id: album.id,
            user_id: user.id,
            file_path: fileName,
            order_index: i,
            created_at: new Date().toISOString(),
          }

          if (photo.lat !== null && photo.lng !== null) {
            photoData.latitude = photo.lat
            photoData.longitude = photo.lng
          }

          if (photo.exif?.dateTime?.dateTimeOriginal) {
            photoData.taken_at = photo.exif.dateTime.dateTimeOriginal
          }

          if (photo.exif?.camera?.make) {
            photoData.camera_make = photo.exif.camera.make
          }
          if (photo.exif?.camera?.model) {
            photoData.camera_model = photo.exif.camera.model
          }

          const { error: insertError } = await supabase
            .from('photos')
            .insert(photoData)

          if (insertError) {
            log.error('Failed to insert photo record', {
              component: 'BulkPhotoImport',
              error: insertError.message,
            })
          }

          uploadedCount++
          setUploadProgress((uploadedCount / totalPhotos) * 100)
        }

        // Set first photo as cover
        const { data: firstPhoto } = await supabase
          .from('photos')
          .select('id, file_path')
          .eq('album_id', album.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .single()

        if (firstPhoto) {
          await supabase
            .from('albums')
            .update({
              cover_photo_url: firstPhoto.file_path,
              cover_photo_id: firstPhoto.id,
            })
            .eq('id', album.id)
        }

        log.info('Album created from bulk import', {
          component: 'BulkPhotoImport',
          albumId: album.id,
          photoCount: group.photos.length,
          albumName: group.name,
        })
      } catch (err) {
        log.error('Group upload failed', {
          component: 'BulkPhotoImport',
          groupName: group.name,
          error: err instanceof Error ? err.message : String(err),
        })
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    }

    setCreatedAlbumIds(albumIds)
    setStage('complete')
  }

  // =========================================================================
  // STATS
  // =========================================================================

  const totalFileSize = useMemo(() =>
    files.reduce((sum, f) => sum + f.size, 0),
    [files]
  )

  const photosWithLocation = useMemo(() =>
    processedPhotos.filter(p => p.lat !== null && p.lng !== null).length,
    [processedPhotos]
  )

  // =========================================================================
  // RESET
  // =========================================================================

  const resetAll = () => {
    processedPhotos.forEach(p => URL.revokeObjectURL(p.preview))
    setProcessedPhotos([])
    setGroups([])
    setFiles([])
    setStage('dropzone')
    setError(null)
    setSizeWarning(false)
    setCreatedAlbumIds([])
    setUploadProgress(0)
  }

  const resetToDropzone = () => {
    processedPhotos.forEach(p => URL.revokeObjectURL(p.preview))
    setProcessedPhotos([])
    setGroups([])
    setFiles([])
    setStage('dropzone')
  }

  return {
    // State
    stage,
    files,
    processedPhotos,
    groups,
    processingProgress,
    processingFile,
    uploadProgress,
    uploadingGroup,
    createdAlbumIds,
    error,
    sizeWarning,
    mergeTarget,
    totalFileSize,
    photosWithLocation,

    // Dropzone
    dropzone,

    // Actions
    setError,
    setMergeTarget,
    renameGroup,
    removeGroup,
    removePhotoFromGroup,
    mergeGroups,
    toggleGroupExpanded,
    startUpload,
    resetAll,
    resetToDropzone,
    router,

    // Constants
    MAX_PHOTOS,
  }
}
