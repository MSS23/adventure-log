'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/utils/logger';
import type { CreateAlbumShareRequest, SharePermissionLevel } from '@/types/database';

/**
 * Create a new album share
 */
export async function createAlbumShare(request: CreateAlbumShareRequest) {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Verify user owns the album
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, user_id')
      .eq('id', request.album_id)
      .single();

    if (albumError || !album) {
      return { success: false, error: 'Album not found' };
    }

    if (album.user_id !== user.id) {
      return { success: false, error: 'You do not have permission to share this album' };
    }

    // Generate share token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_share_token');

    if (tokenError || !tokenData) {
      log.error('Failed to generate share token', { component: 'createAlbumShare' }, tokenError);
      return { success: false, error: 'Failed to generate share token' };
    }

    // Look up user by email if provided
    let sharedWithUserId = request.shared_with_user_id;
    if (request.shared_with_email && !sharedWithUserId) {
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', request.shared_with_email)
        .single();

      if (!userError && targetUser) {
        sharedWithUserId = targetUser.id;
      }
    }

    // Create share
    const { data: share, error: shareError } = await supabase
      .from('album_shares')
      .insert({
        album_id: request.album_id,
        shared_by_user_id: user.id,
        shared_with_user_id: sharedWithUserId || null,
        share_token: tokenData,
        permission_level: request.permission_level,
        expires_at: request.expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (shareError) {
      log.error('Failed to create album share', { component: 'createAlbumShare' }, shareError);
      return { success: false, error: shareError.message };
    }

    revalidatePath(`/albums/${request.album_id}`);

    return { success: true, data: share };
  } catch (error) {
    log.error('Error creating album share', { component: 'createAlbumShare' }, error as Error);
    return { success: false, error: 'Failed to create album share' };
  }
}

/**
 * Get all shares for an album
 */
export async function getAlbumShares(albumId: string) {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: shares, error } = await supabase
      .from('album_shares')
      .select(`
        *,
        shared_with:users!album_shares_shared_with_user_id_fkey(id, username, display_name, avatar_url, email)
      `)
      .eq('album_id', albumId)
      .eq('shared_by_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch album shares', { component: 'getAlbumShares', albumId }, error);
      return { success: false, error: error.message };
    }

    return { success: true, data: shares || [] };
  } catch (error) {
    log.error('Error fetching album shares', { component: 'getAlbumShares', albumId }, error as Error);
    return { success: false, error: 'Failed to fetch album shares' };
  }
}

/**
 * Update a share's permission level or expiration
 */
export async function updateAlbumShare(
  shareId: string,
  updates: { permission_level?: SharePermissionLevel; expires_at?: string; is_active?: boolean }
) {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: share, error } = await supabase
      .from('album_shares')
      .update(updates)
      .eq('id', shareId)
      .eq('shared_by_user_id', user.id)
      .select()
      .single();

    if (error) {
      log.error('Failed to update album share', { component: 'updateAlbumShare', shareId }, error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/albums/${share.album_id}`);

    return { success: true, data: share };
  } catch (error) {
    log.error('Error updating album share', { component: 'updateAlbumShare', shareId }, error as Error);
    return { success: false, error: 'Failed to update album share' };
  }
}

/**
 * Delete/revoke a share
 */
export async function deleteAlbumShare(shareId: string) {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get share to find album_id for revalidation
    const { data: share } = await supabase
      .from('album_shares')
      .select('album_id')
      .eq('id', shareId)
      .eq('shared_by_user_id', user.id)
      .single();

    const { error } = await supabase
      .from('album_shares')
      .delete()
      .eq('id', shareId)
      .eq('shared_by_user_id', user.id);

    if (error) {
      log.error('Failed to delete album share', { component: 'deleteAlbumShare', shareId }, error);
      return { success: false, error: error.message };
    }

    if (share) {
      revalidatePath(`/albums/${share.album_id}`);
    }

    return { success: true };
  } catch (error) {
    log.error('Error deleting album share', { component: 'deleteAlbumShare', shareId }, error as Error);
    return { success: false, error: 'Failed to delete album share' };
  }
}

/**
 * Get share by token (for accessing shared albums via link)
 */
export async function getShareByToken(token: string) {
  const supabase = await createClient();

  try {
    const { data: share, error } = await supabase
      .from('album_shares')
      .select(`
        *,
        album:albums(*),
        shared_by:users!album_shares_shared_by_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (error || !share) {
      return { success: false, error: 'Share not found or expired' };
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return { success: false, error: 'Share link has expired' };
    }

    return { success: true, data: share };
  } catch (error) {
    log.error('Error fetching share by token', { component: 'getShareByToken', token }, error as Error);
    return { success: false, error: 'Failed to fetch share' };
  }
}

/**
 * Get user's permission level for an album
 */
export async function getUserPermission(albumId: string, userId?: string): Promise<SharePermissionLevel | null> {
  const supabase = await createClient();

  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      userId = user.id;
    }

    // Check if user is owner
    const { data: album } = await supabase
      .from('albums')
      .select('user_id')
      .eq('id', albumId)
      .single();

    if (album?.user_id === userId) {
      return 'edit'; // Owners have full edit permission
    }

    // Check if user has a share
    const { data: share } = await supabase
      .from('album_shares')
      .select('permission_level')
      .eq('album_id', albumId)
      .eq('shared_with_user_id', userId)
      .eq('is_active', true)
      .single();

    return share?.permission_level || null;
  } catch (error) {
    log.error('Error getting user permission', { component: 'getUserPermission', albumId, userId }, error as Error);
    return null;
  }
}
