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
        "bg-white border-2 border-dashed rounded-xl p-16 text-center cursor-default transition-all flex flex-col items-center justify-center min-h-[300px]",
        isDragActive
          ? "border-olive-500 bg-olive-50/30"
          : "border-stone-300 hover:border-stone-400"
      )}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 text-olive-500 animate-spin" />
          <p className="text-base font-medium text-stone-700">Uploading photos...</p>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-olive-100 flex items-center justify-center mb-4">
            <Cloud className="h-7 w-7 text-olive-600" />
          </div>

          {isDragActive ? (
            <p className="text-lg font-medium text-olive-700">Drop photos here</p>
          ) : (
            <>
              <h3 className="text-lg font-medium text-stone-900 mb-2">
                Drag & Drop Photos Here
              </h3>
              <p className="text-sm text-stone-500 mb-6">
                or select from your computer
              </p>
              <Button
                type="button"
                onClick={open}
                className="bg-olive-500 hover:bg-olive-600 text-white font-medium rounded-md px-5 py-2"
              >
                Select Files
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}
