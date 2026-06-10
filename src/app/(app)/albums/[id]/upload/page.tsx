'use client'

import {
  ArrowLeft,
  Camera,
  Loader2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePhotoUploadPage } from './usePhotoUploadPage'
import { UploadDropZone } from '@/components/albums/upload/UploadDropZone'
import { UploadProgress } from '@/components/albums/upload/UploadProgress'
import { PhotoPreviewGrid } from '@/components/albums/upload/PhotoPreviewGrid'

export default function UploadPhotosPage() {
  const {
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
    dropzone,
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
    router,
  } = usePhotoUploadPage()

  const { getRootProps, getInputProps, isDragActive } = dropzone

  return (
    <div className="max-w-5xl mx-auto">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <p className="al-eyebrow">Add photos</p>
            <h1 className="al-display text-xl md:text-2xl truncate">
              Upload Photos
            </h1>
          </div>
        </div>
        <Button
          onClick={uploadPhotos}
          disabled={isUploading || photos.length === 0 || photos.every(p => p.uploaded)}
          variant="coral"
          className="cursor-pointer font-semibold px-5"
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

      <div>
        {/* Album Info */}
        {album && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
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
          <UploadProgress overallProgress={overallProgress} />
        )}

        {/* Stats */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <div className="al-stat-value text-xl sm:text-2xl tabular-nums">{photos.length}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <div className="al-stat-value text-xl sm:text-2xl tabular-nums text-primary">{uploadedPhotos}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Uploaded</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <div className="al-stat-value text-xl sm:text-2xl tabular-nums">{pendingPhotos}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Pending</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Area */}
        <div className="mb-6">
          <UploadDropZone
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            isUploading={isUploading}
            isProcessing={isProcessing}
          />
        </div>

        {/* Photo Grid + Details */}
        <PhotoPreviewGrid
          photos={photos}
          sortedAndFilteredPhotos={sortedAndFilteredPhotos}
          photosByDate={photosByDate}
          availableDates={availableDates}
          sortBy={sortBy}
          dateFilter={dateFilter}
          bulkEditMode={bulkEditMode}
          selectedPhotoIds={selectedPhotoIds}
          selectedPhotoId={selectedPhotoId}
          selectedPhoto={selectedPhoto}
          failedPhotos={failedPhotos}
          onSortByChange={setSortBy}
          onDateFilterChange={setDateFilter}
          onBulkEditModeToggle={() => setBulkEditMode(!bulkEditMode)}
          onDeselectAll={deselectAllPhotos}
          onSelectAll={selectAllPhotos}
          onTogglePhotoSelection={togglePhotoSelection}
          onSelectPhoto={setSelectedPhotoId}
          onRemovePhoto={removePhoto}
          onUpdateCaption={updateCaption}
          onBulkUpdateCaptions={bulkUpdateCaptions}
          onBulkRemove={bulkRemovePhotos}
        />
      </div>
    </div>
  )
}
