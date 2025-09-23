/**
 * React hooks for image optimization in Adventure Log
 * Provides easy-to-use hooks for image processing and upload
 */

import { useState, useCallback, useRef } from 'react'
import {
  ImageOptimizer,
  type ImageOptimizationOptions,
  type ImageMetadata,
  formatFileSize,
  getCompressionPercentage,
  shouldOptimizeImage
} from '@/lib/utils/imageOptimization'
import { log } from '@/lib/utils/logger'

export interface OptimizationProgress {
  isOptimizing: boolean
  progress: number
  currentFile: number
  totalFiles: number
  currentFileName?: string
}

export interface OptimizationResult {
  success: boolean
  originalFile: File
  optimizedBlob?: Blob
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  error?: string
}

export interface UseImageOptimizationOptions {
  autoOptimize?: boolean
  optimizationOptions?: ImageOptimizationOptions
  onProgress?: (progress: OptimizationProgress) => void
  onComplete?: (results: OptimizationResult[]) => void
  onError?: (error: string, file: File) => void
}

export function useImageOptimization(options: UseImageOptimizationOptions = {}) {
  const {
    optimizationOptions = {},
    onProgress,
    onComplete,
    onError
  } = options

  const [progress, setProgress] = useState<OptimizationProgress>({
    isOptimizing: false,
    progress: 0,
    currentFile: 0,
    totalFiles: 0
  })

  const [results, setResults] = useState<OptimizationResult[]>([])
  const abortController = useRef<AbortController | null>(null)

  const optimizeImages = useCallback(async (files: File[]): Promise<OptimizationResult[]> => {
    if (files.length === 0) return []

    abortController.current = new AbortController()
    const optimizationResults: OptimizationResult[] = []

    setProgress({
      isOptimizing: true,
      progress: 0,
      currentFile: 0,
      totalFiles: files.length
    })

    try {
      for (let i = 0; i < files.length; i++) {
        if (abortController.current.signal.aborted) break

        const file = files[i]
        const currentProgress = {
          isOptimizing: true,
          progress: (i / files.length) * 100,
          currentFile: i + 1,
          totalFiles: files.length,
          currentFileName: file.name
        }

        setProgress(currentProgress)
        onProgress?.(currentProgress)

        try {
          if (ImageOptimizer.isImageFile(file)) {
            let optimizedBlob: Blob
            const originalSize = file.size
            let optimizedSize: number

            if (shouldOptimizeImage(file)) {
              // Get metadata and suggested optimizations
              const metadata = await ImageOptimizer.getImageMetadata(file)
              const suggestedOptions = ImageOptimizer.getSuggestedOptimizations(metadata)
              const finalOptions = { ...suggestedOptions, ...optimizationOptions }

              log.info('Optimizing image', {
                component: 'useImageOptimization',
                action: 'optimize-single',
                fileName: file.name,
                originalSize,
                optimizationOptions: finalOptions
              })

              const result = await ImageOptimizer.optimizeImage(file, finalOptions)
              optimizedBlob = result.blob
              optimizedSize = result.optimizedSize

              optimizationResults.push({
                success: true,
                originalFile: file,
                optimizedBlob,
                originalSize,
                optimizedSize,
                compressionRatio: result.compressionRatio
              })
            } else {
              // File doesn't need optimization
              optimizedBlob = file
              optimizedSize = file.size

              optimizationResults.push({
                success: true,
                originalFile: file,
                optimizedBlob,
                originalSize,
                optimizedSize,
                compressionRatio: 0
              })
            }
          } else {
            throw new Error('File is not a valid image')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          log.error('Image optimization failed', {
            component: 'useImageOptimization',
            action: 'optimize-single',
            fileName: file.name
          }, error)

          optimizationResults.push({
            success: false,
            originalFile: file,
            originalSize: file.size,
            optimizedSize: 0,
            compressionRatio: 0,
            error: errorMessage
          })

          onError?.(errorMessage, file)
        }
      }

      const finalProgress = {
        isOptimizing: false,
        progress: 100,
        currentFile: files.length,
        totalFiles: files.length
      }

      setProgress(finalProgress)
      onProgress?.(finalProgress)
      setResults(optimizationResults)
      onComplete?.(optimizationResults)

      log.info('Image optimization batch completed', {
        component: 'useImageOptimization',
        totalFiles: files.length,
        successfulOptimizations: optimizationResults.filter(r => r.success).length
      })

      return optimizationResults
    } catch (error) {
      log.error('Image optimization batch failed', {
        component: 'useImageOptimization'
      }, error)

      setProgress({
        isOptimizing: false,
        progress: 0,
        currentFile: 0,
        totalFiles: 0
      })

      throw error
    }
  }, [optimizationOptions, onProgress, onComplete, onError])

  const optimizeSingleImage = useCallback(async (file: File): Promise<OptimizationResult> => {
    const results = await optimizeImages([file])
    return results[0]
  }, [optimizeImages])

  const cancelOptimization = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
      setProgress({
        isOptimizing: false,
        progress: 0,
        currentFile: 0,
        totalFiles: 0
      })

      log.info('Image optimization cancelled', {
        component: 'useImageOptimization'
      })
    }
  }, [])

  const getOptimizationSummary = useCallback(() => {
    if (results.length === 0) return null

    const successful = results.filter(r => r.success)
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0)
    const totalOptimizedSize = successful.reduce((sum, r) => sum + r.optimizedSize, 0)
    const totalSavings = totalOriginalSize - totalOptimizedSize
    const averageCompression = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.compressionRatio, 0) / successful.length
      : 0

    return {
      totalFiles: results.length,
      successfulOptimizations: successful.length,
      failedOptimizations: results.length - successful.length,
      totalOriginalSize,
      totalOptimizedSize,
      totalSavings,
      averageCompression: Math.round(averageCompression * 100),
      formattedSavings: formatFileSize(totalSavings),
      formattedOriginalSize: formatFileSize(totalOriginalSize),
      formattedOptimizedSize: formatFileSize(totalOptimizedSize)
    }
  }, [results])

  return {
    // State
    progress,
    results,
    isOptimizing: progress.isOptimizing,

    // Actions
    optimizeImages,
    optimizeSingleImage,
    cancelOptimization,

    // Utilities
    getOptimizationSummary,

    // Helper functions
    formatFileSize,
    getCompressionPercentage,
    shouldOptimizeImage: (file: File) => shouldOptimizeImage(file)
  }
}

// Hook for getting image metadata
export function useImageMetadata() {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMetadata = useCallback(async (file: File) => {
    if (!ImageOptimizer.isImageFile(file)) {
      setError('File is not a valid image')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const result = await ImageOptimizer.getImageMetadata(file)
      setMetadata(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get image metadata'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setMetadata(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    metadata,
    loading,
    error,
    getMetadata,
    reset
  }
}

// Hook for drag and drop with automatic optimization
export function useOptimizedDropzone(options: UseImageOptimizationOptions = {}) {
  const optimization = useImageOptimization(options)
  const [isDragActive, setIsDragActive] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      ImageOptimizer.isImageFile(file)
    )

    if (files.length > 0) {
      setDroppedFiles(files)
      if (options.autoOptimize !== false) {
        await optimization.optimizeImages(files)
      }
    }
  }, [optimization, options.autoOptimize])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      ImageOptimizer.isImageFile(file)
    )

    if (files.length > 0) {
      setDroppedFiles(files)
      if (options.autoOptimize !== false) {
        await optimization.optimizeImages(files)
      }
    }
  }, [optimization, options.autoOptimize])

  return {
    ...optimization,
    isDragActive,
    droppedFiles,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },
    handleFileInput
  }
}