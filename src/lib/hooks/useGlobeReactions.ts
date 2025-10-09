/**
 * Globe Reactions Hook
 * Manages reactions/stickers that friends can drop on your globe
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import type {
  GlobeReaction,
  GlobeReactionWithDetails,
  GlobeReactionType,
  GlobeReactionSettings,
  GlobeReactionStats,
  CreateGlobeReactionRequest,
  UpdateGlobeReactionRequest
} from '@/types/database'

interface UseGlobeReactionsOptions {
  targetUserId?: string // Fetch reactions for a specific user's globe
  autoRefresh?: boolean // Auto-refresh on realtime changes
  includePrivate?: boolean // Include private reactions (only if viewing own globe)
}

export function useGlobeReactions(options: UseGlobeReactionsOptions = {}) {
  const { user } = useAuth()
  const { targetUserId, autoRefresh = true, includePrivate = false } = options

  const [reactions, setReactions] = useState<GlobeReactionWithDetails[]>([])
  const [reactionTypes, setReactionTypes] = useState<GlobeReactionType[]>([])
  const [settings, setSettings] = useState<GlobeReactionSettings | null>(null)
  const [stats, setStats] = useState<GlobeReactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Determine which user's reactions to fetch
  const effectiveTargetUserId = targetUserId || user?.id

  /**
   * Fetch reaction types (sticker options)
   */
  const fetchReactionTypes = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('globe_reaction_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError

      setReactionTypes(data || [])
    } catch (err) {
      log.error('Error fetching reaction types', { component: 'useGlobeReactions' }, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reaction types')
    }
  }, [supabase])

  /**
   * Fetch globe reactions for a user
   */
  const fetchReactions = useCallback(async () => {
    if (!effectiveTargetUserId) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Use the database function for optimized querying
      const { data, error: fetchError } = await supabase.rpc('get_globe_reactions', {
        target_user_id_param: effectiveTargetUserId,
        requesting_user_id_param: user?.id || null,
        limit_param: 100
      })

      if (fetchError) throw fetchError

      setReactions(data || [])
    } catch (err) {
      log.error('Error fetching globe reactions', {
        component: 'useGlobeReactions',
        targetUserId: effectiveTargetUserId
      }, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reactions')
    } finally {
      setLoading(false)
    }
  }, [supabase, effectiveTargetUserId, user?.id])

  /**
   * Fetch user's reaction settings
   */
  const fetchSettings = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('globe_reaction_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = not found, which is fine (use defaults)
        throw fetchError
      }

      setSettings(data || null)
    } catch (err) {
      log.error('Error fetching reaction settings', {
        component: 'useGlobeReactions',
        userId: user.id
      }, err)
    }
  }, [supabase, user?.id])

  /**
   * Fetch reaction statistics
   */
  const fetchStats = useCallback(async () => {
    if (!effectiveTargetUserId) return

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_reaction_stats', {
          user_id_param: effectiveTargetUserId
        })

      if (fetchError) throw fetchError

      if (data && data.length > 0) {
        setStats(data[0])
      }
    } catch (err) {
      log.error('Error fetching reaction stats', {
        component: 'useGlobeReactions',
        userId: effectiveTargetUserId
      }, err)
    }
  }, [supabase, effectiveTargetUserId])

  /**
   * Create a new reaction
   */
  const createReaction = useCallback(async (
    reactionData: CreateGlobeReactionRequest
  ): Promise<GlobeReaction | null> => {
    if (!user?.id) {
      throw new Error('Must be logged in to create reactions')
    }

    try {
      const { data, error: createError } = await supabase
        .from('globe_reactions')
        .insert({
          user_id: user.id,
          ...reactionData
        })
        .select()
        .single()

      if (createError) throw createError

      log.info('Globe reaction created', {
        component: 'useGlobeReactions',
        action: 'create-reaction',
        reactionType: reactionData.reaction_type
      })

      // Refresh reactions list
      await fetchReactions()
      await fetchStats()

      return data
    } catch (err) {
      log.error('Error creating globe reaction', {
        component: 'useGlobeReactions',
        action: 'create-reaction'
      }, err)
      throw err
    }
  }, [user?.id, supabase, fetchReactions, fetchStats])

  /**
   * Update a reaction (e.g., mark as read, update message)
   */
  const updateReaction = useCallback(async (
    reactionId: string,
    updates: UpdateGlobeReactionRequest
  ): Promise<void> => {
    try {
      const { error: updateError } = await supabase
        .from('globe_reactions')
        .update(updates)
        .eq('id', reactionId)

      if (updateError) throw updateError

      log.info('Globe reaction updated', {
        component: 'useGlobeReactions',
        action: 'update-reaction',
        reactionId
      })

      // Refresh reactions list
      await fetchReactions()
    } catch (err) {
      log.error('Error updating globe reaction', {
        component: 'useGlobeReactions',
        action: 'update-reaction',
        reactionId
      }, err)
      throw err
    }
  }, [supabase, fetchReactions])

  /**
   * Delete a reaction
   */
  const deleteReaction = useCallback(async (reactionId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('globe_reactions')
        .delete()
        .eq('id', reactionId)

      if (deleteError) throw deleteError

      log.info('Globe reaction deleted', {
        component: 'useGlobeReactions',
        action: 'delete-reaction',
        reactionId
      })

      // Refresh reactions list
      await fetchReactions()
      await fetchStats()
    } catch (err) {
      log.error('Error deleting globe reaction', {
        component: 'useGlobeReactions',
        action: 'delete-reaction',
        reactionId
      }, err)
      throw err
    }
  }, [supabase, fetchReactions, fetchStats])

  /**
   * Mark reactions as read
   */
  const markAsRead = useCallback(async (reactionIds?: string[]): Promise<void> => {
    if (!user?.id) return

    try {
      const { error: markError } = await supabase
        .rpc('mark_reactions_as_read', {
          user_id_param: user.id,
          reaction_ids: reactionIds || null
        })

      if (markError) throw markError

      log.info('Reactions marked as read', {
        component: 'useGlobeReactions',
        action: 'mark-as-read',
        count: reactionIds?.length || 'all'
      })

      // Refresh reactions list
      await fetchReactions()
      await fetchStats()
    } catch (err) {
      log.error('Error marking reactions as read', {
        component: 'useGlobeReactions',
        action: 'mark-as-read'
      }, err)
      throw err
    }
  }, [user?.id, supabase, fetchReactions, fetchStats])

  /**
   * Update reaction settings
   */
  const updateSettings = useCallback(async (
    newSettings: Partial<GlobeReactionSettings>
  ): Promise<void> => {
    if (!user?.id) {
      throw new Error('Must be logged in to update settings')
    }

    try {
      const { error: updateError } = await supabase
        .from('globe_reaction_settings')
        .upsert({
          user_id: user.id,
          ...newSettings
        })

      if (updateError) throw updateError

      log.info('Reaction settings updated', {
        component: 'useGlobeReactions',
        action: 'update-settings'
      })

      await fetchSettings()
    } catch (err) {
      log.error('Error updating reaction settings', {
        component: 'useGlobeReactions',
        action: 'update-settings'
      }, err)
      throw err
    }
  }, [user?.id, supabase, fetchSettings])

  /**
   * Get reactions for a specific album
   */
  const getReactionsForAlbum = useCallback((albumId: string): GlobeReactionWithDetails[] => {
    return reactions.filter(r => r.target_album_id === albumId)
  }, [reactions])

  /**
   * Get unread reactions
   */
  const unreadReactions = useMemo(() => {
    return reactions.filter(r => !r.is_read && r.target_user_id === user?.id)
  }, [reactions, user?.id])

  /**
   * Get reactions by type
   */
  const getReactionsByType = useCallback((reactionType: string): GlobeReactionWithDetails[] => {
    return reactions.filter(r => r.reaction_type === reactionType)
  }, [reactions])

  // Initial data load
  useEffect(() => {
    fetchReactionTypes()
    fetchReactions()
    fetchStats()
    if (user?.id) {
      fetchSettings()
    }
  }, [fetchReactionTypes, fetchReactions, fetchStats, fetchSettings, user?.id])

  // Real-time subscriptions
  useEffect(() => {
    if (!autoRefresh || !effectiveTargetUserId) return

    const channel = supabase
      .channel(`globe-reactions-${effectiveTargetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'globe_reactions',
          filter: `target_user_id=eq.${effectiveTargetUserId}`
        },
        (payload) => {
          log.info('Globe reaction change detected', {
            component: 'useGlobeReactions',
            action: 'realtime-change',
            event: payload.eventType
          })

          // Refresh data
          fetchReactions()
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [autoRefresh, effectiveTargetUserId, supabase, fetchReactions, fetchStats])

  return {
    // Data
    reactions,
    reactionTypes,
    settings,
    stats,
    unreadReactions,
    unreadCount: stats?.unread_count || 0,

    // Loading states
    loading,
    error,

    // Actions
    createReaction,
    updateReaction,
    deleteReaction,
    markAsRead,
    updateSettings,

    // Utilities
    getReactionsForAlbum,
    getReactionsByType,
    refresh: fetchReactions,
    refreshStats: fetchStats
  }
}

export type UseGlobeReactionsReturn = ReturnType<typeof useGlobeReactions>
