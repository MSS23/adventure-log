'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Images, FileImage, MapPin, FolderPlus, Upload, Globe2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DropZoneProps {
  getRootProps: () => Record<string, unknown>
  getInputProps: () => Record<string, unknown>
  isDragActive: boolean
  maxPhotos: number
}

export function DropZone({ getRootProps, getInputProps, isDragActive, maxPhotos }: DropZoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-16 md:p-24 text-center cursor-pointer transition-all duration-300",
          isDragActive
            ? "border-olive-500 bg-olive-50/50 dark:bg-olive-900/20 scale-[1.02]"
            : "border-stone-300 dark:border-stone-700 hover:border-olive-400 dark:hover:border-olive-600 hover:bg-stone-50 dark:hover:bg-stone-900/50"
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
            <Images className="h-10 w-10 text-olive-600 dark:text-olive-400" />
          </div>
        </motion.div>

        {isDragActive ? (
          <p className="text-xl font-semibold text-olive-600 dark:text-olive-400">
            Drop your photos here
          </p>
        ) : (
          <div>
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Drag and drop your photos
            </p>
            <p className="text-stone-500 dark:text-stone-400 mb-4">
              or click to browse files
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-400 dark:text-stone-500">
              <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                <FileImage className="h-3.5 w-3.5" />
                JPG, PNG, WebP
              </span>
              <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                <Images className="h-3.5 w-3.5" />
                Up to {maxPhotos} photos
              </span>
              <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                <MapPin className="h-3.5 w-3.5" />
                Auto GPS extraction
              </span>
              <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full">
                <FolderPlus className="h-3.5 w-3.5" />
                Smart grouping
              </span>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Upload,
            title: 'Drop Photos',
            desc: 'Select up to 200 photos from your camera roll or file system.',
          },
          {
            icon: Globe2,
            title: 'Auto-Group',
            desc: 'Photos are grouped by date and GPS location into trip albums.',
          },
          {
            icon: FolderPlus,
            title: 'Create Albums',
            desc: 'Review groups, rename them, then upload. Albums are created automatically.',
          },
        ].map((step, i) => (
          <Card key={i} className="bg-white/50 dark:bg-[#111111]/50 border-stone-200/50 dark:border-stone-800/50">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                <step.icon className="h-6 w-6 text-olive-600 dark:text-olive-400" />
              </div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">{step.title}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">{step.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  )
}
