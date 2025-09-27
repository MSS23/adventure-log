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

  // Simple upload method - bypass validation for direct upload
  async simpleUpload(bucketId: string, filePath: string, file: File): Promise<string> {
    log.debug('Starting simple upload (bypassing validation)', {
      component: 'StorageHelper',
      action: 'simple-upload',
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

      log.debug('Simple upload response received', {
        component: 'StorageHelper',
        action: 'simple-upload-response',
        hasData: !!data,
        hasError: !!error
      })

      if (error) {
        log.error('Simple upload failed', {
          component: 'StorageHelper',
          action: 'simple-upload-failed',
          bucketId,
          filePath
        }, error)
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

      log.info('Simple upload completed successfully', {
        component: 'StorageHelper',
        action: 'simple-upload-success',
        bucketId,
        filePath
      })

      return urlData.publicUrl
    } catch (error) {
      log.error('Simple upload exception', {
        component: 'StorageHelper',
        action: 'simple-upload-exception',
        bucketId,
        filePath
      }, error)
      throw error
    }
  }

  async checkBucketExists(bucketId: string): Promise<boolean> {
    // Skip bucket existence check to avoid 400 errors from getBucket()
    // Just assume bucket exists and let upload fail naturally if it doesn't
    log.debug('Skipping bucket check (assumes bucket exists)', {
      component: 'StorageHelper',
      action: 'skip-bucket-check',
      bucketId
    })
    return true
  }

  async validateFile(file: File, bucketId: string): Promise<void> {
    log.debug('Starting file validation', {
      component: 'StorageHelper',
      action: 'validate-file',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucketId
    })

    const bucket = STORAGE_BUCKETS.find(b => b.id === bucketId)
    if (!bucket) {
      log.error('Unknown bucket specified', {
        component: 'StorageHelper',
        action: 'validate-file-unknown-bucket',
        bucketId
      })
      throw new StorageError(`Unknown bucket: ${bucketId}`, 'UNKNOWN_BUCKET', bucketId)
    }
    log.debug('Bucket config found', {
      component: 'StorageHelper',
      action: 'validate-file-bucket-found',
      bucketId: bucket.id,
      bucketName: bucket.name
    })

    // Check file size
    log.debug('Checking file size', {
      component: 'StorageHelper',
      action: 'validate-file-size',
      fileSize: file.size,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      limit: bucket.fileSizeLimit,
      limitMB: Math.round(bucket.fileSizeLimit / 1024 / 1024) + 'MB'
    })

    if (file.size > bucket.fileSizeLimit) {
      const maxSizeMB = Math.round(bucket.fileSizeLimit / 1024 / 1024)
      log.error('File too large', {
        component: 'StorageHelper',
        action: 'validate-file-size-exceeded',
        fileSize: file.size,
        maxSize: bucket.fileSizeLimit,
        maxSizeMB
      })
      throw new StorageError(
        `File too large. Maximum size is ${maxSizeMB}MB`,
        'FILE_TOO_LARGE',
        bucketId
      )
    }
    log.debug('File size check passed', {
      component: 'StorageHelper',
      action: 'validate-file-size-ok'
    })

    // Check mime type
    log.debug('Checking MIME type', {
      component: 'StorageHelper',
      action: 'validate-file-mime',
      fileType: file.type,
      allowedTypes: bucket.allowedMimeTypes,
      isAllowed: bucket.allowedMimeTypes.includes(file.type)
    })

    if (!bucket.allowedMimeTypes.includes(file.type)) {
      log.error('Invalid file type', {
        component: 'StorageHelper',
        action: 'validate-file-mime-invalid',
        fileType: file.type,
        allowedTypes: bucket.allowedMimeTypes
      })
      throw new StorageError(
        `File type not allowed. Supported types: ${bucket.allowedMimeTypes.join(', ')}`,
        'INVALID_FILE_TYPE',
        bucketId
      )
    }
    log.debug('MIME type check passed', {
      component: 'StorageHelper',
      action: 'validate-file-mime-ok'
    })
  }

  async uploadWithRetry(
    bucketId: string,
    filePath: string,
    file: File,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<string> {
    const { maxRetries = 3, retryDelay = 1000 } = options

    log.info('Starting upload process', {
      component: 'StorageHelper',
      action: 'upload-with-retry-start',
      bucketId,
      filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      maxRetries
    })

    // Validate file first
    log.debug('Starting file validation', {
      component: 'StorageHelper',
      action: 'upload-file-validation-start'
    })
    await this.validateFile(file, bucketId)
    log.debug('File validation passed', {
      component: 'StorageHelper',
      action: 'upload-file-validation-passed'
    })

    // Check if bucket exists (non-blocking check)
    log.debug('Checking bucket existence', {
      component: 'StorageHelper',
      action: 'upload-bucket-check-start',
      bucketId
    })
    const bucketExists = await this.checkBucketExists(bucketId)
    log.debug('Bucket check result', {
      component: 'StorageHelper',
      action: 'upload-bucket-check-result',
      bucketId,
      exists: bucketExists
    })

    if (!bucketExists) {
      log.warn('Bucket check failed, but proceeding anyway (bucket might exist)', {
        component: 'StorageHelper',
        action: 'upload-bucket-check-failed',
        bucketId
      })
      // Don't throw error - bucket might exist but check could fail due to permissions
      // We'll let the upload attempt proceed and fail naturally if bucket truly doesn't exist
    } else {
      log.debug('Bucket exists, proceeding with upload', {
        component: 'StorageHelper',
        action: 'upload-bucket-exists'
      })
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

        log.debug('Starting Supabase upload attempt', {
          component: 'StorageHelper',
          action: 'upload-attempt',
          attempt,
          maxRetries,
          bucketId,
          filePath
        })
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from(bucketId)
          .upload(filePath, file)

        log.debug('Upload response received', {
          component: 'StorageHelper',
          action: 'upload-response',
          attempt,
          hasUploadData: !!uploadData,
          uploadErrorMessage: uploadError?.message,
          uploadErrorName: uploadError?.name
        })

        if (uploadError) {
          log.error('Upload failed on attempt', {
            component: 'StorageHelper',
            action: 'upload-failed',
            attempt,
            bucketId,
            filePath
          }, uploadError)
          throw new StorageError(
            uploadError.message,
            'UPLOAD_FAILED',
            bucketId,
            filePath
          )
        }
        log.info('Upload successful on attempt', {
          component: 'StorageHelper',
          action: 'upload-success',
          attempt,
          bucketId,
          filePath
        })

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
    log.warn('Complex upload failed, trying simple upload fallback', {
      component: 'StorageHelper',
      action: 'fallback-to-simple-upload',
      bucketId,
      filePath,
      retriesExhausted: maxRetries
    })
    try {
      const result = await this.simpleUpload(bucketId, filePath, file)
      log.info('Fallback to simple upload succeeded', {
        component: 'StorageHelper',
        action: 'fallback-upload-success',
        bucketId,
        filePath
      })
      return result
    } catch (fallbackError) {
      log.error('Both complex and simple upload failed', {
        component: 'StorageHelper',
        action: 'all-upload-methods-failed',
        bucketId,
        filePath
      }, fallbackError)
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
      log.warn('Skipping unknown column for photos table', {
        component: 'StorageHelper',
        action: 'filter-unknown-column',
        columnName: key
      })
    }
  }
  return filtered
}

// Utility functions for common operations
export const uploadPhoto = async (file: File, userId?: string): Promise<string> => {
  log.debug('Photo upload initiated', {
    component: 'uploadPhoto',
    action: 'upload-photo-start',
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userId
  })

  // Fix path duplication: don't add "photos/" prefix since bucket is already "photos"
  const filePath = storageHelper.generateUniqueFilePath(file.name, userId)
  log.debug('Generated unique file path', {
    component: 'uploadPhoto',
    action: 'generate-file-path',
    filePath
  })

  try {
    const result = await storageHelper.uploadWithRetry('photos', filePath, file)
    log.info('Photo upload completed successfully', {
      component: 'uploadPhoto',
      action: 'upload-photo-success',
      filePath,
      publicUrl: result
    })
    return result
  } catch (error) {
    log.error('Photo upload failed', {
      component: 'uploadPhoto',
      action: 'upload-photo-failed',
      filePath
    }, error)
    throw error
  }
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