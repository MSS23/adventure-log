import { createClient } from '@/lib/supabase/client'
import { log } from './logger'
import type { BucketDebugInfo, UploadDebugResult, EmergencyUploadResult } from '@/types/storage-debug'

// Enhanced storage helper with debugging capabilities
export class StorageDebugHelper {
  private supabase = createClient()

  async debugBucketAccess(bucketId: string): Promise<BucketDebugInfo> {
    try {
      log.info('Debugging bucket access', {
        component: 'StorageDebugHelper',
        action: 'debugBucketAccess',
        bucketId
      })

      // Method 1: Try getBucket (what the app currently uses)
      const { data: bucketData, error: bucketError } = await this.supabase.storage.getBucket(bucketId)

      if (bucketError) {
        log.error('getBucket failed', {
          component: 'StorageDebugHelper',
          bucketId,
          error: bucketError.message,
          errorCode: bucketError.message
        })

        // Method 2: Try listing all buckets to see what's available
        const { data: allBuckets, error: listError } = await this.supabase.storage.listBuckets()

        if (listError) {
          return {
            exists: false,
            accessible: false,
            error: `Cannot access storage system: ${listError.message}`,
            details: { bucketError, listError }
          }
        }

        const bucketExists = allBuckets?.some(bucket => bucket.name === bucketId)

        return {
          exists: bucketExists || false,
          accessible: false,
          error: bucketError.message,
          details: {
            availableBuckets: allBuckets?.map(b => b.name) || [],
            bucketError,
            requestedBucket: bucketId
          }
        }
      }

      return {
        exists: true,
        accessible: true,
        details: bucketData
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error('Debug bucket access failed', {
        component: 'StorageDebugHelper',
        bucketId,
        error: errorMessage
      })

      return {
        exists: false,
        accessible: false,
        error: errorMessage,
        details: { error }
      }
    }
  }

  async attemptUploadWithDebug(
    bucketId: string,
    filePath: string,
    file: File
  ): Promise<UploadDebugResult> {
    try {
      log.info('Attempting upload with debug info', {
        component: 'StorageDebugHelper',
        action: 'attemptUploadWithDebug',
        bucketId,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      // First, debug bucket access
      const bucketDebug = await this.debugBucketAccess(bucketId)

      if (!bucketDebug.accessible) {
        return {
          success: false,
          error: `Bucket '${bucketId}' is not accessible: ${bucketDebug.error}`,
          debugInfo: bucketDebug
        }
      }

      // Try the upload
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(bucketId)
        .upload(filePath, file, {
          upsert: false,
          cacheControl: '3600'
        })

      if (uploadError) {
        log.error('Upload failed', {
          component: 'StorageDebugHelper',
          bucketId,
          filePath,
          error: uploadError.message
        })

        return {
          success: false,
          error: uploadError.message,
          debugInfo: {
            bucketDebug,
            uploadError,
            fileInfo: {
              name: file.name,
              size: file.size,
              type: file.type
            }
          }
        }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath)

      log.info('Upload successful', {
        component: 'StorageDebugHelper',
        bucketId,
        filePath,
        publicUrl: urlData.publicUrl
      })

      return {
        success: true,
        url: urlData.publicUrl,
        debugInfo: {
          uploadData,
          bucketDebug
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error('Upload with debug failed', {
        component: 'StorageDebugHelper',
        bucketId,
        filePath,
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage,
        debugInfo: { error }
      }
    }
  }

  // Emergency upload that bypasses bucket existence check
  async emergencyUpload(
    bucketId: string,
    filePath: string,
    file: File
  ): Promise<EmergencyUploadResult> {
    try {
      log.warn('Emergency upload bypassing bucket checks', {
        component: 'StorageDebugHelper',
        action: 'emergencyUpload',
        bucketId,
        filePath,
        fileName: file.name
      })

      // Skip bucket existence check - just try to upload
      const { error: uploadError } = await this.supabase.storage
        .from(bucketId)
        .upload(filePath, file, {
          upsert: false
        })

      if (uploadError) {
        return {
          success: false,
          error: `Emergency upload failed: ${uploadError.message}`
        }
      }

      const { data: urlData } = this.supabase.storage
        .from(bucketId)
        .getPublicUrl(filePath)

      return {
        success: true,
        url: urlData.publicUrl
      }

    } catch (error) {
      return {
        success: false,
        error: `Emergency upload exception: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

// Export singleton instance
export const storageDebugHelper = new StorageDebugHelper()