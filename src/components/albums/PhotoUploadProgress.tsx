'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle2, XCircle, Loader2, Image as ImageIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface UploadProgress {
  id: string
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  preview?: string
}

interface PhotoUploadProgressProps {
  uploads: UploadProgress[]
  onClose?: () => void
  className?: string
}

export function PhotoUploadProgress({ uploads, onClose, className }: PhotoUploadProgressProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const completedCount = uploads.filter(u => u.status === 'complete').length
  const totalCount = uploads.length
  const hasErrors = uploads.some(u => u.status === 'error')

  const overallProgress = uploads.length > 0
    ? Math.round(uploads.reduce((acc, u) => acc + u.progress, 0) / uploads.length)
    : 0

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing...'
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Failed'
    }
  }

  if (uploads.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={cn(
          'fixed bottom-20 right-4 z-40 w-96 max-w-[calc(100vw-2rem)]',
          className
        )}
      >
        <Card className="shadow-2xl border-2">
          <CardContent className="p-4">
            {/* Header */}
            <div
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    Uploading Photos
                  </h3>
                  <p className="text-xs text-gray-500">
                    {completedCount} of {totalCount} complete
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMinimized(!isMinimized)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                {isMinimized ? '▲' : '▼'}
              </button>
            </div>

            {/* Overall Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Overall Progress</span>
                <span className="text-xs font-semibold text-gray-900">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Individual Upload Items */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 max-h-64 overflow-y-auto"
                >
                  {uploads.map((upload) => (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                    >
                      {/* Preview Thumbnail */}
                      {upload.preview ? (
                        <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={upload.preview}
                            alt={upload.fileName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}

                      {/* Upload Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {upload.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(upload.status)}
                          <span className="text-xs text-gray-500">
                            {upload.error || getStatusText(upload.status)}
                          </span>
                        </div>
                        {upload.status !== 'complete' && upload.status !== 'error' && (
                          <Progress value={upload.progress} className="h-1 mt-2" />
                        )}
                      </div>

                      {/* Progress Percentage */}
                      {upload.status !== 'complete' && upload.status !== 'error' && (
                        <span className="text-xs font-semibold text-gray-600 flex-shrink-0">
                          {upload.progress}%
                        </span>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            {completedCount === totalCount && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-4 border-t"
              >
                <button
                  onClick={onClose}
                  className={cn(
                    'w-full py-2 rounded-lg font-medium text-sm transition-colors',
                    hasErrors
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  )}
                >
                  {hasErrors ? 'Some uploads failed' : 'All uploads complete'}
                </button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
