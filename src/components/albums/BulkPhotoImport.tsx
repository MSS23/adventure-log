'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import {
  Upload,
  Images,
  MapPin,
  Calendar,
  Check,
  X,
  Loader2,
  FolderPlus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Edit3,
  Merge,
  AlertTriangle,
  CheckCircle,
  FileImage,
  Globe2,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { extractPhotoExif, type ExifData } from '@/lib/utils/exif-extraction'
import { UserNav } from '@/components/layout/UserNav'
import Link from 'next/link'

// =============================================================================
// TYPES
// =============================================================================

interface ProcessedPhoto {
  id: string
  file: File
  preview: string
  lat: number | null
  lng: number | null
  date: Date | null
  exif: ExifData | null
  locationName?: string
}

interface PhotoGroup {
  id: string
  name: string
  photos: ProcessedPhoto[]
  centerLat: number | null
  centerLng: number | null
  dateStart: Date | null
  dateEnd: Date | null
  locationName: string
  expanded: boolean
}

type Stage = 'dropzone' | 'processing' | 'review' | 'uploading' | 'complete'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function computeGroupCenter(photos: ProcessedPhoto[]): { lat: number | null; lng: number | null } {
  const withCoords = photos.filter(p => p.lat !== null && p.lng !== null)
  if (withCoords.length === 0) return { lat: null, lng: null }
  const sumLat = withCoords.reduce((s, p) => s + p.lat!, 0)
  const sumLng = withCoords.reduce((s, p) => s + p.lng!, 0)
  return {
    lat: sumLat / withCoords.length,
    lng: sumLng / withCoords.length,
  }
}

function computeDateRange(photos: ProcessedPhoto[]): { start: Date | null; end: Date | null } {
  const withDates = photos.filter(p => p.date !== null).map(p => p.date!.getTime())
  if (withDates.length === 0) return { start: null, end: null }
  return {
    start: new Date(Math.min(...withDates)),
    end: new Date(Math.max(...withDates)),
  }
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start) return 'Unknown dates'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', opts)
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// =============================================================================
// GROUPING LOGIC
// =============================================================================

function groupPhotosByTrip(photos: ProcessedPhoto[]): PhotoGroup[] {
  // Separate photos with and without location/date data
  const withData = photos.filter(p => p.date !== null)
  const withoutData = photos.filter(p => p.date === null)

  // Sort by date
  const sorted = [...withData].sort((a, b) => a.date!.getTime() - b.date!.getTime())

  const groups: PhotoGroup[] = []
  let currentGroupPhotos: ProcessedPhoto[] = []

  for (const photo of sorted) {
    if (currentGroupPhotos.length === 0) {
      currentGroupPhotos.push(photo)
      continue
    }

    const lastPhoto = currentGroupPhotos[currentGroupPhotos.length - 1]
    const daysDiff = (photo.date!.getTime() - lastPhoto.date!.getTime()) / (1000 * 60 * 60 * 24)

    // Check distance if both have coordinates
    let distanceKm = 0
    if (lastPhoto.lat !== null && lastPhoto.lng !== null && photo.lat !== null && photo.lng !== null) {
      distanceKm = haversineDistance(lastPhoto.lat, lastPhoto.lng, photo.lat, photo.lng)
    }

    // New group if more than 3 days gap OR more than 200km apart
    if (daysDiff > 3 || (distanceKm > 200 && lastPhoto.lat !== null)) {
      const center = computeGroupCenter(currentGroupPhotos)
      const range = computeDateRange(currentGroupPhotos)
      groups.push({
        id: generateGroupId(),
        name: '',
        photos: currentGroupPhotos,
        centerLat: center.lat,
        centerLng: center.lng,
        dateStart: range.start,
        dateEnd: range.end,
        locationName: 'Loading...',
        expanded: true,
      })
      currentGroupPhotos = [photo]
    } else {
      currentGroupPhotos.push(photo)
    }
  }

  // Push last group
  if (currentGroupPhotos.length > 0) {
    const center = computeGroupCenter(currentGroupPhotos)
    const range = computeDateRange(currentGroupPhotos)
    groups.push({
      id: generateGroupId(),
      name: '',
      photos: currentGroupPhotos,
      centerLat: center.lat,
      centerLng: center.lng,
      dateStart: range.start,
      dateEnd: range.end,
      locationName: 'Loading...',
      expanded: true,
    })
  }

  // Add "No location/date" group
  if (withoutData.length > 0) {
    groups.push({
      id: generateGroupId(),
      name: 'Ungrouped Photos',
      photos: withoutData,
      centerLat: null,
      centerLng: null,
      dateStart: null,
      dateEnd: null,
      locationName: 'No location data',
      expanded: true,
    })
  }

  return groups
}

// =============================================================================
// COMPONENT
// =============================================================================

