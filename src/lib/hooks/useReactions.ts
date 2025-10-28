'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

export type ReactionType = 'joy' | 'fire' | 'thumbsup' | 'heart' | 'star' | 'clap'

export interface Reaction {
  id: string
  user_id: string
  target_type: 'album' | 'photo'
  target_id: string
  reaction_type: ReactionType
  created_at: string
}

export interface ReactionWithUser extends Reaction {
  username?: string
  display_name?: string
  avatar_url?: string
}

export interface ReactionCounts {
  joy?: number
  fire?: number
  thumbsup?: number
  heart?: number
  star?: number
  clap?: number
}

interface UseReactionsOptions {
  albumId?: string
  photoId?: string
}

export function useReactions({ albumId, photoId }: UseReactionsOptions) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<ReactionWithUser[]>([])
  const [userReactions, setUserReactions] = useState<ReactionType[]>([])
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetType = albumId ? 'album' : 'photo'
  const targetId = albumId || photoId

  // Fetch reactions for the target
  const fetchReactions = useCallback(async () => {
    if (!targetId) return

    const supabase = createClient()

    try {
      setError(null)

      // Fetch all reactions with user info
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('reactions_with_users')
        .select('*')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .order('created_at', { ascending: false })

      if (reactionsError) throw reactionsError

      setReactions((reactionsData as ReactionWithUser[]) || [])

      // Count reactions by type
      const counts: ReactionCounts = {}
      ;(reactionsData || []).forEach((r: ReactionWithUser) => {
        const type = r.reaction_type
        counts[type] = (counts[type] || 0) + 1
      })
      setReactionCounts(counts)

      // Filter user's own reactions
      if (user) {
        const userReactionTypes = (reactionsData || [])
          .filter((r: ReactionWithUser) => r.user_id === user.id)
          .map((r: ReactionWithUser) => r.reaction_type)
        setUserReactions(userReactionTypes)
      }
    } catch (err) {
      log.error('Error fetching reactions', {
        component: 'useReactions',
        targetType,
        targetId
      }, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reactions')
    }
  }, [targetType, targetId, user])

  // Toggle a reaction
  const toggleReaction = useCallback(async (reactionType: ReactionType) => {
    if (!user || !targetId || loading) return

    setLoading(true)
    const supabase = createClient()

    try {
      setError(null)

      // Optimistic update
      const hasReaction = userReactions.includes(reactionType)

      if (hasReaction) {
        // Remove reaction optimistically
        setUserReactions(prev => prev.filter(r => r !== reactionType))
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }))
      } else {
        // Add reaction optimistically
        setUserReactions(prev => [...prev, reactionType])
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: (prev[reactionType] || 0) + 1
        }))
      }

      // Call the toggle function in the database
      const { data, error: toggleError } = await supabase
        .rpc('toggle_reaction', {
          p_target_type: targetType,
          p_target_id: targetId,
          p_reaction_type: reactionType
        })

      if (toggleError) throw toggleError

      log.info('Reaction toggled', {
        component: 'useReactions',
        action: data?.action || 'toggle',
        reactionType,
        targetType,
        targetId
      })

      // Refresh reactions to get accurate data
      await fetchReactions()
    } catch (err) {
      log.error('Error toggling reaction', {
        component: 'useReactions',
        reactionType,
        targetType,
        targetId
      }, err)
      setError(err instanceof Error ? err.message : 'Failed to toggle reaction')

      // Revert optimistic update on error
      await fetchReactions()
    } finally {
      setLoading(false)
    }
  }, [user, targetId, targetType, userReactions, loading, fetchReactions])

  // Initial fetch
  useEffect(() => {
    if (targetId) {
      fetchReactions()
    }
  }, [targetId, fetchReactions])

  // Set up real-time subscription
  useEffect(() => {
    if (!targetId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`reactions-${targetType}-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `target_id=eq.${targetId}`
        },
        (payload) => {
          log.info('Reaction change detected', {
            component: 'useReactions',
            event: payload.eventType,
            targetType,
            targetId
          })

          // Refresh reactions
          fetchReactions()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [targetType, targetId, fetchReactions])

  return {
    reactions,
    userReactions,
    reactionCounts,
    loading,
    error,
    toggleReaction,
    hasUserReacted: (type: ReactionType) => userReactions.includes(type),
    totalReactions: Object.values(reactionCounts).reduce((sum, count) => sum + count, 0),
    refresh: fetchReactions
  }
}