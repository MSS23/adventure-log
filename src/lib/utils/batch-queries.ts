/**
 * Batch query utilities to eliminate N+1 query problems
 * PERFORMANCE: These functions reduce database round trips
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Batch fetch photo counts for multiple albums
 * @param albumIds - Array of album IDs
 * @returns Map of album ID to photo count
 *
 * @example
 * const albums = [...] // Array of albums
 * const albumIds = albums.map(a => a.id)
 * const photoCounts = await batchGetAlbumPhotoCounts(albumIds)
 * albums.forEach(album => {
 *   album.photoCount = photoCounts.get(album.id) || 0
 * })
 */
export async function batchGetAlbumPhotoCounts(
  albumIds: string[]
): Promise<Map<string, number>> {
  if (albumIds.length === 0) {
    return new Map()
  }

  const supabase = createClient()

  // Call the RPC function
  const { data, error } = await supabase.rpc('get_album_photo_counts', {
    album_ids: albumIds,
  })

  if (error) {
    console.error('Failed to batch fetch photo counts:', error)
    // Return empty map on error rather than throwing
    // Individual queries can be used as fallback
    return new Map()
  }

  // Convert array result to Map for O(1) lookups
  const countsMap = new Map<string, number>()
  data?.forEach((row: { album_id: string; photo_count: number }) => {
    countsMap.set(row.album_id, row.photo_count)
  })

  return countsMap
}

/**
 * Helper to enrich albums with photo counts in batch
 * @param albums - Array of albums without photo counts
 * @returns Same albums array with photoCount property added
 */
export async function enrichAlbumsWithPhotoCounts<T extends { id: string }>(
  albums: T[]
): Promise<(T & { photoCount: number })[]> {
  const albumIds = albums.map((a) => a.id)
  const photoCounts = await batchGetAlbumPhotoCounts(albumIds)

  return albums.map((album) => ({
    ...album,
    photoCount: photoCounts.get(album.id) || 0,
  }))
}
