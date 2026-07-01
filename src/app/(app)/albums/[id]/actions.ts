'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { log } from '@/lib/utils/logger'

/**
 * Revalidate all pages that display album data.
 */
function revalidateAlbumPaths(albumId?: string) {
  if (albumId) revalidatePath(`/albums/${albumId}`)
  revalidatePath('/albums')
  revalidatePath('/dashboard')
  revalidatePath('/globe')
  revalidatePath('/feed')
  revalidatePath('/profile')
  revalidatePath('/countries')
  revalidatePath('/explore')
}

/**
 * Delete a photo from an album
 * Handles storage cleanup and database updates
 */
export async function deletePhoto(photoId: string, albumId: string): Promise<{
  success: boolean
  error?: string
  albumDeleted?: boolean
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return { success: false, error: 'Authentication required' }
    }

    // Get photo details and verify ownership
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, file_path, album_id, albums!photos_album_id_fkey(user_id, cover_photo_url)')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return { success: false, error: 'Photo not found' }
    }

    // Verify user owns the album
    const photoAlbum = Array.isArray(photo.albums) ? photo.albums[0] : photo.albums;
    if (!photoAlbum || photoAlbum.user_id !== userId) {
      return { success: false, error: 'Not authorized to delete this photo' }
    }

    // Delete from storage
    if (photo.file_path) {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.file_path])

      if (storageError) {
        log.error('Failed to delete photo from storage', { component: 'AlbumDetailActions', action: 'delete-photo' }, storageError as Error)
        // Continue anyway - database cleanup is more important
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      log.error('Failed to delete photo from database', { component: 'AlbumDetailActions', action: 'delete-photo' }, deleteError as Error)
      return { success: false, error: 'Failed to delete photo' }
    }

    // Check remaining photos
    const { data: remainingPhotos } = await supabase
      .from('photos')
      .select('file_path')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })
      .limit(1)

    const hasRemainingPhotos = remainingPhotos && remainingPhotos.length > 0

    if (!hasRemainingPhotos) {
      // No photos left — delete the entire album
      // CASCADE will clean up activity_feed, likes, comments, etc.
      const { error: albumDeleteError } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId)

      if (albumDeleteError) {
        // The photo was removed but the now-empty album could not be deleted.
        // Report albumDeleted:false so the client doesn't navigate away as if
        // the album is gone (it would reappear, empty, on refresh).
        log.error('Failed to delete empty album', { component: 'AlbumDetailActions', action: 'delete-album' }, albumDeleteError as Error)
        revalidateAlbumPaths()
        return { success: true, albumDeleted: false }
      }

      revalidateAlbumPaths()

      return { success: true, albumDeleted: true }
    }

    // Check if deleted photo was the cover photo.
    // Covers are stored as raw file paths, but legacy rows may hold a full
    // public URL — match against both so the cover is always replaced.
    const photoFullUrl = photo.file_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.file_path}`
      : null

    const deletedPhotoWasCover =
      photoAlbum.cover_photo_url != null &&
      (photoAlbum.cover_photo_url === photo.file_path ||
        photoAlbum.cover_photo_url === photoFullUrl)

    if (deletedPhotoWasCover) {
      // Cover photo was deleted — promote the next photo to cover.
      // Store the raw file path (the convention getPhotoUrl() expects).
      await supabase
        .from('albums')
        .update({ cover_photo_url: remainingPhotos[0].file_path ?? null })
        .eq('id', albumId)
    }

    revalidateAlbumPaths(albumId)

    return { success: true }
  } catch (error) {
    log.error('Delete photo error', { component: 'AlbumDetailActions', action: 'delete-photo' }, error as Error)
    return { success: false, error: 'Failed to delete photo' }
  }
}
