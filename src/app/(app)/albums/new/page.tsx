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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Create a New Adventure
        </h1>
        <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 mt-1">Share your journey with the world</p>

        {/* Mode Toggle */}
        <div className="mt-4 inline-flex items-center bg-stone-100 dark:bg-[#1A1A1A] rounded-xl p-1 gap-0.5">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none",
              mode === 'quick'
                ? "bg-white dark:bg-[#252525] text-olive-700 dark:text-olive-300 shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            )}
          >
            <Zap className="h-4 w-4" />
            Quick Post
          </button>
          <button
            type="button"
            onClick={() => setMode('full')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none",
              mode === 'full'
                ? "bg-white dark:bg-[#252525] text-olive-700 dark:text-olive-300 shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            )}
          >
            <BookOpen className="h-4 w-4" />
            Full Album
          </button>
        </div>

        {/* Import from Photos Link */}
        <div className="mt-3">
          <Link
            href="/albums/import"
            className="inline-flex items-center gap-2 text-sm text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium transition-all duration-200 cursor-pointer hover:translate-x-0.5"
          >
            <Images className="h-4 w-4" />
            Import from Photos
            <ChevronRight className="h-3.5 w-3.5" />
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
