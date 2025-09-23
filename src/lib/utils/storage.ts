import { createClient } from '@/lib/supabase/client'
import { log } from './logger'

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

  async checkBucketExists(bucketId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage.getBucket(bucketId)
      return !error && !!data
    } catch (error) {
      log.warn('Error checking bucket existence', {
        component: 'StorageHelper',
        action: 'checkBucketExists',
        bucketId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  async validateFile(file: File, bucketId: string): Promise<void> {
    const bucket = STORAGE_BUCKETS.find(b => b.id === bucketId)
    if (!bucket) {
      throw new StorageError(`Unknown bucket: ${bucketId}`, 'UNKNOWN_BUCKET', bucketId)
    }

    // Check file size
    if (file.size > bucket.fileSizeLimit) {
      const maxSizeMB = Math.round(bucket.fileSizeLimit / 1024 / 1024)
      throw new StorageError(
        `File too large. Maximum size is ${maxSizeMB}MB`,
        'FILE_TOO_LARGE',
        bucketId
      )
    }

    // Check mime type
    if (!bucket.allowedMimeTypes.includes(file.type)) {
      throw new StorageError(
        `File type not allowed. Supported types: ${bucket.allowedMimeTypes.join(', ')}`,
        'INVALID_FILE_TYPE',
        bucketId
      )
    }
  }

  async uploadWithRetry(
    bucketId: string,
    filePath: string,
    file: File,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<string> {
    const { maxRetries = 3, retryDelay = 1000 } = options

    // Validate file first
    await this.validateFile(file, bucketId)

    // Check if bucket exists
    const bucketExists = await this.checkBucketExists(bucketId)
    if (!bucketExists) {
      throw new StorageError(
        `Storage bucket '${bucketId}' does not exist. Please contact support.`,
        'BUCKET_NOT_FOUND',
        bucketId
      )
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

        const { error: uploadError } = await this.supabase.storage
          .from(bucketId)
          .upload(filePath, file)

        if (uploadError) {
          throw new StorageError(
            uploadError.message,
            'UPLOAD_FAILED',
            bucketId,
            filePath
          )
        }

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

    // All retries failed
    throw new StorageError(
      `Upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      'MAX_RETRIES_EXCEEDED',
      bucketId,
      filePath
    )
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

// Utility functions for common operations
export const uploadPhoto = async (file: File, userId?: string): Promise<string> => {
  const filePath = `photos/${storageHelper.generateUniqueFilePath(file.name, userId)}`
  return storageHelper.uploadWithRetry('photos', filePath, file)
}

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  const filePath = `avatars/${storageHelper.generateUniqueFilePath(file.name, userId)}`
  return storageHelper.uploadWithRetry('avatars', filePath, file)
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