'use client'

import { Loader2, FileImage } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface UploadDropZoneProps {
  getRootProps: () => Record<string, unknown>
  getInputProps: () => Record<string, unknown>
  isDragActive: boolean
  isUploading: boolean
  isProcessing: boolean
}

export function UploadDropZone({
  getRootProps,
  getInputProps,
  isDragActive,
  isUploading,
  isProcessing,
}: UploadDropZoneProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-olive-500 bg-olive-50 dark:bg-olive-950/30"
              : "border-stone-300 dark:border-stone-700 hover:border-olive-400 dark:hover:border-olive-600 hover:bg-stone-50 dark:hover:bg-stone-900/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          <FileImage className="h-12 w-12 mx-auto mb-3 text-stone-400 dark:text-stone-500" />
          {isDragActive ? (
            <p className="text-base font-medium text-olive-600 dark:text-olive-400">Drop photos here</p>
          ) : (
            <div>
              <p className="text-base font-medium text-stone-900 dark:text-stone-100 mb-1">
                Tap to add photos or drag and drop
              </p>
              <p className="text-sm text-stone-500">
                JPEG, PNG, WebP, HEIC supported
              </p>
              {isProcessing && (
                <p className="text-sm text-olive-600 mt-2 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing EXIF data...
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
