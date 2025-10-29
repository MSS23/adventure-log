'use client'

import { useDropzone } from 'react-dropzone'
import { CloudUpload, Loader2 } from 'lucide-react'
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
        "border-2 border-dashed rounded-xl p-8 text-center cursor-default transition-all min-h-64 flex flex-col items-center justify-center",
        isDragActive
          ? "border-teal-500 bg-teal-50"
          : "border-gray-300 bg-gray-50"
      )}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 text-teal-500 animate-spin" />
          <p className="text-base font-medium text-gray-700">Uploading photos...</p>
        </div>
      ) : (
        <>
          <CloudUpload className="h-16 w-16 text-teal-500 mb-4" />

          {isDragActive ? (
            <p className="text-lg font-medium text-teal-700">Drop photos here</p>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Drag & Drop Photos Here
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                or select from your computer
              </p>
              <Button
                type="button"
                onClick={open}
                className="bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg px-6 py-2.5"
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
