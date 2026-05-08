'use client'

import Image from 'next/image'
import {
  X,
  MapPin,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  Camera,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { PhotoUpload } from '@/app/(app)/albums/[id]/upload/usePhotoUploadPage'

interface PhotoPreviewGridProps {
  photos: PhotoUpload[]
  sortedAndFilteredPhotos: PhotoUpload[]
  photosByDate: Record<string, PhotoUpload[]>
  availableDates: string[]
  sortBy: 'date-asc' | 'date-desc' | 'name'
  dateFilter: string
  bulkEditMode: boolean
  selectedPhotoIds: Set<string>
  selectedPhotoId: string | null
  selectedPhoto: PhotoUpload | undefined
  failedPhotos: number
  onSortByChange: (value: 'date-asc' | 'date-desc' | 'name') => void
  onDateFilterChange: (value: string) => void
  onBulkEditModeToggle: () => void
  onDeselectAll: () => void
  onSelectAll: () => void
  onTogglePhotoSelection: (photoId: string) => void
  onSelectPhoto: (photoId: string) => void
  onRemovePhoto: (photoId: string) => void
  onUpdateCaption: (photoId: string, caption: string) => void
  onBulkUpdateCaptions: (caption: string) => void
  onBulkRemove: () => void
}

export function PhotoPreviewGrid({
  photos,
  sortedAndFilteredPhotos,
  photosByDate,
  availableDates,
  sortBy,
  dateFilter,
  bulkEditMode,
  selectedPhotoIds,
  selectedPhotoId,
  selectedPhoto,
  failedPhotos,
  onSortByChange,
  onDateFilterChange,
  onBulkEditModeToggle,
  onDeselectAll,
  onSelectAll,
  onTogglePhotoSelection,
  onSelectPhoto,
  onRemovePhoto,
  onUpdateCaption,
  onBulkUpdateCaptions,
  onBulkRemove,
}: PhotoPreviewGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Photo List */}
      <div className="lg:col-span-2 space-y-6">
        {/* Photo Grid */}
        {photos.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="flex items-center gap-2">
                  <span>Photos ({sortedAndFilteredPhotos.length})</span>
                  {failedPhotos > 0 && (
                    <Badge variant="destructive">{failedPhotos} failed</Badge>
                  )}
                </CardTitle>
              </div>

              {/* Sort and Filter Controls */}
              <div className="flex gap-3 flex-wrap items-center justify-between">
                <div className="flex gap-3 flex-wrap">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-stone-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => onSortByChange(e.target.value as typeof sortBy)}
                      className="text-sm border border-stone-300 dark:border-stone-700 rounded px-3 py-1.5 bg-white dark:bg-stone-900 dark:text-stone-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors duration-200"
                    >
                      <option value="date-desc">Newest first</option>
                      <option value="date-asc">Oldest first</option>
                      <option value="name">By filename</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  {availableDates.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-stone-500" />
                      <select
                        value={dateFilter}
                        onChange={(e) => onDateFilterChange(e.target.value)}
                        className="text-sm border border-stone-300 dark:border-stone-700 rounded px-3 py-1.5 bg-white dark:bg-stone-900 dark:text-stone-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors duration-200"
                      >
                        <option value="">All dates</option>
                        {availableDates.map(date => (
                          <option key={date} value={date}>
                            {new Date(date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Bulk Edit Toggle */}
                {photos.filter(p => !p.uploaded).length > 0 && (
                  <Button
                    variant={bulkEditMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      onBulkEditModeToggle()
                      if (bulkEditMode) {
                        onDeselectAll()
                      }
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
                  </Button>
                )}
              </div>

              {/* Bulk Edit Toolbar */}
              {bulkEditMode && (
                <div className="mt-4 p-3 bg-olive-50 dark:bg-olive-950/30 border border-olive-200 dark:border-olive-800 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-olive-900">
                        {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectedPhotoIds.size === photos.filter(p => !p.uploaded).length ? onDeselectAll : onSelectAll}
                      >
                        {selectedPhotoIds.size === photos.filter(p => !p.uploaded).length ? (
                          <>
                            <Square className="h-4 w-4 mr-1" />
                            Deselect All
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Select All
                          </>
                        )}
                      </Button>
                    </div>
                    {selectedPhotoIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const caption = prompt(`Enter caption for ${selectedPhotoIds.size} photos:`)
                            if (caption !== null) {
                              onBulkUpdateCaptions(caption)
                            }
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Set Caption
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove ${selectedPhotoIds.size} photos?`)) {
                              onBulkRemove()
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Show photos grouped by date */}
              {Object.keys(photosByDate).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(photosByDate).map(([dateStr, datePhotos]) => (
                    <div key={dateStr}>
                      <h3 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {dateStr} ({datePhotos.length})
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {datePhotos.map((photo) => {
                          const isSelected = selectedPhotoIds.has(photo.id)
                          return (
                            <div
                              key={photo.id}
                              className={cn(
                                "relative aspect-square group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                                bulkEditMode && isSelected
                                  ? "border-olive-500 ring-4 ring-olive-200"
                                  : selectedPhotoId === photo.id && !bulkEditMode
                                  ? "border-olive-500 ring-2 ring-olive-200"
                                  : "border-transparent hover:border-stone-300",
                                photo.uploaded && "opacity-70"
                              )}
                              onClick={() => {
                                if (bulkEditMode && !photo.uploaded) {
                                  onTogglePhotoSelection(photo.id)
                                } else {
                                  onSelectPhoto(photo.id)
                                }
                              }}
                            >
                              <Image
                                src={photo.preview}
                                alt={photo.file.name}
                                fill
                                className="object-cover"
                              />

                              {/* Bulk Edit Selection Checkbox */}
                              {bulkEditMode && !photo.uploaded && (
                                <div className="absolute top-2 left-2 z-10">
                                  <div className={cn(
                                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-all",
                                    isSelected
                                      ? "bg-olive-600 border-olive-600"
                                      : "bg-white/90 border-stone-300"
                                  )}>
                                    {isSelected && <CheckSquare className="h-4 w-4 text-white" />}
                                  </div>
                                </div>
                              )}

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

                              {photo.isDuplicate && !photo.uploaded && (
                                <div className="absolute top-2 left-2">
                                  <Badge variant="destructive" className="text-xs">
                                    Duplicate
                                  </Badge>
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
                              {!photo.uploading && !photo.uploaded && !bulkEditMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onRemovePhoto(photo.id)
                                  }}
                                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-90"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-stone-500 py-8">
                  No photos match the selected filters
                </p>
              )}
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

                {/* Duplicate Warning */}
                {selectedPhoto.isDuplicate && selectedPhoto.duplicateOf && (
                  <div className="p-3 bg-olive-50 border border-olive-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-olive-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-olive-900">Duplicate Photo Detected</h4>
                        <p className="text-xs text-olive-700 mt-1">
                          This photo already exists in your library.
                        </p>
                        {selectedPhoto.duplicateOf.album_id && selectedPhoto.duplicateOf.album && (
                          <p className="text-xs text-olive-600 mt-1">
                            Found in: <strong>{selectedPhoto.duplicateOf.album.title || 'Another album'}</strong>
                          </p>
                        )}
                        <p className="text-xs text-olive-700 mt-2">
                          This photo will be automatically skipped during upload.
                        </p>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemovePhoto(selectedPhoto.id)}
                            className="text-xs h-7"
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
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    value={selectedPhoto.caption || ''}
                    onChange={(e) => onUpdateCaption(selectedPhoto.id, e.target.value)}
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
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">Location</span>
                        </div>
                        <p className="text-xs text-stone-800 pl-6">
                          {selectedPhoto.exif.location.latitude.toFixed(6)}, {selectedPhoto.exif.location.longitude.toFixed(6)}
                        </p>
                        {selectedPhoto.exif.location.altitude && (
                          <p className="text-xs text-stone-600 pl-6">
                            Altitude: {selectedPhoto.exif.location.altitude.toFixed(0)}m
                          </p>
                        )}
                      </div>
                    )}

                    {/* Camera */}
                    {(selectedPhoto.exif.camera?.make || selectedPhoto.exif.camera?.model) && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Camera className="h-4 w-4" />
                          <span className="font-medium">Camera</span>
                        </div>
                        <p className="text-xs text-stone-800 pl-6">
                          {selectedPhoto.exif.camera.make} {selectedPhoto.exif.camera.model}
                        </p>
                        {selectedPhoto.exif.camera.lens && (
                          <p className="text-xs text-stone-600 pl-6">{selectedPhoto.exif.camera.lens}</p>
                        )}
                      </div>
                    )}

                    {/* Date */}
                    {selectedPhoto.exif.dateTime?.dateTimeOriginal && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Date Taken</span>
                        </div>
                        <p className="text-xs text-stone-800 pl-6">
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
            <CardContent className="pt-6 text-center text-stone-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-stone-300" />
              <p className="text-sm">Select a photo to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
