'use client'

import { motion } from 'framer-motion'
import {
  Upload,
  RotateCcw,
  Images,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ProcessedPhoto, PhotoGroup } from './types'
import { formatFileSize } from './utils'
import { PhotoGroupCard } from './PhotoGroupCard'

interface PhotoGroupListProps {
  groups: PhotoGroup[]
  processedPhotos: ProcessedPhoto[]
  totalFileSize: number
  photosWithLocation: number
  mergeTarget: string | null
  onRenameGroup: (groupId: string, newName: string) => void
  onRemoveGroup: (groupId: string) => void
  onRemovePhotoFromGroup: (groupId: string, photoId: string) => void
  onToggleGroupExpanded: (groupId: string) => void
  onSetMergeTarget: (groupId: string | null) => void
  onMergeGroups: (groupId1: string, groupId2: string) => void
  onStartUpload: () => void
  onResetToDropzone: () => void
}

export function PhotoGroupList({
  groups,
  processedPhotos,
  totalFileSize,
  photosWithLocation,
  mergeTarget,
  onRenameGroup,
  onRemoveGroup,
  onRemovePhotoFromGroup,
  onToggleGroupExpanded,
  onSetMergeTarget,
  onMergeGroups,
  onStartUpload,
  onResetToDropzone,
}: PhotoGroupListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
              {processedPhotos.length}
            </p>
            <p className="text-xs text-stone-500">Photos</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
              {groups.length}
            </p>
            <p className="text-xs text-stone-500">Albums</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
              {photosWithLocation}
            </p>
            <p className="text-xs text-stone-500">With GPS</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">
              {formatFileSize(totalFileSize)}
            </p>
            <p className="text-xs text-stone-500">Total Size</p>
          </CardContent>
        </Card>
      </div>

      {/* Album Groups */}
      <div className="space-y-4">
        {groups.map((group) => (
          <PhotoGroupCard
            key={group.id}
            group={group}
            mergeTarget={mergeTarget}
            onRename={onRenameGroup}
            onRemoveGroup={onRemoveGroup}
            onRemovePhoto={onRemovePhotoFromGroup}
            onToggleExpanded={onToggleGroupExpanded}
            onSetMergeTarget={onSetMergeTarget}
            onMerge={onMergeGroups}
          />
        ))}
      </div>

      {/* Action Bar */}
      {groups.length > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-stone-500 dark:text-stone-400">
            {groups.length} album{groups.length !== 1 ? 's' : ''} with{' '}
            {groups.reduce((sum, g) => sum + g.photos.length, 0)} photos will be created
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onResetToDropzone}
              className="cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button
              onClick={onStartUpload}
              className="cursor-pointer bg-olive-600 hover:bg-olive-700 text-white transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              Create {groups.length} Album{groups.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <Card className="mt-6 bg-white dark:bg-[#111111]">
          <CardContent className="py-12 text-center">
            <Images className="h-12 w-12 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
            <p className="text-stone-500 dark:text-stone-400">
              All groups have been removed. Start over to try again.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={onResetToDropzone}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
