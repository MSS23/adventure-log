/**
 * Photo deduplication utilities
 */

import type { Photo } from '@/types/database'

/**
 * Filter out duplicate photos based on file_hash
 * For photos with the same hash, keep only the earliest one (by created_at)
 * Photos without a hash are always kept (can't determine if duplicate)
 *
 * @param photos - Array of photos to deduplicate
 * @returns Deduplicated array of photos
 */
export function filterDuplicatePhotos(photos: Photo[]): Photo[] {
  const seenHashes = new Map<string, Photo>()

  for (const photo of photos) {
    // If no hash, keep the photo (can't determine if duplicate)
    if (!photo.file_hash) {
      continue
    }

    const existing = seenHashes.get(photo.file_hash)
    if (!existing) {
      // First photo with this hash
      seenHashes.set(photo.file_hash, photo)
    } else {
      // Compare timestamps to keep the earliest
      const existingTime = new Date(existing.created_at || 0).getTime()
      const currentTime = new Date(photo.created_at || 0).getTime()

      if (currentTime < existingTime) {
        // Current photo is older, replace existing
        seenHashes.set(photo.file_hash, photo)
      }
      // Otherwise keep existing (it's older)
    }
  }

  // Return photos, keeping original order but filtering duplicates
  const keptPhotoIds = new Set(Array.from(seenHashes.values()).map(p => p.id))
  return photos.filter(photo => {
    // Keep if no hash (can't determine duplicates) or if it's in the kept set
    return !photo.file_hash || keptPhotoIds.has(photo.id)
  })
}

/**
 * Check if a photo hash already exists in the database for a user
 *
 * @param supabase - Supabase client
 * @param userId - User ID to check
 * @param fileHash - File hash to check for
 * @returns Photo if duplicate exists, null otherwise
 */
export async function checkDuplicatePhoto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  fileHash: string
): Promise<Photo | null> {
  const { data } = await supabase
    .from('photos')
    .select('id, file_path, album_id, albums!inner(title)')
    .eq('user_id', userId)
    .eq('file_hash', fileHash)
    .limit(1)
    .single()

  return data || null
}
