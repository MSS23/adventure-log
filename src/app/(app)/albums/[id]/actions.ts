'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { log } from '@/lib/utils/logger'

/**
 * Delete a photo from an album
 * Handles storage cleanup and database updates
 */
export async function deletePhoto(photoId: string, albumId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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
    if (!photoAlbum || photoAlbum.user_id !== user.id) {
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

    // Check if deleted photo was the cover photo
    const photoUrl = photo.file_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.file_path}`
      : null

    if (photoAlbum.cover_photo_url === photoUrl) {
      // Cover photo was deleted - find a new cover from remaining photos
      const { data: remainingPhotos } = await supabase
        .from('photos')
        .select('file_path')
        .eq('album_id', albumId)
        .order('created_at', { ascending: false })
        .limit(1)

      const newCoverUrl = remainingPhotos && remainingPhotos.length > 0 && remainingPhotos[0].file_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${remainingPhotos[0].file_path}`
        : null

      // Update album cover
      await supabase
        .from('albums')
        .update({ cover_photo_url: newCoverUrl })
        .eq('id', albumId)
    }

    // Revalidate album page and profile
    revalidatePath(`/albums/${albumId}`)
    revalidatePath('/profile')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    log.error('Delete photo error', { component: 'AlbumDetailActions', action: 'delete-photo' }, error as Error)
    return { success: false, error: 'Failed to delete photo' }
  }
}
