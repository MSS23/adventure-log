/**
 * useActivityFeed Hook
 *
 * React hook for managing the user's activity feed
 */

import { useState, useCallback } from 'react'
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

  const supabase = createClient()

  /**
   * Fetch activity feed for current user
   */
  const fetchActivityFeed = useCallback(
    async (limit = 30, offset = 0): Promise<ActivityFeedItemWithDetails[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('activity_feed')
          .select(`
            *,
            user:users!activity_feed_user_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            ),
            target_user:users!activity_feed_target_user_id_fkey(
              id,
              username,
              display_name
            ),
            target_album:albums(
              id,
              title,
              cover_photo_url
            ),
            target_comment:comments(
              id,
              content
            )
          `)
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

        const activities = (data || []) as ActivityFeedItemWithDetails[]

        setActivities(prev => offset === 0 ? activities : [...prev, ...activities])

        log.info('Fetched activity feed', {
          component: 'useActivityFeed',
          action: 'fetchActivityFeed',
          count: activities.length
        })

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
          throw updateError
        }

        // Update local state
        setActivities(prev =>
          prev.map(activity =>
            activity.id === activityId
              ? { ...activity, is_read: true }
              : activity
          )
        )

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
        throw updateError
      }

      // Update local state
      setActivities(prev =>
        prev.map(activity => ({ ...activity, is_read: true }))
      )

      return true
    } catch (err) {
      log.error('Failed to mark all activities as read', { component: 'useActivityFeed', action: 'markAllAsRead' }, err)
      return false
    }
  }, [supabase])

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
