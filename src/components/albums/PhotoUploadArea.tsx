'use client'

import { useDropzone } from 'react-dropzone'
import { Cloud, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotoUploadAreaProps {
  onFilesSelected: (files: File[]) => void
  isUploading?: boolean
}

export function PhotoUploadArea({ onFilesSelected, isUploading = false }: PhotoUploadAreaProps) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: onFilesSelected,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    },
    multiple: true,
    noClick: true, // We'll handle click via button
    noKeyboard: true
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "bg-muted/30 border border-dashed rounded-2xl p-16 text-center cursor-default transition-all flex flex-col items-center justify-center min-h-[300px]",
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/40"
      )}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-base font-medium text-foreground">Uploading photos...</p>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Cloud className="h-7 w-7 text-primary" />
          </div>

          {isDragActive ? (
            <p className="text-lg font-medium text-primary">Drop photos here</p>
          ) : (
            <>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                Drag &amp; drop photos here
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                or select them from your computer
              </p>
              <Button
                type="button"
                onClick={open}
                variant="coral"
                className="font-semibold px-6"
              >
                Select Photos
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                JPEG, PNG, WebP or HEIC · up to 10&nbsp;MB each
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
