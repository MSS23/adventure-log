import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

/**
 * Converts a file path to a full Supabase storage URL
 * @param filePath - The file path stored in the database (e.g., "user-id/album-id/photo.jpg")
 * @param bucket - The storage bucket name (default: "photos")
 * @returns The full public URL for the photo
 */
export function getPhotoUrl(filePath: string | null | undefined, bucket: string = 'photos'): string | undefined {
  // Early returns for invalid inputs
  if (!filePath) return undefined
  if (typeof filePath !== 'string') return undefined
  if (filePath.trim() === '') return undefined

  // Check if filePath is already a full URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      new URL(filePath)
      return filePath
    } catch {
      log.warn('[getPhotoUrl] Invalid full URL provided', { component: 'PhotoUrl', action: 'validate-url', filePath })
      return undefined
    }
  }

  try {
    const supabase = createClient()
    if (!supabase) {
      log.warn('Supabase client not initialized', { component: 'PhotoUrl', action: 'get-photo-url' })
      return undefined
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

    // Validate that we got a proper URL
    if (!data?.publicUrl) {
      log.warn('[getPhotoUrl] No public URL returned for file path', { component: 'PhotoUrl', action: 'get-public-url', filePath })
      return undefined
    }

    // Ensure the URL is valid before returning
    try {
      new URL(data.publicUrl)

      // Double-check the URL starts with http/https
      if (!data.publicUrl.startsWith('http://') && !data.publicUrl.startsWith('https://')) {
        log.warn('[getPhotoUrl] Public URL does not start with http(s)', { component: 'PhotoUrl', action: 'validate-public-url', publicUrl: data.publicUrl })
        return undefined
      }

      // Final safety check: ensure we're not returning a relative path
      if (data.publicUrl === filePath || !data.publicUrl.includes('://')) {
        log.warn('[getPhotoUrl] Refusing to return relative path', { component: 'PhotoUrl', action: 'validate-public-url', publicUrl: data.publicUrl })
        return undefined
      }

      return data.publicUrl
    } catch (urlError) {
      // If URL construction fails, return undefined
      log.warn('[getPhotoUrl] Invalid URL generated', { component: 'PhotoUrl', action: 'validate-generated-url', publicUrl: data.publicUrl })
      return undefined
    }
  } catch (error) {
    log.error('Error getting photo URL for path', { component: 'PhotoUrl', action: 'get-photo-url', filePath }, error as Error)
    return undefined
  }
}

/**
 * Converts multiple file paths to full Supabase storage URLs
 * @param filePaths - Array of file paths
 * @param bucket - The storage bucket name (default: "photos")
 * @returns Array of full public URLs
 */
export function getPhotoUrls(filePaths: (string | null | undefined)[], bucket: string = 'photos'): string[] {
  return filePaths.map(path => getPhotoUrl(path, bucket)).filter(Boolean) as string[]
}
