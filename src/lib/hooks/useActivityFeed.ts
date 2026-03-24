/**
 * useActivityFeed Hook
 *
 * React hook for managing the user's activity feed
 */

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityFeedItem } from '@/types/database'
import { log } from '@/lib/utils/logger'

export interface ActivityFeedItemWithDetails extends Omit<ActivityFeedItem, 'user' | 'target_user' | 'target_album' | 'target_comment'> {
  user?: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  target_user?: {
    id: string
    username: string | null
    display_name: string | null
  }
  target_album?: {
    id: string
    title: string
    cover_photo_url: string | null
  }
  target_comment?: {
    id: string
    content: string
  }
}

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityFeedItemWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  /**
   * Fetch activity feed for current user
   */
  const fetchActivityFeed = useCallback(
    async (limit = 30, offset = 0): Promise<ActivityFeedItemWithDetails[]> => {
      setIsLoading(true)
      setError(null)

      try {
        // First fetch activities without joins — avoids FK hint errors
        const { data: rawActivities, error: fetchError } = await supabase
          .from('activity_feed')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (fetchError) {
          log.error('Error fetching activity feed', {
            component: 'useActivityFeed',
            action: 'fetchActivityFeed',
            error: fetchError
          })
          throw fetchError
        }

        // Enrich with user data in a separate query
        const userIds = [...new Set((rawActivities || []).flatMap(a => [a.user_id, a.target_user_id].filter(Boolean)))]
        const albumIds = [...new Set((rawActivities || []).map(a => a.target_album_id).filter(Boolean))]

        const [usersResult, albumsResult] = await Promise.all([
          userIds.length > 0
            ? supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)
            : { data: [], error: null },
          albumIds.length > 0
            ? supabase.from('albums').select('id, title, cover_photo_url').in('id', albumIds)
            : { data: [], error: null },
        ])

        const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]))
        const albumsMap = new Map((albumsResult.data || []).map(a => [a.id, a]))

        const data = (rawActivities || []).map(activity => ({
          ...activity,
          user: usersMap.get(activity.user_id) || undefined,
          target_user: activity.target_user_id ? usersMap.get(activity.target_user_id) || undefined : undefined,
          target_album: activity.target_album_id ? albumsMap.get(activity.target_album_id) || undefined : undefined,
          target_comment: undefined,
        }))

        const activities = data as ActivityFeedItemWithDetails[]

        setActivities(prev => offset === 0 ? activities : [...prev, ...activities])

        return activities
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activity feed'
        setError(errorMessage)
        log.error('Failed to fetch activity feed', { component: 'useActivityFeed', action: 'fetchActivityFeed' }, err)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Mark activity as read
   */
  const markAsRead = useCallback(
    async (activityId: string): Promise<boolean> => {
      // Optimistically update local state immediately
      setActivities(prev =>
        prev.map(activity =>
          activity.id === activityId
            ? { ...activity, is_read: true }
            : activity
        )
      )

      try {
        const { error: updateError } = await supabase
          .from('activity_feed')
          .update({ is_read: true })
          .eq('id', activityId)

        if (updateError) {
          log.error('Error marking activity as read', {
            component: 'useActivityFeed',
            action: 'markAsRead',
            error: updateError
          })
          // Revert optimistic update
          setActivities(prev =>
            prev.map(activity =>
              activity.id === activityId
                ? { ...activity, is_read: false }
                : activity
            )
          )
          throw updateError
        }

        return true
      } catch (err) {
        log.error('Failed to mark activity as read', { component: 'useActivityFeed', action: 'markAsRead' }, err)
        return false
      }
    },
    [supabase]
  )

  /**
   * Mark all activities as read
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    // Optimistically update local state immediately so UI reflects the change
    const previousActivities = [...activities]
    setActivities(prev =>
      prev.map(activity => ({ ...activity, is_read: true }))
    )

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error: updateError } = await supabase
        .from('activity_feed')
        .update({ is_read: true })
        .eq('target_user_id', user.id)
        .eq('is_read', false)

      if (updateError) {
        log.error('Error marking all activities as read', {
          component: 'useActivityFeed',
          action: 'markAllAsRead',
          error: updateError
        })
        // Revert optimistic update on failure
        setActivities(previousActivities)
        throw updateError
      }

      return true
    } catch (err) {
      log.error('Failed to mark all activities as read', { component: 'useActivityFeed', action: 'markAllAsRead' }, err)
      return false
    }
  }, [supabase, activities])

  /**
   * Get unread count
   */
  const getUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return 0
      }

      const { count, error: countError } = await supabase
        .from('activity_feed')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', user.id)
        .eq('is_read', false)

      if (countError) {
        log.error('Error getting unread count', {
          component: 'useActivityFeed',
          action: 'getUnreadCount',
          error: countError
        })
        throw countError
      }

      return count || 0
    } catch (err) {
      log.error('Failed to get unread count', { component: 'useActivityFeed', action: 'getUnreadCount' }, err)
      return 0
    }
  }, [supabase])

  /**
   * Clear activities (local state)
   */
  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  return {
    activities,
    isLoading,
    error,
    fetchActivityFeed,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    clearActivities
  }
}
