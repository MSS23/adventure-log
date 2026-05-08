'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Zap, BookOpen, Images, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CoverPhotoPositionEditor } from '@/components/albums/CoverPhotoPositionEditor'
import { transitions } from '@/lib/animations/spring-configs'
import { useAlbumCreation } from './useAlbumCreation'
import { QuickPostMode } from '@/components/albums/create/QuickPostMode'
import { AlbumDetailsForm } from '@/components/albums/create/AlbumDetailsForm'

export default function NewAlbumPage() {
  const {
    photos,
    selectedCoverIndex,
    albumLocation,
    isSubmitting,
    error,
    positionEditorOpen,
    coverPosition,
    isExtractingLocation,
    selectedYear,
    selectedSeason,
    fileErrors,
    mode,
    suggestedTitle,
    locationAutoExtracted,
    fullForm,
    quickForm,
    setSelectedCoverIndex,
    setAlbumLocation,
    setError,
    setPositionEditorOpen,
    setCoverPosition,
    setSelectedYear,
    setSelectedSeason,
    setFileErrors,
    setMode,
    setLocationAutoExtracted,
    onDrop,
    handleTakePhoto,
    handleSelectFromGallery,
    removePhoto,
    autoFillLocationFromPhotos,
    onSubmitFull,
    onSubmitQuick,
  } = useAlbumCreation()

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Title & Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.natural}
        className="mb-6 md:mb-8"
      >
        <p className="al-eyebrow mb-2">New entry</p>
        <h1 className="al-display text-3xl md:text-4xl">Create an adventure</h1>
        <p className="text-sm text-[color:var(--color-muted-warm)] mt-2 max-w-xl leading-relaxed">
          Share your journey with the world — or keep it just for you.
        </p>

        {/* Mode Toggle — editorial pill group */}
        <div
          className="mt-5 inline-flex items-center rounded-full p-[3px] gap-0.5"
          style={{
            background: 'var(--color-ivory-alt)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 active:scale-[0.97]'
            )}
            style={
              mode === 'quick'
                ? {
                    background: 'var(--color-ink)',
                    color: 'var(--color-ivory)',
                  }
                : { background: 'transparent', color: 'var(--color-ink-soft)' }
            }
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Post
          </button>
          <button
            type="button"
            onClick={() => setMode('full')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 active:scale-[0.97]'
            )}
            style={
              mode === 'full'
                ? {
                    background: 'var(--color-ink)',
                    color: 'var(--color-ivory)',
                  }
                : { background: 'transparent', color: 'var(--color-ink-soft)' }
            }
          >
            <BookOpen className="h-3.5 w-3.5" />
            Full Album
          </button>
        </div>

        {/* Import link */}
        <div className="mt-3">
          <Link
            href="/albums/import"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold transition-all hover:translate-x-0.5"
            style={{ color: 'var(--color-coral)' }}
          >
            <Images className="h-3.5 w-3.5" />
            Import from Photos
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

        {/* Quick Post / Full Album Mode */}
        <AnimatePresence mode="wait">
          {mode === 'quick' ? (
            <QuickPostMode
              quickForm={quickForm}
              onSubmit={onSubmitQuick}
              photos={photos}
              selectedCoverIndex={selectedCoverIndex}
              albumLocation={albumLocation}
              isSubmitting={isSubmitting}
              isExtractingLocation={isExtractingLocation}
              locationAutoExtracted={locationAutoExtracted}
              fileErrors={fileErrors}
              suggestedTitle={suggestedTitle}
              selectedYear={selectedYear}
              selectedSeason={selectedSeason}
              onSetAlbumLocation={setAlbumLocation}
              onSetLocationAutoExtracted={setLocationAutoExtracted}
              onAutoFill={autoFillLocationFromPhotos}
              onYearChange={setSelectedYear}
              onSeasonChange={setSelectedSeason}
              onDrop={onDrop}
              onTakePhoto={handleTakePhoto}
              onSelectFromGallery={handleSelectFromGallery}
              onRemovePhoto={removePhoto}
              onSelectCover={setSelectedCoverIndex}
              onOpenPositionEditor={() => setPositionEditorOpen(true)}
              onClearFileErrors={() => setFileErrors([])}
              onSwitchToFull={() => setMode('full')}
            />
          ) : (
            <AlbumDetailsForm
              fullForm={fullForm}
              onSubmit={onSubmitFull}
              photos={photos}
              selectedCoverIndex={selectedCoverIndex}
              albumLocation={albumLocation}
              isSubmitting={isSubmitting}
              isExtractingLocation={isExtractingLocation}
              locationAutoExtracted={locationAutoExtracted}
              fileErrors={fileErrors}
              suggestedTitle={suggestedTitle}
              selectedYear={selectedYear}
              selectedSeason={selectedSeason}
              onSetAlbumLocation={setAlbumLocation}
              onSetLocationAutoExtracted={setLocationAutoExtracted}
              onAutoFill={autoFillLocationFromPhotos}
              onYearChange={setSelectedYear}
              onSeasonChange={setSelectedSeason}
              onDrop={onDrop}
              onTakePhoto={handleTakePhoto}
              onSelectFromGallery={handleSelectFromGallery}
              onRemovePhoto={removePhoto}
              onSelectCover={setSelectedCoverIndex}
              onOpenPositionEditor={() => setPositionEditorOpen(true)}
              onClearFileErrors={() => setFileErrors([])}
            />
          )}
        </AnimatePresence>

      {/* Cover Photo Position Editor */}
      {positionEditorOpen && photos.length > 0 && (
        <CoverPhotoPositionEditor
          imageUrl={photos[selectedCoverIndex].preview}
          isOpen={positionEditorOpen}
          onClose={() => setPositionEditorOpen(false)}
          onSave={(position) => {
            setCoverPosition(position)
            setPositionEditorOpen(false)
          }}
          currentPosition={coverPosition}
        />
      )}
    </div>
  )
}