const MAX_PHOTOS = 200
const MAX_TOTAL_SIZE_BYTES = 500 * 1024 * 1024 // 500MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export function BulkPhotoImport() {
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
  const abortRef = useRef(false)

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      processedPhotos.forEach(p => URL.revokeObjectURL(p.preview))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // STAGE 1: DROP ZONE
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxFiles: MAX_PHOTOS,
    disabled: stage !== 'dropzone',
  })

  // =========================================================================
  // STAGE 2: PROCESSING
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
      let exif: ExifData | null = null

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
  // STAGE 3: REVIEW & GROUP MANAGEMENT
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

  const [mergeTarget, setMergeTarget] = useState<string | null>(null)

  // =========================================================================
  // STAGE 4: UPLOAD
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

  const photosWithDate = useMemo(() =>
    processedPhotos.filter(p => p.date !== null).length,
    [processedPhotos]
  )

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-black dark:via-black dark:to-black">
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-800/50 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (stage === 'review') {
                  if (confirm('Go back? Your grouping changes will be lost.')) {
                    processedPhotos.forEach(p => URL.revokeObjectURL(p.preview))
                    setProcessedPhotos([])
                    setGroups([])
                    setFiles([])
                    setStage('dropzone')
                  }
                } else if (stage === 'dropzone') {
                  router.push('/albums/new')
                }
              }}
              disabled={stage === 'processing' || stage === 'uploading'}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Bulk Photo Import
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {stage === 'dropzone' && 'Drop your photos to get started'}
                {stage === 'processing' && 'Extracting photo data...'}
                {stage === 'review' && `${groups.length} album${groups.length !== 1 ? 's' : ''} ready for review`}
                {stage === 'uploading' && 'Creating albums...'}
                {stage === 'complete' && 'Import complete'}
              </p>
            </div>
          </div>
          <UserNav />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 underline text-xs mt-1"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Size Warning */}
        <AnimatePresence>
          {sizeWarning && stage === 'dropzone' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Large upload detected</p>
                <p className="mt-1">
                  Total size is {formatFileSize(totalFileSize)}, which exceeds 500MB.
                  Upload may take a while depending on your connection.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================= */}
        {/* STAGE 1: DROP ZONE                                            */}
        {/* ============================================================= */}
        {stage === 'dropzone' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-16 md:p-24 text-center cursor-pointer transition-all duration-300",
                isDragActive
                  ? "border-olive-500 bg-olive-50/50 dark:bg-olive-900/20 scale-[1.02]"
                  : "border-stone-300 dark:border-stone-700 hover:border-olive-400 dark:hover:border-olive-600 hover:bg-stone-50 dark:hover:bg-stone-900/50"
              )}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                  <Images className="h-10 w-10 text-olive-600 dark:text-olive-400" />
                </div>
              </motion.div>

              {isDragActive ? (
                <p className="text-xl font-semibold text-olive-600 dark:text-olive-400">
                  Drop your photos here
                </p>
              ) : (
                <div>
                  <p className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
                    Drag and drop your photos
                  </p>
                  <p className="text-stone-500 dark:text-stone-400 mb-4">
                    or click to browse files
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-400 dark:text-stone-500">
                    <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                      <FileImage className="h-3.5 w-3.5" />
                      JPG, PNG, WebP
                    </span>
                    <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                      <Images className="h-3.5 w-3.5" />
                      Up to {MAX_PHOTOS} photos
                    </span>
                    <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                      <MapPin className="h-3.5 w-3.5" />
                      Auto GPS extraction
                    </span>
                    <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                      <FolderPlus className="h-3.5 w-3.5" />
                      Smart grouping
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Upload,
                  title: 'Drop Photos',
                  desc: 'Select up to 200 photos from your camera roll or file system.',
                },
                {
                  icon: Globe2,
                  title: 'Auto-Group',
                  desc: 'Photos are grouped by date and GPS location into trip albums.',
                },
                {
                  icon: FolderPlus,
                  title: 'Create Albums',
                  desc: 'Review groups, rename them, then upload. Albums are created automatically.',
                },
              ].map((step, i) => (
                <Card key={i} className="bg-white/50 dark:bg-[#111111]/50 border-stone-200/50 dark:border-stone-800/50">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-olive-600 dark:text-olive-400" />
                    </div>
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">{step.title}</h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ============================================================= */}
        {/* STAGE 2: PROCESSING                                           */}
        {/* ============================================================= */}
        {stage === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-olive-600 dark:text-olive-400 animate-spin" />
                </div>
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
                  Processing Photos
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                  Extracting GPS coordinates and dates from EXIF data
                </p>

                <div className="space-y-3">
                  <Progress value={processingProgress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span className="truncate max-w-[200px]">{processingFile}</span>
                    <span>{Math.round(processingProgress)}%</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                      {files.length}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                      {formatFileSize(totalFileSize)}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Size</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                      {Math.round(processingProgress)}%
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Done</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ============================================================= */}
        {/* STAGE 3: REVIEW & GROUP                                       */}
        {/* ============================================================= */}
        {stage === 'review' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
                    {processedPhotos.length}
                  </p>
                  <p className="text-xs text-stone-500">Photos</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
                    {groups.length}
                  </p>
                  <p className="text-xs text-stone-500">Albums</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
                    {photosWithLocation}
                  </p>
                  <p className="text-xs text-stone-500">With GPS</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
                    {formatFileSize(totalFileSize)}
                  </p>
                  <p className="text-xs text-stone-500">Total Size</p>
                </CardContent>
              </Card>
            </div>

            {/* Album Groups */}
            <div className="space-y-4">
              {groups.map((group, groupIndex) => (
                <Card
                  key={group.id}
                  className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50 overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className="bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 text-xs"
                          >
                            {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
                          </Badge>
                          {group.centerLat !== null && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                        </div>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => renameGroup(group.id, e.target.value)}
                          className="text-lg font-semibold text-stone-900 dark:text-stone-100 bg-transparent border-none outline-none w-full focus:ring-0 p-0 placeholder:text-stone-400"
                          placeholder="Album name..."
                        />
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                          {group.locationName !== 'No location data' && group.locationName !== 'Loading...' && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {group.locationName}
                            </span>
                          )}
                          {group.dateStart && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateRange(group.dateStart, group.dateEnd)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {mergeTarget === null ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMergeTarget(group.id)}
                            title="Merge with another album"
                            className="h-8 w-8 p-0"
                          >
                            <Merge className="h-4 w-4" />
                          </Button>
                        ) : mergeTarget === group.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMergeTarget(null)}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              mergeGroups(mergeTarget, group.id)
                              setMergeTarget(null)
                            }}
                            className="h-8 text-xs bg-olive-600 hover:bg-olive-700"
                          >
                            Merge here
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove album "${group.name}" and all its photos from import?`)) {
                              removeGroup(group.id)
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupExpanded(group.id)}
                          className="h-8 w-8 p-0"
                        >
                          {group.expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <AnimatePresence>
                    {group.expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {group.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="relative aspect-square rounded-lg overflow-hidden group"
                              >
                                <Image
                                  src={photo.preview}
                                  alt={photo.file.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, 12.5vw"
                                />
                                <button
                                  onClick={() => removePhotoFromGroup(group.id, photo.id)}
                                  className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-0.5">
                                    {photo.lat !== null && (
                                      <MapPin className="h-2.5 w-2.5 text-white" />
                                    )}
                                    {photo.date !== null && (
                                      <Calendar className="h-2.5 w-2.5 text-white" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>

            {/* Action Bar */}
            {groups.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  {groups.length} album{groups.length !== 1 ? 's' : ''} with{' '}
                  {groups.reduce((sum, g) => sum + g.photos.length, 0)} photos will be created
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      processedPhotos.forEach(p => URL.revokeObjectURL(p.preview))
                      setProcessedPhotos([])
                      setGroups([])
                      setFiles([])
                      setStage('dropzone')
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                  <Button
                    onClick={startUpload}
                    className="bg-olive-600 hover:bg-olive-700 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Create {groups.length} Album{groups.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}

            {groups.length === 0 && (
              <Card className="mt-6 bg-white dark:bg-[#111111]">
                <CardContent className="py-12 text-center">
                  <Images className="h-12 w-12 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
                  <p className="text-stone-500 dark:text-stone-400">
                    All groups have been removed. Start over to try again.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setFiles([])
                      setProcessedPhotos([])
                      setStage('dropzone')
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ============================================================= */}
        {/* STAGE 4: UPLOADING                                            */}
        {/* ============================================================= */}
        {stage === 'uploading' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-olive-600 dark:text-olive-400 animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
                  Creating Albums
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">
                  Uploading photos and creating album records
                </p>
                {uploadingGroup && (
                  <p className="text-xs text-olive-600 dark:text-olive-400 mb-6">
                    Current: {uploadingGroup}
                  </p>
                )}

                <div className="space-y-3">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {Math.round(uploadProgress)}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ============================================================= */}
        {/* STAGE 5: COMPLETE                                             */}
        {/* ============================================================= */}
        {stage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
                  Import Complete
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                  {createdAlbumIds.length} album{createdAlbumIds.length !== 1 ? 's' : ''} created
                  with {groups.reduce((sum, g) => sum + g.photos.length, 0)} photos
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {createdAlbumIds.length > 0 && (
                    <Button
                      onClick={() => router.push(`/albums/${createdAlbumIds[0]}`)}
                      className="bg-olive-600 hover:bg-olive-700 text-white"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      View First Album
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push('/profile')}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFiles([])
                      setProcessedPhotos([])
                      setGroups([])
                      setCreatedAlbumIds([])
                      setUploadProgress(0)
                      setStage('dropzone')
                      setError(null)
                      setSizeWarning(false)
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  )
}
