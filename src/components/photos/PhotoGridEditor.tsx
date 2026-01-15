'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, GripVertical, Star, Trash2, X, Check, ImagePlus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Photo } from '@/types/database'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PhotoGridEditorProps {
  photos: Photo[]
  albumId: string
  currentCoverPhotoUrl?: string
  onPhotosReorder: (photos: Photo[]) => void
  onPhotoDelete: (photoId: string) => Promise<void>
  onCoverPhotoSet: (photoPath: string) => void
  className?: string
}

export function PhotoGridEditor({
  photos,
  albumId,
  currentCoverPhotoUrl,
  onPhotosReorder,
  onPhotoDelete,
  onCoverPhotoSet,
  className,
}: PhotoGridEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { triggerLight, triggerMedium, triggerSuccess } = useHaptics()
  const prefersReducedMotion = useReducedMotion()

  // Configure sensors for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement needed to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold to start drag on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    triggerLight()
  }, [triggerLight])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((p) => p.id === active.id)
      const newIndex = photos.findIndex((p) => p.id === over.id)

      const newPhotos = arrayMove(photos, oldIndex, newIndex).map((photo, index) => ({
        ...photo,
        display_order: index,
      }))

      onPhotosReorder(newPhotos)
      triggerSuccess()
      toast.success('Photo order updated')
    }

    setActiveId(null)
  }, [photos, onPhotosReorder, triggerSuccess])

  const handleSetCover = useCallback((photoPath: string) => {
    onCoverPhotoSet(photoPath)
    triggerMedium()
    toast.success('Cover photo selected')
  }, [onCoverPhotoSet, triggerMedium])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletePhotoId) return

    setIsDeleting(true)
    try {
      await onPhotoDelete(deletePhotoId)
      triggerSuccess()
    } catch {
      toast.error('Failed to delete photo')
    } finally {
      setIsDeleting(false)
      setDeletePhotoId(null)
    }
  }, [deletePhotoId, onPhotoDelete, triggerSuccess])

  const activePhoto = activeId ? photos.find((p) => p.id === activeId) : null

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">No photos in this album yet</p>
        <Link href={`/albums/${albumId}/upload`}>
          <Button variant="outline" className="gap-2">
            <ImagePlus className="h-4 w-4" />
            Upload Photos
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Instructions */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-sm">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
            <GripVertical className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-800">Drag to reorder photos</p>
            <p className="text-xs text-blue-600">
              Hold and drag on mobile, or click and drag on desktop. Tap the star to set cover photo.
            </p>
          </div>
        </div>

        {/* Photo Grid with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <SortablePhotoItem
                  key={photo.id}
                  photo={photo}
                  index={index}
                  isCover={currentCoverPhotoUrl === photo.file_path}
                  isDragging={activeId === photo.id}
                  onSetCover={() => handleSetCover(photo.file_path)}
                  onDelete={() => setDeletePhotoId(photo.id)}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay adjustScale={!prefersReducedMotion}>
            {activePhoto && (
              <PhotoCard
                photo={activePhoto}
                index={photos.indexOf(activePhoto)}
                isCover={currentCoverPhotoUrl === activePhoto.file_path}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={(open) => !open && setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone and the photo
              will be permanently removed from this album.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Photo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface SortablePhotoItemProps {
  photo: Photo
  index: number
  isCover: boolean
  isDragging: boolean
  onSetCover: () => void
  onDelete: () => void
  prefersReducedMotion: boolean
}

function SortablePhotoItem({
  photo,
  index,
  isCover,
  isDragging,
  onSetCover,
  onDelete,
  prefersReducedMotion,
}: SortablePhotoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isSortableDragging && 'opacity-50 z-50'
      )}
    >
      <PhotoCard
        photo={photo}
        index={index}
        isCover={isCover}
        isDragging={isDragging}
        onSetCover={onSetCover}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  )
}

interface PhotoCardProps {
  photo: Photo
  index: number
  isCover: boolean
  isDragging?: boolean
  isDragOverlay?: boolean
  onSetCover?: () => void
  onDelete?: () => void
  dragHandleProps?: Record<string, unknown>
  prefersReducedMotion?: boolean
}

function PhotoCard({
  photo,
  index,
  isCover,
  isDragging,
  isDragOverlay,
  onSetCover,
  onDelete,
  dragHandleProps,
  prefersReducedMotion,
}: PhotoCardProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const photoUrl = getPhotoUrl(photo.file_path)

  return (
    <motion.div
      className={cn(
        'group relative aspect-square rounded-xl overflow-hidden bg-gray-100',
        'border-2 transition-all duration-200',
        isCover ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-transparent',
        isDragging && 'shadow-2xl scale-105',
        isDragOverlay && 'shadow-2xl cursor-grabbing',
        !isDragging && !isDragOverlay && 'hover:shadow-lg'
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-teal-500" />
        </div>
      )}

      {imageError ? (
        <div className="flex flex-col items-center justify-center h-full">
          <Camera className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">Failed to load</p>
        </div>
      ) : photoUrl ? (
        <Image
          src={photoUrl}
          alt={photo.caption || `Photo ${index + 1}`}
          fill
          className={cn(
            'object-cover transition-transform duration-300',
            !isDragging && !isDragOverlay && 'group-hover:scale-105',
            imageLoading && 'opacity-0'
          )}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false)
            setImageError(true)
          }}
        />
      ) : null}

      {/* Cover Badge */}
      <AnimatePresence>
        {isCover && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
            className="absolute top-2 left-2 flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Star className="h-3 w-3 fill-current" />
            Cover
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag Handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className={cn(
            'absolute top-2 bg-black/70 backdrop-blur-sm text-white p-2 rounded-lg',
            'cursor-grab active:cursor-grabbing touch-none',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'shadow-lg',
            isCover ? 'left-20' : 'left-2'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Action Buttons */}
      {(onSetCover || onDelete) && !isDragOverlay && (
        <div
          className={cn(
            'absolute top-2 right-2 flex gap-1',
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
          )}
        >
          {onSetCover && !isCover && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetCover()
              }}
              className="p-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
              title="Set as cover"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
              title="Delete photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Photo Number */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
        {index + 1}
      </div>
    </motion.div>
  )
}
