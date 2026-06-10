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
        <Card>
          <CardContent className="py-4 text-center">
            <p className="al-stat-value text-2xl">
              {processedPhotos.length}
            </p>
            <p className="text-xs text-muted-foreground">Photos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="al-stat-value text-2xl">
              {groups.length}
            </p>
            <p className="text-xs text-muted-foreground">Albums</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="al-stat-value text-2xl">
              {photosWithLocation}
            </p>
            <p className="text-xs text-muted-foreground">With GPS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="al-stat-value text-2xl">
              {formatFileSize(totalFileSize)}
            </p>
            <p className="text-xs text-muted-foreground">Total Size</p>
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
          <div className="text-sm text-muted-foreground">
            {groups.length} album{groups.length !== 1 ? 's' : ''} with{' '}
            {groups.reduce((sum, g) => sum + g.photos.length, 0)} photos will be created
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onResetToDropzone}
              className="cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button
              onClick={onStartUpload}
              className="cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Create {groups.length} Album{groups.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <Images className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
            <p className="text-muted-foreground">
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
