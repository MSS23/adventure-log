/**
 * Privacy Control Utilities
 *
 * Centralized privacy logic for albums, photos, stories, and profiles
 */

import { createClient } from '@/lib/supabase/client'
import type { Album, Photo } from '@/types/database'
import { log } from './logger'

export type VisibilityLevel = 'public' | 'private' | 'friends'
export type ContentType = 'album' | 'photo' | 'story' | 'profile'

interface PrivacyCheckOptions {
  contentId: string
  contentType: ContentType
  contentOwnerId: string
  contentVisibility: VisibilityLevel
  currentUserId?: string
  includeFollowCheck?: boolean
}

/**
 * Check if a user can view content based on privacy settings
 */
export async function canViewContent({
  contentOwnerId,
  contentVisibility,
  currentUserId,
  includeFollowCheck = true
}: PrivacyCheckOptions): Promise<boolean> {
  // Public content is always visible
  if (contentVisibility === 'public') {
    return true
  }

  // Not logged in users can only see public content
  if (!currentUserId) {
    return false
  }

  // Owners can always see their own content
  if (currentUserId === contentOwnerId) {
    return true
  }

  // Private content is only visible to owner
  if (contentVisibility === 'private') {
    return false
  }

  // Friends-only content requires follow relationship check
  if (contentVisibility === 'friends' && includeFollowCheck) {
    return await areFriends(currentUserId, contentOwnerId)
  }

  return false
}

/**
 * Check if two users are friends (mutual follow relationship)
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // Check if user1 follows user2 AND user2 follows user1 (both accepted)
    const [follow1, follow2] = await Promise.all([
      supabase
        .from('followers')
        .select('id')
        .eq('follower_id', userId1)
        .eq('following_id', userId2)
        .eq('status', 'accepted')
        .single(),

      supabase
        .from('followers')
        .select('id')
        .eq('follower_id', userId2)
        .eq('following_id', userId1)
        .eq('status', 'accepted')
        .single()
    ])

    // Both must exist for friendship
    return !!(follow1.data && follow2.data)
  } catch (error) {
    log.error('Error checking friendship status', { error, userId1, userId2 })
    return false
  }
}

/**
 * Check if a user is following another user
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .eq('status', 'accepted')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return !!data
  } catch (error) {
    log.error('Error checking follow status', { error, followerId, followingId })
    return false
  }
}

/**
 * Filter albums based on privacy settings and user relationship
 */
export async function filterAlbumsByPrivacy(
  albums: Album[],
  currentUserId?: string
): Promise<Album[]> {
  if (!currentUserId) {
    // Not logged in - only show public albums
    return albums.filter(album => album.visibility === 'public')
  }

  const filtered: Album[] = []

  for (const album of albums) {
    const canView = await canViewContent({
      contentId: album.id,
      contentType: 'album',
      contentOwnerId: album.user_id,
      contentVisibility: album.visibility as VisibilityLevel,
      currentUserId
    })

    if (canView) {
      filtered.push(album)
    }
  }

  return filtered
}

/**
 * Filter photos based on album privacy
 */
export async function filterPhotosByPrivacy(
  photos: Photo[],
  albumVisibility: VisibilityLevel,
  albumOwnerId: string,
  currentUserId?: string
): Promise<Photo[]> {
  const canView = await canViewContent({
    contentId: photos[0]?.album_id || '',
    contentType: 'photo',
    contentOwnerId: albumOwnerId,
    contentVisibility: albumVisibility,
    currentUserId
  })

  return canView ? photos : []
}

/**
 * Build Supabase query with privacy filters
 */
export function applyPrivacyFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  currentUserId?: string,
  visibilityField: string = 'visibility'
) {
  if (!currentUserId) {
    // Not logged in - only show public content
    return query.eq(visibilityField, 'public')
  }

  // Logged in - show public content OR user's own content OR friends-only if following
  // Note: Friend check needs to be done post-query for performance
  return query.or(`${visibilityField}.eq.public,user_id.eq.${currentUserId}`)
}

/**
 * Get user's privacy level
 */
export async function getUserPrivacyLevel(userId: string): Promise<VisibilityLevel> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('users')
      .select('privacy_level')
      .eq('id', userId)
      .single()

    if (error) throw error

    return (data?.privacy_level as VisibilityLevel) || 'public'
  } catch (error) {
    log.error('Error fetching user privacy level', { error, userId })
    return 'public'
  }
}

/**
 * Update content visibility
 */
export async function updateContentVisibility(
  contentType: ContentType,
  contentId: string,
  newVisibility: VisibilityLevel,
  userId: string
): Promise<boolean> {
  const supabase = createClient()

  try {
    const tableName = contentType === 'profile' ? 'profiles' : `${contentType}s`

    const { error } = await supabase
      .from(tableName)
      .update({
        [contentType === 'profile' ? 'privacy_level' : 'visibility']: newVisibility
      })
      .eq('id', contentId)
      .eq('user_id', userId)

    if (error) throw error

    log.info('Content visibility updated', {
      component: 'privacy',
      contentType,
      contentId,
      newVisibility
    })

    return true
  } catch (error) {
    log.error('Failed to update content visibility', {
      error,
      contentType,
      contentId,
      newVisibility
    })
    return false
  }
}

/**
 * Batch check if user can view multiple items
 */
export async function batchCheckViewPermissions(
  items: Array<{
    id: string
    user_id: string
    visibility: VisibilityLevel
  }>,
  currentUserId?: string
): Promise<Set<string>> {
  const viewableIds = new Set<string>()

  if (!currentUserId) {
    // Not logged in - only public items
    items.forEach(item => {
      if (item.visibility === 'public') {
        viewableIds.add(item.id)
      }
    })
    return viewableIds
  }

  for (const item of items) {
    // Public or own content
    if (item.visibility === 'public' || item.user_id === currentUserId) {
      viewableIds.add(item.id)
      continue
    }

    // Private content - skip
    if (item.visibility === 'private') {
      continue
    }

    // Friends-only - check relationship
    if (item.visibility === 'friends') {
      const isFriend = await areFriends(currentUserId, item.user_id)
      if (isFriend) {
        viewableIds.add(item.id)
      }
    }
  }

  return viewableIds
}

/**
 * Get privacy icon and description
 */
export function getPrivacyInfo(visibility: VisibilityLevel): {
  icon: string
  label: string
  description: string
  color: string
} {
  switch (visibility) {
    case 'public':
      return {
        icon: 'Globe',
        label: 'Public',
        description: 'Anyone can view',
        color: 'green'
      }
    case 'friends':
      return {
        icon: 'Users',
        label: 'Friends Only',
        description: 'Only friends can view',
        color: 'blue'
      }
    case 'private':
      return {
        icon: 'Lock',
        label: 'Private',
        description: 'Only you can view',
        color: 'gray'
      }
  }
}
