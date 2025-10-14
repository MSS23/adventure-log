'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckSquare,
  X,
  Download,
  Trash2,
  Star,
  Tag,
  Share2
} from 'lucide-react'
import { Photo } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { useToast } from '@/components/ui/toast-provider'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface BulkPhotoActionsProps {
  photos: Photo[]
  albumId: string
  isOwner: boolean
  onRefresh: () => void
}

export function BulkPhotoActions({ photos, albumId, isOwner, onRefresh }: BulkPhotoActionsProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const { success, error: showError } = useToast()
  const supabase = createClient()

  const toggleSelection = (photoId: string) => {
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

  const selectAll = () => {
    setSelectedPhotoIds(new Set(photos.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedPhotoIds(new Set())
    setIsSelectionMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.size === 0) return

    const confirmMessage = `Are you sure you want to delete ${selectedPhotoIds.size} photo${selectedPhotoIds.size > 1 ? 's' : ''}? This action cannot be undone.`
    if (!confirm(confirmMessage)) return

    try {
      setIsProcessing(true)

      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .in('id', Array.from(selectedPhotoIds))

      if (deleteError) throw deleteError

      success('Photos deleted', `Successfully deleted ${selectedPhotoIds.size} photo${selectedPhotoIds.size > 1 ? 's' : ''}`)
      clearSelection()
      onRefresh()
    } catch (err) {
      log.error('Bulk delete failed', {
        component: 'BulkPhotoActions',
        action: 'bulkDelete',
        count: selectedPhotoIds.size
      }, err instanceof Error ? err : new Error(String(err)))
      showError('Delete failed', 'Failed to delete photos. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDownload = async () => {
    if (selectedPhotoIds.size === 0) return

    try {
      setIsProcessing(true)
      const zip = new JSZip()

      const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id))

      // Download each photo and add to zip
      for (const photo of selectedPhotos) {
        try {
          const photoUrl = getPhotoUrl(photo.file_path || photo.storage_path)
          if (!photoUrl) continue

          const response = await fetch(photoUrl)
          const blob = await response.blob()

          // Generate filename
          const extension = photo.file_path?.split('.').pop() || 'jpg'
          const filename = photo.caption
            ? `${photo.caption.replace(/[^a-z0-9]/gi, '_')}.${extension}`
            : `photo_${photo.id}.${extension}`

          zip.file(filename, blob)
        } catch (err) {
          log.error('Failed to download photo', {
            component: 'BulkPhotoActions',
            photoId: photo.id
          }, err instanceof Error ? err : new Error(String(err)))
        }
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `album_photos_${Date.now()}.zip`)

      success('Download complete', `Downloaded ${selectedPhotoIds.size} photo${selectedPhotoIds.size > 1 ? 's' : ''}`)
      clearSelection()
    } catch (err) {
      log.error('Bulk download failed', {
        component: 'BulkPhotoActions',
        action: 'bulkDownload',
        count: selectedPhotoIds.size
      }, err instanceof Error ? err : new Error(String(err)))
      showError('Download failed', 'Failed to download photos. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isSelectionMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsSelectionMode(true)}
        className="gap-2"
      >
        <CheckSquare className="h-4 w-4" />
        Select Photos
      </Button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-sm">
            {selectedPhotoIds.size} selected
          </Badge>

          {selectedPhotoIds.size < photos.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-8 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
            >
              Select All ({photos.length})
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDownload}
            disabled={selectedPhotoIds.size === 0 || isProcessing}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedPhotoIds.size === 0 || isProcessing}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={isProcessing}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Selection helper text */}
      <p className="text-xs text-blue-700 mt-3">
        Click on photos to select them for bulk actions
      </p>
    </div>
  )
}

// Export hook for photo selection in PhotoGrid
export function usePhotoSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  return {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    setIsSelectionMode,
    clearSelection
  }
}
