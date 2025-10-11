'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/utils/logger';

export interface UpdatePhotoMetadataRequest {
  photoId: string;
  taken_at?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  caption?: string;
  camera_make?: string;
  camera_model?: string;
  iso?: number;
  aperture?: string;
  shutter_speed?: string;
}

/**
 * Update photo metadata with manual overrides
 */
export async function updatePhotoMetadata(request: UpdatePhotoMetadataRequest) {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Verify photo ownership
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, user_id, album_id')
      .eq('id', request.photoId)
      .single();

    if (photoError || !photo) {
      return { success: false, error: 'Photo not found' };
    }

    if (photo.user_id !== user.id) {
      return { success: false, error: 'You do not have permission to edit this photo' };
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (request.taken_at !== undefined) updates.taken_at = request.taken_at;
    if (request.location_name !== undefined) updates.location_name = request.location_name;
    if (request.location_lat !== undefined) {
      updates.location_lat = request.location_lat;
      updates.latitude = request.location_lat; // Alias
    }
    if (request.location_lng !== undefined) {
      updates.location_lng = request.location_lng;
      updates.longitude = request.location_lng; // Alias
    }
    if (request.caption !== undefined) updates.caption = request.caption;
    if (request.camera_make !== undefined) updates.camera_make = request.camera_make;
    if (request.camera_model !== undefined) updates.camera_model = request.camera_model;
    if (request.iso !== undefined) updates.iso = request.iso;
    if (request.aperture !== undefined) updates.aperture = request.aperture;
    if (request.shutter_speed !== undefined) updates.shutter_speed = request.shutter_speed;

    // Update photo
    const { data: updatedPhoto, error: updateError } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', request.photoId)
      .select()
      .single();

    if (updateError) {
      log.error('Failed to update photo metadata', {
        component: 'updatePhotoMetadata',
        photoId: request.photoId,
      }, updateError);
      return { success: false, error: updateError.message };
    }

    // Revalidate album page
    if (photo.album_id) {
      revalidatePath(`/albums/${photo.album_id}`);
    }

    log.info('Photo metadata updated', {
      component: 'updatePhotoMetadata',
      photoId: request.photoId,
      updatedFields: Object.keys(updates),
    });

    return { success: true, data: updatedPhoto };
  } catch (error) {
    log.error('Error updating photo metadata', {
      component: 'updatePhotoMetadata',
      photoId: request.photoId,
    }, error as Error);
    return { success: false, error: 'Failed to update photo metadata' };
  }
}

/**
 * Batch update photo metadata
 */
export async function batchUpdatePhotoMetadata(
  photoIds: string[],
  updates: Partial<UpdatePhotoMetadataRequest>
) {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Verify all photos belong to user
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, user_id, album_id')
      .in('id', photoIds);

    if (photosError || !photos) {
      return { success: false, error: 'Photos not found' };
    }

    const unauthorizedPhotos = photos.filter(p => p.user_id !== user.id);
    if (unauthorizedPhotos.length > 0) {
      return { success: false, error: 'You do not have permission to edit some photos' };
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.location_name !== undefined) updateData.location_name = updates.location_name;
    if (updates.location_lat !== undefined) {
      updateData.location_lat = updates.location_lat;
      updateData.latitude = updates.location_lat;
    }
    if (updates.location_lng !== undefined) {
      updateData.location_lng = updates.location_lng;
      updateData.longitude = updates.location_lng;
    }
    if (updates.camera_make !== undefined) updateData.camera_make = updates.camera_make;
    if (updates.camera_model !== undefined) updateData.camera_model = updates.camera_model;

    // Update all photos
    const { error: updateError } = await supabase
      .from('photos')
      .update(updateData)
      .in('id', photoIds);

    if (updateError) {
      log.error('Failed to batch update photos', {
        component: 'batchUpdatePhotoMetadata',
        photoIds,
      }, updateError);
      return { success: false, error: updateError.message };
    }

    // Revalidate album pages
    const albumIds = [...new Set(photos.map(p => p.album_id).filter(Boolean))];
    albumIds.forEach(albumId => {
      if (albumId) revalidatePath(`/albums/${albumId}`);
    });

    log.info('Batch photo metadata updated', {
      component: 'batchUpdatePhotoMetadata',
      photoCount: photoIds.length,
      updatedFields: Object.keys(updateData),
    });

    return { success: true, count: photoIds.length };
  } catch (error) {
    log.error('Error in batch update', {
      component: 'batchUpdatePhotoMetadata',
      photoIds,
    }, error as Error);
    return { success: false, error: 'Failed to batch update photos' };
  }
}
