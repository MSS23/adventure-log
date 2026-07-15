'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  Loader2,
  Upload,
  CheckCircle,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useBulkImport } from './bulk-import/useBulkImport'
import { localizePath } from '@/lib/utils/native-routes'
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
  const stageIndex = {
    dropzone: 0,
    processing: 0,
    review: 1,
    uploading: 2,
    complete: 3,
  }[stage]

  return (
    <div className="min-h-screen bg-background">
      <header className="mb-6 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-resting)] sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
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
              className="cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading text-lg font-semibold text-foreground">
                Turn photos into memories
              </h1>
              <p className="text-xs text-muted-foreground">
                {stage === 'dropzone' && 'Choose a camera-roll batch to begin'}
                {stage === 'processing' && 'Reading dates and places on this device...'}
                {stage === 'review' && `${groups.length} memor${groups.length === 1 ? 'y' : 'ies'} ready for your review`}
                {stage === 'uploading' && 'Keeping your memories privately...'}
                {stage === 'complete' && 'Your memories are ready'}
              </p>
            </div>
          </div>
        </div>

        <ol aria-label="Import progress" className="mt-5 grid grid-cols-4 gap-2">
          {['Select', 'Review', 'Keep', 'Done'].map((label, index) => {
            const isComplete = index < stageIndex
            const isCurrent = index === stageIndex
            return (
              <li key={label} className="min-w-0">
                <div
                  className={`h-1 rounded-full transition-colors duration-200 ${
                    index <= stageIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-hidden
                />
                <span
                  className={`mt-1.5 flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wider ${
                    isCurrent || isComplete ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete && <Check className="h-3 w-3 text-primary" aria-hidden />}
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
      </header>

      <main>
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="rounded-sm text-destructive underline text-xs mt-1 cursor-pointer hover:opacity-80 transition-opacity duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
              className="mb-6 p-4 bg-[color:var(--color-gold)]/15 border border-[color:var(--color-gold)]/25 rounded-xl text-[color:var(--color-gold)] text-sm flex items-start gap-3"
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
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Finding the shape of your trip
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Reading dates and locations so related moments stay together
                </p>

                <div className="space-y-3">
                  <Progress value={processingProgress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate max-w-[200px]">{processingFile}</span>
                    <span>{Math.round(processingProgress)}%</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {files.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {formatFileSize(totalFileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground">Size</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {Math.round(processingProgress)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Done</p>
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
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Keeping Your Memories
                </h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Uploading your approved groups as private memories
                </p>
                {uploadingGroup && (
                  <p className="text-xs text-primary mb-6">
                    Current: {uploadingGroup}
                  </p>
                )}

                <div className="space-y-3">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
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
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  {groups.some(g => g.centerLat !== null)
                    ? 'Your globe just lit up'
                    : 'Your memories are ready'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {createdAlbumIds.length} memor{createdAlbumIds.length === 1 ? 'y' : 'ies'} kept
                  with {groups.reduce((sum, g) => sum + g.photos.length, 0)} photos
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {/* The payoff moment: send them to their pinned globe first. */}
                  <Button
                    onClick={() => router.push(localizePath('/globe'))}
                    className="cursor-pointer"
                  >
                    <Globe2 className="h-4 w-4 mr-2" />
                    Open Your Globe
                  </Button>
                  {createdAlbumIds.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => router.push(localizePath(`/albums/${createdAlbumIds[0]}`))}
                      className="cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Open First Memory
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={resetAll}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Keep More Photos
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
