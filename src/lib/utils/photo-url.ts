import { createClient } from '@/lib/supabase/client'

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

  try {
    const supabase = createClient()
    if (!supabase) {
      console.warn('Supabase client not initialized')
      return undefined
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

    // Validate that we got a proper URL
    if (!data?.publicUrl) {
      console.warn('[getPhotoUrl] No public URL returned for file path:', filePath)
      return undefined
    }

    // Ensure the URL is valid before returning
    try {
      new URL(data.publicUrl)

      // Double-check the URL starts with http/https
      if (!data.publicUrl.startsWith('http://') && !data.publicUrl.startsWith('https://')) {
        console.warn('[getPhotoUrl] Public URL does not start with http(s):', data.publicUrl)
        return undefined
      }

      // Final safety check: ensure we're not returning a relative path
      if (data.publicUrl === filePath || !data.publicUrl.includes('://')) {
        console.warn('[getPhotoUrl] Refusing to return relative path:', data.publicUrl)
        return undefined
      }

      return data.publicUrl
    } catch (urlError) {
      // If URL construction fails, return undefined
      console.warn('[getPhotoUrl] Invalid URL generated:', data.publicUrl, urlError)
      return undefined
    }
  } catch (error) {
    console.error('Error getting photo URL for path:', filePath, error)
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
