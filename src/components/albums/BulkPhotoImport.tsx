'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UserNav } from '@/components/layout/UserNav'
import { useBulkImport } from './bulk-import/useBulkImport'
import { DropZone } from './bulk-import/DropZone'
import { PhotoGroupList } from './bulk-import/PhotoGroupList'
import { formatFileSize } from './bulk-import/utils'

export function BulkPhotoImport() {
  const {
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
    dropzone,
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
    MAX_PHOTOS,
  } = useBulkImport()

  const { getRootProps, getInputProps, isDragActive } = dropzone

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
                    resetToDropzone()
                  }
                } else if (stage === 'dropzone') {
                  router.push('/albums/new')
                }
              }}
              disabled={stage === 'processing' || stage === 'uploading'}
              className="cursor-pointer transition-all duration-200 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
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
                  className="text-red-500 underline text-xs mt-1 cursor-pointer hover:text-red-700 transition-colors duration-200"
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

        {/* STAGE 1: DROP ZONE */}
        {stage === 'dropzone' && (
          <DropZone
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            maxPhotos={MAX_PHOTOS}
          />
        )}

        {/* STAGE 2: PROCESSING */}
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

        {/* STAGE 3: REVIEW & GROUP */}
        {stage === 'review' && (
          <PhotoGroupList
            groups={groups}
            processedPhotos={processedPhotos}
            totalFileSize={totalFileSize}
            photosWithLocation={photosWithLocation}
            mergeTarget={mergeTarget}
            onRenameGroup={renameGroup}
            onRemoveGroup={removeGroup}
            onRemovePhotoFromGroup={removePhotoFromGroup}
            onToggleGroupExpanded={toggleGroupExpanded}
            onSetMergeTarget={setMergeTarget}
            onMergeGroups={mergeGroups}
            onStartUpload={startUpload}
            onResetToDropzone={resetToDropzone}
          />
        )}

        {/* STAGE 4: UPLOADING */}
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

        {/* STAGE 5: COMPLETE */}
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
                      className="cursor-pointer bg-olive-600 hover:bg-olive-700 text-white transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      View First Album
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push('/profile')}
                    className="cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
                    onClick={resetAll}
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
