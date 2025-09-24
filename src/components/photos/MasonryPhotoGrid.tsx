'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Photo } from '@/types/database'
import { EnhancedLightbox } from './EnhancedLightbox'
import {
  Camera,
  MapPin,
  Heart,
  MessageCircle,
  Calendar,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  LayoutGrid,
  Star,
  Download,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface MasonryPhotoGridProps {
  photos: Photo[]
  columns?: 2 | 3 | 4 | 5
  showFilters?: boolean
  className?: string
  albumId?: string
  isOwner?: boolean
  onPhotoSelect?: (photoIds: string[]) => void
  selectedPhotoIds?: string[]
  selectionMode?: boolean
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'
type FilterOption = 'all' | 'favorites' | 'with-location' | 'with-date' | 'recent'
type ViewMode = 'masonry' | 'grid'

export function MasonryPhotoGrid({
  photos,
  columns = 4,
  showFilters = true,
  className,
  albumId,
  isOwner = false,
  onPhotoSelect,
  selectedPhotoIds = [],
  selectionMode = false
}: MasonryPhotoGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({})

  const handlePhotoClick = (photoId: string) => {
    if (selectionMode) {
      const isSelected = selectedPhotoIds.includes(photoId)
      const newSelection = isSelected
        ? selectedPhotoIds.filter(id => id !== photoId)
        : [...selectedPhotoIds, photoId]
      onPhotoSelect?.(newSelection)
    } else {
      setSelectedPhotoId(photoId)
      setLightboxOpen(true)
    }
  }

  const handleCloseLightbox = () => {
    setLightboxOpen(false)
    setSelectedPhotoId(undefined)
  }

  // Sort and filter photos
  const processedPhotos = useMemo(() => {
    let filtered = [...photos]

    // Apply filters
    switch (filterBy) {
      case 'favorites':
        // Mock implementation - in real app, check user's favorites
        filtered = filtered.filter(() => Math.random() > 0.7)
        break
      case 'with-location':
        filtered = filtered.filter(photo => photo.latitude && photo.longitude)
        break
      case 'with-date':
        filtered = filtered.filter(photo => photo.taken_at)
        break
      case 'recent':
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        filtered = filtered.filter(photo =>
          new Date(photo.created_at) > oneWeekAgo
        )
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.taken_at || b.created_at).getTime() - new Date(a.taken_at || a.created_at).getTime()
        case 'date-asc':
          return new Date(a.taken_at || a.created_at).getTime() - new Date(b.taken_at || b.created_at).getTime()
        case 'name-asc':
          return (a.caption || '').localeCompare(b.caption || '')
        case 'name-desc':
          return (b.caption || '').localeCompare(a.caption || '')
        case 'size-desc':
          return (b.file_size || 0) - (a.file_size || 0)
        case 'size-asc':
          return (a.file_size || 0) - (b.file_size || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [photos, sortBy, filterBy])

  // Generate masonry columns
  const masonryColumns = useMemo(() => {
    if (viewMode === 'grid') return null

    const columnArrays: Photo[][] = Array(columns).fill(null).map(() => [])
    const columnHeights = Array(columns).fill(0)

    processedPhotos.forEach((photo) => {
      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))

      // Add photo to shortest column
      columnArrays[shortestColumnIndex].push(photo)

      // Update column height (estimate based on aspect ratio)
      const aspectRatio = photo.height && photo.width ? photo.height / photo.width : 1
      const estimatedHeight = 300 * aspectRatio // Base height of 300px
      columnHeights[shortestColumnIndex] += estimatedHeight + 16 // Add gap
    })

    return columnArrays
  }, [processedPhotos, columns, viewMode])

  const getColumnClasses = () => {
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
      {/* Filters and Controls */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {processedPhotos.length} {processedPhotos.length === 1 ? 'photo' : 'photos'}
            </Badge>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              <Button
                variant={viewMode === 'masonry' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('masonry')}
                className="rounded-none px-3"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none px-3"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {filterBy === 'all' ? 'All Photos' :
                   filterBy === 'favorites' ? 'Favorites' :
                   filterBy === 'with-location' ? 'With Location' :
                   filterBy === 'with-date' ? 'With Date' :
                   'Recent'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterBy('all')}>
                  All Photos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy('favorites')}>
                  <Star className="h-4 w-4 mr-2" />
                  Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy('with-location')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  With Location
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy('with-date')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  With Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy('recent')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Recent (7 days)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  {sortBy.includes('desc') ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('date-desc')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Date (Newest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date-asc')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Date (Oldest)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('name-asc')}>
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name-desc')}>
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('size-desc')}>
                  Size (Largest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('size-asc')}>
                  Size (Smallest)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Actions */}
            {selectionMode && selectedPhotoIds.length > 0 && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
                <Badge>{selectedPhotoIds.length} selected</Badge>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="outline">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className={className}>
        {viewMode === 'masonry' && masonryColumns ? (
          // Masonry Layout
          <div className={cn("grid gap-4", getColumnClasses())}>
            {masonryColumns.map((columnPhotos, columnIndex) => (
              <div key={columnIndex} className="space-y-4">
                <AnimatePresence>
                  {columnPhotos.map((photo, photoIndex) => (
                    <MasonryPhotoItem
                      key={photo.id}
                      photo={photo}
                      index={photoIndex}
                      isSelected={selectedPhotoIds.includes(photo.id)}
                      selectionMode={selectionMode}
                      onClick={() => handlePhotoClick(photo.id)}
                      onImageLoad={(height) => setImageHeights(prev => ({ ...prev, [photo.id]: height }))}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : (
          // Standard Grid Layout
          <div className={cn("grid gap-4", getColumnClasses())}>
            <AnimatePresence>
              {processedPhotos.map((photo, index) => (
                <GridPhotoItem
                  key={photo.id}
                  photo={photo}
                  index={index}
                  isSelected={selectedPhotoIds.includes(photo.id)}
                  selectionMode={selectionMode}
                  onClick={() => handlePhotoClick(photo.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <EnhancedLightbox
        photos={processedPhotos}
        initialPhotoId={selectedPhotoId}
        isOpen={lightboxOpen}
        onClose={handleCloseLightbox}
        albumId={albumId}
        isOwner={isOwner}
      />
    </>
  )
}

interface PhotoItemProps {
  photo: Photo
  index: number
  isSelected: boolean
  selectionMode: boolean
  onClick: () => void
  onImageLoad?: (height: number) => void
}

function MasonryPhotoItem({ photo, index, isSelected, selectionMode, onClick, onImageLoad }: PhotoItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [naturalHeight, setNaturalHeight] = useState<number | undefined>()

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNaturalHeight(img.naturalHeight)
    setImageLoaded(true)
    onImageLoad?.(img.naturalHeight)
  }

  // Calculate dynamic height based on aspect ratio
  const aspectRatio = photo.height && photo.width ? photo.height / photo.width : 1
  const estimatedHeight = Math.floor(250 + (aspectRatio * 100))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1",
        isSelected && selectionMode && "ring-4 ring-blue-500 ring-opacity-75",
        selectionMode && "hover:ring-2 hover:ring-blue-300"
      )}
      style={{ height: naturalHeight ? naturalHeight / 3 : estimatedHeight }}
      onClick={onClick}
    >
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <Camera className="h-8 w-8 text-gray-400" />
        </div>
      )}

      {imageError ? (
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-500">
          <Camera className="h-8 w-8 mb-2" />
          <span className="text-sm">Failed to load</span>
        </div>
      ) : (
        <Image
          src={photo.file_path}
          alt={photo.caption || `Photo ${index + 1}`}
          fill
          className={cn(
            "object-cover transition-transform duration-300",
            "group-hover:scale-105",
            !imageLoaded && "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
        />
      )}

      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div className={cn(
            "w-6 h-6 rounded-full border-2 bg-white/90 backdrop-blur-sm flex items-center justify-center",
            isSelected ? "border-blue-500 bg-blue-500" : "border-white"
          )}>
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </div>
      )}

      {/* Photo Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          {photo.caption && (
            <p className="text-sm font-medium mb-2 line-clamp-2">
              {photo.caption}
            </p>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {photo.latitude && photo.longitude && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>Location</span>
                </div>
              )}
              {photo.taken_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(photo.taken_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function GridPhotoItem({ photo, index, isSelected, selectionMode, onClick }: PhotoItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-lg",
        isSelected && selectionMode && "ring-4 ring-blue-500 ring-opacity-75"
      )}
      onClick={onClick}
    >
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <Camera className="h-6 w-6 text-gray-400" />
        </div>
      )}

      {imageError ? (
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-500">
          <Camera className="h-6 w-6 mb-1" />
          <span className="text-xs">Failed to load</span>
        </div>
      ) : (
        <Image
          src={photo.file_path}
          alt={photo.caption || `Photo ${index + 1}`}
          fill
          className={cn(
            "object-cover transition-all duration-300",
            "group-hover:scale-110",
            !imageLoaded && "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div className={cn(
            "w-6 h-6 rounded-full border-2 bg-white/90 backdrop-blur-sm flex items-center justify-center",
            isSelected ? "border-blue-500 bg-blue-500" : "border-white"
          )}>
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-2 left-2 right-2 text-white text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {photo.latitude && photo.longitude && (
                <MapPin className="h-3 w-3" />
              )}
              {photo.taken_at && (
                <Calendar className="h-3 w-3" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-3 w-3" />
              <MessageCircle className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}