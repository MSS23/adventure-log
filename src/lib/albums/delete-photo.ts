/**
 * Platform-aware photo deletion.
 *
 * On web this delegates to the `deletePhoto` server action. On Capacitor the
 * server action is replaced with a throwing stub at build time (see
 * scripts/mobile-build.mjs), so we run the equivalent logic with the client
 * Supabase instead — it is RLS-safe (owner-only policies enforce the same
 * authorization the action checks explicitly) and needs no revalidatePath,
 * because the static bundle has no server cache to revalidate.
 *
 * Keep the two paths behaviorally identical to
 * src/app/(app)/albums/[id]/actions.ts#deletePhoto.
 */

import { createClient } from '@/lib/supabase/client'
import { isNativePlatform } from '@/lib/api/client'
import { deletePhoto as deletePhotoAction } from '@/app/(app)/albums/[id]/actions'
import { log } from '@/lib/utils/logger'

export interface DeletePhotoResult {
  success: boolean
  error?: string
  albumDeleted?: boolean
}

export async function deletePhotoUniversal(
  photoId: string,
  albumId: string
): Promise<DeletePhotoResult> {
  if (!isNativePlatform()) {
    return deletePhotoAction(photoId, albumId)
  }

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, file_path, album_id, albums!photos_album_id_fkey(user_id, cover_photo_url)')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) return { success: false, error: 'Photo not found' }

    const photoAlbum = Array.isArray(photo.albums) ? photo.albums[0] : photo.albums
    if (!photoAlbum || photoAlbum.user_id !== user.id) {
      return { success: false, error: 'Not authorized to delete this photo' }
    }

    if (photo.file_path) {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.file_path])
      if (storageError) {
        log.error('Failed to delete photo from storage', {
          component: 'deletePhotoUniversal',
          action: 'delete-photo',
        }, storageError as Error)
        // Continue — database cleanup matters more.
      }
    }

    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
    if (deleteError) {
      log.error('Failed to delete photo from database', {
        component: 'deletePhotoUniversal',
        action: 'delete-photo',
      }, deleteError as Error)
      return { success: false, error: 'Failed to delete photo' }
    }

    const { data: remainingPhotos } = await supabase
      .from('photos')
      .select('file_path')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!remainingPhotos || remainingPhotos.length === 0) {
      const { error: albumDeleteError } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId)
      if (albumDeleteError) {
        log.error('Failed to delete empty album', {
          component: 'deletePhotoUniversal',
          action: 'delete-album',
        }, albumDeleteError as Error)
        return { success: true, albumDeleted: false }
      }
      return { success: true, albumDeleted: true }
    }

    const photoFullUrl = photo.file_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.file_path}`
      : null
    const deletedPhotoWasCover =
      photoAlbum.cover_photo_url != null &&
      (photoAlbum.cover_photo_url === photo.file_path ||
        photoAlbum.cover_photo_url === photoFullUrl)

    if (deletedPhotoWasCover) {
      await supabase
        .from('albums')
        .update({ cover_photo_url: remainingPhotos[0].file_path ?? null })
        .eq('id', albumId)
    }

    return { success: true }
  } catch (error) {
    log.error('Delete photo error', {
      component: 'deletePhotoUniversal',
      action: 'delete-photo',
    }, error as Error)
    return { success: false, error: 'Failed to delete photo' }
  }
}
