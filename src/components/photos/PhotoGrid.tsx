'use client'

import { useState, useCallback } from 'react'
import { Photo } from '@/types/database'
import { PhotoViewer } from './PhotoViewer'
import { Camera, MapPin, Heart, MessageCircle, GripVertical, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

interface PhotoGridProps {
  photos: Photo[]
  columns?: 2 | 3 | 4 | 5
  showCaptions?: boolean
  className?: string
  albumId?: string
  isOwner?: boolean
  currentCoverPhotoUrl?: string
  onCoverPhotoSet?: (photoUrl: string) => void
  onPhotosReorder?: (reorderedPhotos: Photo[]) => void
  allowReordering?: boolean
}

export function PhotoGrid({ photos, columns = 4, showCaptions = false, className, albumId, isOwner = false, currentCoverPhotoUrl, onCoverPhotoSet, onPhotosReorder, allowReordering = false }: PhotoGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()
  const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const supabase = createClient()

  const handlePhotoClick = (photoId: string) => {
    setSelectedPhotoId(photoId)
    setViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setViewerOpen(false)
    setSelectedPhotoId(undefined)
  }

  const handleDragStart = (e: React.DragEvent, photo: Photo, index: number) => {
    if (!allowReordering || !isOwner) return

    setDraggedPhoto(photo)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML)
    ;(e.currentTarget as HTMLElement).style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    ;(e.currentTarget as HTMLElement).style.opacity = '1'
    setDraggedPhoto(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!allowReordering || !isOwner || !draggedPhoto) return

    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (!allowReordering || !isOwner || !draggedPhoto || !albumId || !onPhotosReorder) return

    const draggedIndex = photos.findIndex(p => p.id === draggedPhoto.id)
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }

    setIsReordering(true)

    try {
      // Create new array with reordered photos
      const newPhotos = [...photos]
      const [removed] = newPhotos.splice(draggedIndex, 1)
      newPhotos.splice(dropIndex, 0, removed)

      // Update order_index for all affected photos
      const updatePromises = newPhotos.map((photo, index) =>
        supabase
          .from('photos')
          .update({ order_index: index })
          .eq('id', photo.id)
      )

      await Promise.all(updatePromises)

      // Update local state with new order
      const updatedPhotos = newPhotos.map((photo, index) => ({
        ...photo,
        order_index: index
      }))

      onPhotosReorder(updatedPhotos)
    } catch (error) {
      console.error('Error reordering photos:', error)
    } finally {
      setIsReordering(false)
      setDragOverIndex(null)
    }
  }, [allowReordering, isOwner, draggedPhoto, albumId, onPhotosReorder, photos, supabase])

  const getGridColumns = () => {
    switch (columns) {
      case 2: return 'grid-cols-2'
      case 3: return 'grid-cols-2 md:grid-cols-3'
      case 4: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      default: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    }
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Camera className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No photos yet</p>
        <p className="text-sm">Photos will appear here once uploaded</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn(
        "grid gap-4 md:gap-6",
        getGridColumns(),
        className
      )}>
        {photos.map((photo, index) => (
          <PhotoGridItem
            key={photo.id}
            photo={photo}
            index={index}
            showCaption={showCaptions}
            isOwner={isOwner}
            isCover={currentCoverPhotoUrl === photo.file_path}
            allowReordering={allowReordering && isOwner}
            isReordering={isReordering}
            isDraggedOver={dragOverIndex === index}
            onPhotoClick={() => handlePhotoClick(photo.id)}
            onSetCover={onCoverPhotoSet ? () => onCoverPhotoSet(photo.file_path) : undefined}
            onDragStart={(e) => handleDragStart(e, photo, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          />
        ))}
      </div>

      <PhotoViewer
        photos={photos}
        initialPhotoId={selectedPhotoId}
        isOpen={viewerOpen}
        onClose={handleCloseViewer}
      />
    </>
  )
}

