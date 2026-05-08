'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  MapPin,
  Calendar,
  X,
  Trash2,
  Merge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PhotoGroup } from './types'
import { formatDateRange } from './utils'

interface PhotoGroupCardProps {
  group: PhotoGroup
  mergeTarget: string | null
  onRename: (groupId: string, newName: string) => void
  onRemoveGroup: (groupId: string) => void
  onRemovePhoto: (groupId: string, photoId: string) => void
  onToggleExpanded: (groupId: string) => void
  onSetMergeTarget: (groupId: string | null) => void
  onMerge: (groupId1: string, groupId2: string) => void
}

export function PhotoGroupCard({
  group,
  mergeTarget,
  onRename,
  onRemoveGroup,
  onRemovePhoto,
  onToggleExpanded,
  onSetMergeTarget,
  onMerge,
}: PhotoGroupCardProps) {
  return (
    <Card className="bg-white dark:bg-[#111111] border-stone-200/50 dark:border-stone-800/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className="bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 text-xs"
              >
                {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
              </Badge>
              {group.centerLat !== null && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  GPS
                </Badge>
              )}
            </div>
            <input
              type="text"
              value={group.name}
              onChange={(e) => onRename(group.id, e.target.value)}
              className="text-lg font-semibold text-stone-900 dark:text-stone-100 bg-transparent border-none outline-none w-full focus:ring-0 p-0 placeholder:text-stone-400"
              placeholder="Album name..."
            />
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
              {group.locationName !== 'No location data' && group.locationName !== 'Loading...' && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {group.locationName}
                </span>
              )}
              {group.dateStart && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateRange(group.dateStart, group.dateEnd)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {mergeTarget === null ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetMergeTarget(group.id)}
                title="Merge with another album"
                className="h-8 w-8 p-0"
              >
                <Merge className="h-4 w-4" />
              </Button>
            ) : mergeTarget === group.id ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetMergeTarget(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onMerge(mergeTarget, group.id)
                  onSetMergeTarget(null)
                }}
                className="h-8 text-xs bg-olive-600 hover:bg-olive-700 cursor-pointer transition-all duration-200 active:scale-[0.97]"
              >
                Merge here
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Remove album "${group.name}" and all its photos from import?`)) {
                  onRemoveGroup(group.id)
                }
              }}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 cursor-pointer transition-all duration-200 active:scale-[0.90]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpanded(group.id)}
              className="h-8 w-8 p-0"
            >
              {group.expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {group.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {group.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <Image
                      src={photo.preview}
                      alt={photo.file.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, 12.5vw"
                    />
                    <button
                      onClick={() => onRemovePhoto(group.id, photo.id)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-0.5">
                        {photo.lat !== null && (
                          <MapPin className="h-2.5 w-2.5 text-white" />
                        )}
                        {photo.date !== null && (
                          <Calendar className="h-2.5 w-2.5 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
