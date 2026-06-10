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
            "border border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          <FileImage className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-base font-medium text-primary">Drop photos here</p>
          ) : (
            <div>
              <p className="text-base font-medium text-foreground mb-1">
                Tap to add photos or drag and drop
              </p>
              <p className="text-sm text-muted-foreground">
                JPEG, PNG, WebP, HEIC supported
              </p>
              {isProcessing && (
                <p className="text-sm text-primary mt-2 flex items-center justify-center gap-2">
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
