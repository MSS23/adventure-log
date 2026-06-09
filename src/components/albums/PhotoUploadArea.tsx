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
        "bg-white dark:bg-[#1B170E] border-2 border-dashed rounded-xl p-16 text-center cursor-default transition-all flex flex-col items-center justify-center min-h-[300px]",
        isDragActive
          ? "border-olive-500 bg-olive-50/30 dark:bg-olive-950/20"
          : "border-stone-300 dark:border-white/[0.14] hover:border-stone-400 dark:hover:border-white/[0.12]"
      )}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 text-olive-500 animate-spin" />
          <p className="text-base font-medium text-stone-700 dark:text-stone-300">Uploading photos...</p>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-olive-100 dark:bg-olive-950/40 flex items-center justify-center mb-4">
            <Cloud className="h-7 w-7 text-olive-600 dark:text-olive-400" />
          </div>

          {isDragActive ? (
            <p className="text-lg font-medium text-olive-700 dark:text-olive-300">Drop photos here</p>
          ) : (
            <>
              <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100 mb-2">
                Drag &amp; drop photos here
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
                or select them from your computer
              </p>
              <Button
                type="button"
                onClick={open}
                className="al-btn-coral text-white font-semibold px-6 py-2 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
              >
                Select Photos
              </Button>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-4">
                JPEG, PNG, WebP or HEIC · up to 10&nbsp;MB each
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
