import { createClient } from '@/lib/supabase/client'

/**
 * Converts a file path to a full Supabase storage URL
 * @param filePath - The file path stored in the database (e.g., "user-id/album-id/photo.jpg")
 * @param bucket - The storage bucket name (default: "photos")
 * @returns The full public URL for the photo
 */
export function getPhotoUrl(filePath: string | null | undefined, bucket: string = 'photos'): string | undefined {
  if (!filePath) return undefined

  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
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
