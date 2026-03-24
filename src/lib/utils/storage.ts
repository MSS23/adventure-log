import { createClient } from '@/lib/supabase/client'
import { log } from './logger'
import { moderateImage } from '@/lib/services/moderation'

export interface StorageBucketConfig {
  id: string
  name: string
  public: boolean
  fileSizeLimit: number
  allowedMimeTypes: string[]
}

export const STORAGE_BUCKETS: StorageBucketConfig[] = [
  {
    id: 'photos',
    name: 'photos',
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  },
  {
    id: 'avatars',
    name: 'avatars',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'covers',
    name: 'covers',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
]

export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public bucket?: string,
    public filePath?: string
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export class StorageHelper {
  private supabase = createClient()

  // Simple upload method - bypass validation for direct upload
  async simpleUpload(bucketId: string, filePath: string, file: File): Promise<string> {
    log.info('SIMPLE UPLOAD: Starting basic upload (bypassing validation)', {
      component: 'Storage',
      action: 'simple-upload-start',
      bucketId,
      filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    try {
      const { data, error } = await this.supabase.storage
        .from(bucketId)
        .upload(filePath, file)

      log.info('SIMPLE UPLOAD: Response received', { component: 'Storage', action: 'simple-upload-response', hasData: !!data, hasError: !!error })

      if (error) {
        log.error('SIMPLE UPLOAD: Failed', { component: 'Storage', action: 'simple-upload-failed', bucketId, filePath }, error as Error)
        throw new StorageError(
          `Simple upload failed: ${error.message}`,
          'SIMPLE_UPLOAD_FAILED',
          bucketId,
          filePath
        )
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath)

      log.info('SIMPLE UPLOAD: Success', { component: 'Storage', action: 'simple-upload-success', publicUrl: urlData.publicUrl })

      return urlData.publicUrl
    } catch (error) {
      log.error('SIMPLE UPLOAD: Exception', { component: 'Storage', action: 'simple-upload-exception' }, error as Error)
      throw error
    }
  }

  async checkBucketExists(bucketId: string): Promise<boolean> {
    // Skip bucket existence check to avoid 400 errors from getBucket()
    // Just assume bucket exists and let upload fail naturally if it doesn't
    log.info('Skipping bucket check (assumes bucket exists)', { component: 'Storage', action: 'check-bucket', bucketId })
    return true
  }

  async validateFile(file: File, bucketId: string): Promise<void> {
    log.info('File validation details', { component: 'Storage', action: 'validate-file', fileName: file.name, fileSize: file.size, fileType: file.type, bucketId })

    const bucket = STORAGE_BUCKETS.find(b => b.id === bucketId)
    if (!bucket) {
      log.error('Unknown bucket', { component: 'Storage', action: 'validate-file', bucketId })
      throw new StorageError(`Unknown bucket: ${bucketId}`, 'UNKNOWN_BUCKET', bucketId)
    }
    log.info('Bucket config found', { component: 'Storage', action: 'validate-file', bucketId })

    // Check file size
    log.info('Size check', { component: 'Storage', action: 'validate-file-size', fileSize: file.size, fileSizeMB: (file.size / 1024 / 1024).toFixed(2) + 'MB', limit: bucket.fileSizeLimit, limitMB: Math.round(bucket.fileSizeLimit / 1024 / 1024) + 'MB' })

    if (file.size > bucket.fileSizeLimit) {
      const maxSizeMB = Math.round(bucket.fileSizeLimit / 1024 / 1024)
      log.error('File too large', { component: 'Storage', action: 'validate-file-size', fileSize: file.size, maxSize: bucket.fileSizeLimit, maxSizeMB })
      throw new StorageError(
        `File too large. Maximum size is ${maxSizeMB}MB`,
        'FILE_TOO_LARGE',
        bucketId
      )
    }
    log.info('File size check passed', { component: 'Storage', action: 'validate-file-size' })

    // Check mime type
    log.info('MIME type check', { component: 'Storage', action: 'validate-mime-type', fileType: file.type, allowedTypes: bucket.allowedMimeTypes, isAllowed: bucket.allowedMimeTypes.includes(file.type) })

    if (!bucket.allowedMimeTypes.includes(file.type)) {
      log.error('Invalid file type', { component: 'Storage', action: 'validate-mime-type', fileType: file.type, allowedTypes: bucket.allowedMimeTypes })
      throw new StorageError(
        `File type not allowed. Supported types: ${bucket.allowedMimeTypes.join(', ')}`,
        'INVALID_FILE_TYPE',
        bucketId
      )
    }
    log.info('MIME type check passed', { component: 'Storage', action: 'validate-mime-type' })
  }

  async uploadWithRetry(
    bucketId: string,
    filePath: string,
    file: File,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<string> {
    const { maxRetries = 3, retryDelay = 1000 } = options

    log.info('Starting upload process', { component: 'Storage', action: 'upload-start', bucketId, filePath, fileName: file.name, fileSize: file.size, fileType: file.type })

    // Validate file first
    log.info('Starting file validation', { component: 'Storage', action: 'upload-validate' })
    await this.validateFile(file, bucketId)
    log.info('File validation passed', { component: 'Storage', action: 'upload-validate' })

    // Check if bucket exists (non-blocking check)
    log.info('Checking bucket existence', { component: 'Storage', action: 'upload-bucket-check' })
    const bucketExists = await this.checkBucketExists(bucketId)
    log.info('Bucket check result', { component: 'Storage', action: 'upload-bucket-check', bucketId, exists: bucketExists })

    if (!bucketExists) {
      log.warn('Bucket check failed, but proceeding anyway (bucket might exist)', { component: 'Storage', action: 'upload-bucket-check', bucketId })
      // Don't throw error - bucket might exist but check could fail due to permissions
      // We'll let the upload attempt proceed and fail naturally if bucket truly doesn't exist
    } else {
      log.info('Bucket exists, proceeding with upload', { component: 'Storage', action: 'upload-bucket-check' })
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log.info('Attempting file upload', {
          component: 'StorageHelper',
          action: 'uploadWithRetry',
          bucketId,
          filePath,
          fileName: file.name,
          fileSize: file.size,
          attempt,
          maxRetries
        })

        log.info(`Attempt ${attempt}: Starting Supabase upload`, { component: 'Storage', action: 'upload-attempt', attempt })
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from(bucketId)
          .upload(filePath, file)

        log.info(`Attempt ${attempt}: Upload response`, { component: 'Storage', action: 'upload-response', hasData: !!uploadData, hasError: !!uploadError, errorMessage: uploadError?.message })

        if (uploadError) {
          log.error(`Upload failed on attempt ${attempt}`, { component: 'Storage', action: 'upload-failed', attempt }, uploadError as Error)
          throw new StorageError(
            uploadError.message,
            'UPLOAD_FAILED',
            bucketId,
            filePath
          )
        }
        log.info(`Upload successful on attempt ${attempt}`, { component: 'Storage', action: 'upload-success', attempt })

        // Get public URL
        const { data } = this.supabase.storage
          .from(bucketId)
          .getPublicUrl(filePath)

        log.info('File upload successful', {
          component: 'StorageHelper',
          action: 'uploadWithRetry',
          bucketId,
          filePath,
          publicUrl: data.publicUrl,
          attempt
        })

        return data.publicUrl

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        log.warn('Upload attempt failed', {
          component: 'StorageHelper',
          action: 'uploadWithRetry',
          bucketId,
          filePath,
          attempt,
          maxRetries,
          error: lastError.message
        })

        // Don't retry on validation errors or client errors
        if (error instanceof StorageError &&
            ['FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'BUCKET_NOT_FOUND'].includes(error.code)) {
          throw error
        }

        // Wait before retrying (except on last attempt)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        }
      }
    }

    // All retries failed - try simple upload as fallback
    log.warn('Complex upload failed, trying simple upload fallback', { component: 'Storage', action: 'upload-fallback' })
    try {
      const result = await this.simpleUpload(bucketId, filePath, file)
      log.info('FALLBACK SUCCESS: Simple upload worked', { component: 'Storage', action: 'upload-fallback-success' })
      return result
    } catch (fallbackError) {
      log.error('FALLBACK FAILED: Both complex and simple upload failed', { component: 'Storage', action: 'upload-fallback-failed' })
      throw new StorageError(
        `Upload failed after ${maxRetries} attempts and fallback: ${lastError?.message || 'Unknown error'}. Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        'ALL_UPLOAD_METHODS_FAILED',
        bucketId,
        filePath
      )
    }
  }

  async deleteFile(bucketId: string, filePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucketId)
        .remove([filePath])

      if (error) {
        throw new StorageError(
          error.message,
          'DELETE_FAILED',
          bucketId,
          filePath
        )
      }

      log.info('File deleted successfully', {
        component: 'StorageHelper',
        action: 'deleteFile',
        bucketId,
        filePath
      })

    } catch (error) {
      log.error('File deletion failed', {
        component: 'StorageHelper',
        action: 'deleteFile',
        bucketId,
        filePath
      }, error instanceof Error ? error : new Error(String(error)))

      if (error instanceof StorageError) {
        throw error
      }

      throw new StorageError(
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
        'DELETE_FAILED',
        bucketId,
        filePath
      )
    }
  }

  generateUniqueFilePath(originalFileName: string, userId?: string): string {
    const fileExt = originalFileName.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const userPrefix = userId ? `${userId}-` : ''
    return `${userPrefix}${timestamp}-${randomId}.${fileExt}`
  }
}

// Export singleton instance
export const storageHelper = new StorageHelper()

// Helper function to get user-friendly error messages
export const getUploadErrorMessage = (error: unknown): string => {
  if (error instanceof StorageError) {
    switch (error.code) {
      case 'FILE_TOO_LARGE':
        return `Image is too large. Please compress or choose a smaller image (max 50MB).`
      case 'INVALID_FILE_TYPE':
        return `File type not supported. Please use JPEG, PNG, WebP, or GIF images.`
      case 'BUCKET_NOT_FOUND':
        return `Storage system error. Please try again or contact support.`
      case 'SIMPLE_UPLOAD_FAILED':
        return `Upload failed: ${error.message}`
      case 'ALL_UPLOAD_METHODS_FAILED':
        return `Upload failed after multiple attempts. Please check your connection and try again.`
      default:
        return error.message || 'Upload failed. Please try again.'
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('413') || error.message.includes('too large')) {
      return 'Image is too large. Please compress or choose a smaller image.'
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (error.message.includes('bucket') || error.message.includes('storage')) {
      return 'Storage system error. Please try again.'
    }
    if (error.message.includes('timeout')) {
      return 'Upload timed out. Please try again.'
    }
    return error.message
  }

  return 'Unknown error occurred. Please try again.'
}

// Define valid columns for photos table to prevent PGRST204 errors
export const PHOTOS_TABLE_COLUMNS = [
  'id', 'album_id', 'user_id', 'file_path', 'file_size', 'width', 'height',
  'caption', 'taken_at', 'latitude', 'longitude', 'country', 'city',
  'city_id', 'island_id', 'exif_data', 'processing_status', 'order_index', 'created_at'
] as const

// Helper to filter payload to only include valid columns
export const filterPhotosPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (PHOTOS_TABLE_COLUMNS.includes(key as typeof PHOTOS_TABLE_COLUMNS[number])) {
      filtered[key] = value
    } else {
      log.warn(`Skipping unknown column '${key}' for photos table`, { component: 'Storage', action: 'filter-payload' })
    }
  }
  return filtered
}

// Utility functions for common operations
export const uploadPhoto = async (file: File, userId?: string): Promise<string> => {
  log.info('uploadPhoto called', { component: 'Storage', action: 'upload-photo', fileName: file.name, fileSize: file.size, fileType: file.type, userId })

  // Content moderation check before upload
  const modResult = await moderateImage(file)
  if (!modResult.safe) {
    log.warn('Upload blocked by moderation', {
      component: 'Storage',
      action: 'moderation-block',
      reason: modResult.reason,
      flags: modResult.flags,
      userId
    })
    throw new StorageError(modResult.reason || 'This file did not pass our content checks.', 'MODERATION_FAILED')
  }

  // Fix path duplication: don't add "photos/" prefix since bucket is already "photos"
  const filePath = storageHelper.generateUniqueFilePath(file.name, userId)
  log.info('Generated file path', { component: 'Storage', action: 'upload-photo', filePath })

  try {
    const result = await storageHelper.uploadWithRetry('photos', filePath, file)
    log.info('uploadPhoto success', { component: 'Storage', action: 'upload-photo-success', result })
    return result
  } catch (error) {
    log.error('uploadPhoto failed', { component: 'Storage', action: 'upload-photo-failed' }, error as Error)
    throw error
  }
}

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  // Don't add "avatars/" prefix since bucket is already "avatars"
  const filePath = storageHelper.generateUniqueFilePath(file.name, userId)
  return storageHelper.uploadWithRetry('avatars', filePath, file)
}

export const uploadCoverPhoto = async (file: File, userId: string): Promise<string> => {
  // Don't add "covers/" prefix since bucket is already "covers"
  const filePath = storageHelper.generateUniqueFilePath(file.name, userId)
  return storageHelper.uploadWithRetry('covers', filePath, file)
}

export const deleteCoverPhoto = async (publicUrl: string): Promise<void> => {
  // Extract file path from public URL
  const url = new URL(publicUrl)
  const pathParts = url.pathname.split('/')
  const bucketIndex = pathParts.findIndex(part => part === 'covers')
  if (bucketIndex === -1) {
    throw new StorageError('Invalid cover photo URL', 'INVALID_URL')
  }
  const filePath = pathParts.slice(bucketIndex + 1).join('/')
  return storageHelper.deleteFile('covers', filePath)
}

export const deletePhoto = async (publicUrl: string): Promise<void> => {
  // Extract file path from public URL
  const url = new URL(publicUrl)
  const pathParts = url.pathname.split('/')
  const bucketIndex = pathParts.findIndex(part => part === 'photos')
  if (bucketIndex === -1) {
    throw new StorageError('Invalid photo URL', 'INVALID_URL')
  }
  const filePath = pathParts.slice(bucketIndex + 1).join('/')
  return storageHelper.deleteFile('photos', filePath)
}

export const deleteAvatar = async (publicUrl: string): Promise<void> => {
  // Extract file path from public URL
  const url = new URL(publicUrl)
  const pathParts = url.pathname.split('/')
  const bucketIndex = pathParts.findIndex(part => part === 'avatars')
  if (bucketIndex === -1) {
    throw new StorageError('Invalid avatar URL', 'INVALID_URL')
  }
  const filePath = pathParts.slice(bucketIndex + 1).join('/')
  return storageHelper.deleteFile('avatars', filePath)
}