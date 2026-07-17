/**
 * Image optimization and compression utilities for Adventure Log
 * Provides client-side image processing and optimization
 */

import { log } from './logger'

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  progressive?: boolean
}

export interface OptimizedImageResult {
  blob: Blob
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  dimensions: {
    width: number
    height: number
  }
  format: string
}

export interface ImageMetadata {
  width: number
  height: number
  size: number
  format: string
  aspectRatio: number
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'jpeg',
    progressive: true
  }

  private static readonly FORMAT_MIME_TYPES = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  }

  static async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    const originalSize = file.size

    try {
      // Load image
      const img = await this.loadImage(file)
      const originalDimensions = { width: img.width, height: img.height }

      // Calculate new dimensions
      const newDimensions = this.calculateOptimalDimensions(
        originalDimensions,
        opts.maxWidth,
        opts.maxHeight
      )

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      canvas.width = newDimensions.width
      canvas.height = newDimensions.height

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Draw image with optimal sizing
      ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height)

      // Convert to optimized blob
      const mimeType = this.FORMAT_MIME_TYPES[opts.format]
      const blob = await this.canvasToBlob(canvas, mimeType, opts.quality)

      const compressionRatio = originalSize > 0 ? (originalSize - blob.size) / originalSize : 0

      log.info('Image optimization completed', {
        component: 'ImageOptimizer',
        action: 'optimize-image',
        originalSize,
        optimizedSize: blob.size,
        compressionRatio: Math.round(compressionRatio * 100),
        originalDimensions,
        newDimensions
      })

      return {
        blob,
        originalSize,
        optimizedSize: blob.size,
        compressionRatio,
        dimensions: newDimensions,
        format: opts.format
      }
    } catch (error) {
      log.error('Image optimization failed', {
        component: 'ImageOptimizer',
        action: 'optimize-image',
        fileName: file.name,
        fileSize: file.size
      }, error)
      throw error
    }
  }

  static async getImageMetadata(file: File): Promise<ImageMetadata> {
    try {
      const img = await this.loadImage(file)
      return {
        width: img.width,
        height: img.height,
        size: file.size,
        format: file.type,
        aspectRatio: img.width / img.height
      }
    } catch (error) {
      log.error('Failed to extract image metadata', {
        component: 'ImageOptimizer',
        action: 'get-metadata',
        fileName: file.name
      }, error)
      throw error
    }
  }

  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/')
  }

  static getSuggestedOptimizations(metadata: ImageMetadata): ImageOptimizationOptions {
    const { width, height, size } = metadata

    // Large images need more aggressive optimization
    if (size > 5 * 1024 * 1024) { // > 5MB
      return {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.75,
        format: 'jpeg'
      }
    }

    // High resolution images
    if (width > 3000 || height > 3000) {
      return {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'jpeg'
      }
    }

    // Medium resolution images
    if (width > 1500 || height > 1500) {
      return {
        maxWidth: 1500,
        maxHeight: 1500,
        quality: 0.85,
        format: 'jpeg'
      }
    }

    // Small images - minimal optimization
    return {
      maxWidth: width,
      maxHeight: height,
      quality: 0.9,
      format: 'jpeg'
    }
  }

  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  private static calculateOptimalDimensions(
    original: { width: number; height: number },
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = original.width / original.height

    let width = original.width
    let height = original.height

    // Scale down if exceeding max dimensions
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }

    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  private static canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob from canvas'))
          }
        },
        mimeType,
        quality
      )
    })
  }
}

// Batch optimization utility
export class BatchImageOptimizer {
  static async optimizeMultiple(
    files: File[],
    options: ImageOptimizationOptions = {},
    onProgress?: (progress: number, current: number, total: number) => void
  ): Promise<OptimizedImageResult[]> {
    const results: OptimizedImageResult[] = []
    const total = files.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        if (ImageOptimizer.isImageFile(file)) {
          // Get metadata and suggested optimizations
          const metadata = await ImageOptimizer.getImageMetadata(file)
          const suggestedOptions = ImageOptimizer.getSuggestedOptimizations(metadata)
          const finalOptions = { ...suggestedOptions, ...options }

          // Optimize image
          const result = await ImageOptimizer.optimizeImage(file, finalOptions)
          results.push(result)
        } else {
          log.warn('Skipping non-image file', {
            component: 'BatchImageOptimizer',
            fileName: file.name,
            fileType: file.type
          })
        }
      } catch (error) {
        log.error('Failed to optimize image in batch', {
          component: 'BatchImageOptimizer',
          fileName: file.name,
          index: i
        }, error)
        // Continue with other files even if one fails
      }

      // Report progress
      const progress = ((i + 1) / total) * 100
      onProgress?.(progress, i + 1, total)
    }

    log.info('Batch image optimization completed', {
      component: 'BatchImageOptimizer',
      totalFiles: total,
      successfullyOptimized: results.length
    })

    return results
  }
}

// Utility functions for common use cases
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getCompressionPercentage(original: number, optimized: number): number {
  if (original === 0) return 0
  return Math.round(((original - optimized) / original) * 100)
}

export function isImageTooLarge(file: File, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  return file.size > maxSizeBytes
}

export function shouldOptimizeImage(file: File): boolean {
  // Optimize if file is over 1MB or has large dimensions
  return file.size > 1024 * 1024 || isImageTooLarge(file, 2 * 1024 * 1024)
}

// Progressive JPEG optimization
export async function createProgressiveJPEG(file: File, quality: number = 0.85): Promise<Blob> {
  const result = await ImageOptimizer.optimizeImage(file, {
    format: 'jpeg',
    quality,
    progressive: true
  })
  return result.blob
}

// WebP conversion with fallback
export async function convertToWebPWithFallback(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<{ webp: Blob; fallback: Blob }> {
  const webpOptions = { ...options, format: 'webp' as const }
  const jpegOptions = { ...options, format: 'jpeg' as const }

  const [webpResult, fallbackResult] = await Promise.all([
    ImageOptimizer.optimizeImage(file, webpOptions),
    ImageOptimizer.optimizeImage(file, jpegOptions)
  ])

  return {
    webp: webpResult.blob,
    fallback: fallbackResult.blob
  }
}