interface PhotoGridItemProps {
  photo: Photo
  index: number
  showCaption: boolean
  isOwner?: boolean
  isCover?: boolean
  allowReordering?: boolean
  isReordering?: boolean
  isDraggedOver?: boolean
  onPhotoClick: () => void
  onSetCover?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
}

function PhotoGridItem({
  photo,
  index,
  showCaption,
  isOwner,
  isCover,
  allowReordering,
  isReordering,
  isDraggedOver,
  onPhotoClick,
  onSetCover,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}: PhotoGridItemProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const retryImageLoad = () => {
    setImageLoading(true)
    setImageError(false)
    setRetryCount(prev => prev + 1)
  }

  return (
    <div
      className={cn(
        "group relative aspect-square bg-gray-100 rounded-lg overflow-hidden transition-all duration-300",
        allowReordering && isOwner ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDraggedOver && "ring-2 ring-blue-500 ring-offset-2",
        isReordering && "pointer-events-none opacity-75",
        !isReordering && "hover:shadow-lg"
      )}
      draggable={allowReordering && isOwner}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Loading State */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
        </div>
      )}

      {/* Image or Error State */}
      {imageError ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4" onClick={onPhotoClick}>
          <Camera className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 mb-2">Failed to load</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              retryImageLoad()
            }}
            className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : photo.file_path ? (
        <Image
          key={`${photo.id}-${retryCount}`}
          src={photo.file_path}
          alt={photo.caption || `Photo ${index + 1}`}
          fill
          className={cn(
            "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
            imageLoading && "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={onPhotoClick}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-4" onClick={onPhotoClick}>
          <Camera className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">No image</p>
        </div>
      )}

      {/* Cover Photo Badge */}
      {isCover && (
        <div className="absolute top-1 left-1 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium z-20 shadow-sm">
          Cover
        </div>
      )}

      {/* Drag Handle for Reordering */}
      {allowReordering && isOwner && !isCover && (
        <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm text-white p-2 rounded opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 shadow-lg min-h-[32px] min-w-[32px] touch-manipulation">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Drag Handle for Cover Photos (shifted position) */}
      {allowReordering && isOwner && isCover && (
        <div className="absolute top-1 left-16 bg-black/80 backdrop-blur-sm text-white p-2 rounded opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 shadow-lg min-h-[32px] min-w-[32px] touch-manipulation">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Set Cover Button for Owners */}
      {isOwner && onSetCover && !isCover && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSetCover()
          }}
          className="absolute top-1 right-1 bg-blue-600 text-white px-3 py-2 rounded text-xs opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-all hover:bg-blue-700 focus:bg-blue-700 z-20 shadow-lg font-medium min-h-[32px] min-w-[70px] touch-manipulation"
        >
          Set Cover
        </button>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-5">
        {/* Photo Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10">
          {showCaption && photo.caption && (
            <p className="text-sm font-medium line-clamp-2 mb-2 text-shadow-sm">
              {photo.caption}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              {photo.latitude && photo.longitude && (
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                  <MapPin className="h-3 w-3" />
                  <span>Location</span>
                </div>
              )}
              {photo.taken_at && (
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                  <Calendar className="h-3 w-3" />
                  <span>Date</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 opacity-75 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                <Heart className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1 opacity-75 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                <MessageCircle className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Positioned to avoid conflicts */}
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity delay-100 z-10">
          {/* Only show if Set Cover button is not present */}
          {!(isOwner && onSetCover && !isCover) && (
            <>
              {photo.latitude && photo.longitude && (
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm" title="Has location data" />
              )}
              {photo.taken_at && (
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm" title="Has timestamp" />
              )}
            </>
          )}
          {/* Show indicators in bottom-right if Set Cover button is present */}
          {(isOwner && onSetCover && !isCover) && (
            <div className="absolute top-8 right-0 flex gap-1">
              {photo.latitude && photo.longitude && (
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm" title="Has location data" />
              )}
              {photo.taken_at && (
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm" title="Has timestamp" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Number Badge - Moved to bottom-left */}
      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm">
        {index + 1}
      </div>
    </div>
  )
}