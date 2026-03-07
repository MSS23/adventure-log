/**
 * useMentions Hook
 *
 * React hook for managing user mentions in comments
 */

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Mention } from '@/types/database'
import { log } from '@/lib/utils/logger'

export interface UseMentionsOptions {
  minQueryLength?: number
  debounceMs?: number
  maxSuggestions?: number
}

export function useMentions(options: UseMentionsOptions = {}) {
  const {
    minQueryLength = 2,
    debounceMs = 300,
    maxSuggestions = 10
  } = options

  const [suggestions, setSuggestions] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  /**
   * Search for users by username or display name
   */
  const searchUsers = useCallback(
    async (query: string): Promise<User[]> => {
      if (!query || query.length < minQueryLength) {
        return []
      }

      try {
        setIsLoading(true)
        setError(null)

        const { data, error: searchError } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, is_private, email, created_at, updated_at')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(maxSuggestions)
          .order('username', { ascending: true })

        if (searchError) {
          log.error('Error searching users for mentions', {
            component: 'useMentions',
            action: 'searchUsers',
            error: searchError
          })
          throw searchError
        }

        return (data || []) as User[]
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search users'
        setError(errorMessage)
        log.error('Failed to search users', { component: 'useMentions', action: 'searchUsers' }, err)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [supabase, minQueryLength, maxSuggestions]
  )

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null

      return (query: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(async () => {
          const results = await searchUsers(query)
          setSuggestions(results)
        }, debounceMs)
      }
    })(),
    [searchUsers, debounceMs]
  )

  /**
   * Create mention record in database
   */
  const createMention = useCallback(
    async (commentId: string, mentionedUserId: string): Promise<Mention | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('User not authenticated')
        }

        const { data, error: mentionError } = await supabase
          .from('mentions')
          .insert({
            user_id: user.id,
            mentioned_user_id: mentionedUserId,
            comment_id: commentId
          })
          .select()
          .single()

        if (mentionError) {
          log.error('Error creating mention', {
            component: 'useMentions',
            action: 'createMention',
            error: mentionError
          })
          throw mentionError
        }

        log.info('Mention created successfully', {
          component: 'useMentions',
          action: 'createMention',
          mentionId: data.id
        })

        return data
      } catch (err) {
        log.error('Failed to create mention', { component: 'useMentions', action: 'createMention' }, err)
        return null
      }
    },
    [supabase]
  )

  /**
   * Get mentions for a comment
   */
  const getMentionsForComment = useCallback(
    async (commentId: string): Promise<Mention[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('mentions')
          .select(`
            *,
            user:users!mentions_user_id_fkey(id, username, display_name, avatar_url),
            mentioned_user:users!mentions_mentioned_user_id_fkey(id, username, display_name, avatar_url)
          `)
          .eq('comment_id', commentId)
          .order('created_at', { ascending: true })

        if (fetchError) {
          log.error('Error fetching mentions', {
            component: 'useMentions',
            action: 'getMentionsForComment',
            error: fetchError
          })
          throw fetchError
        }

        return data || []
      } catch (err) {
        log.error('Failed to fetch mentions', { component: 'useMentions', action: 'getMentionsForComment' }, err)
        return []
      }
    },
    [supabase]
  )

  /**
   * Get user mentions (mentions where they were mentioned)
   */
  const getUserMentions = useCallback(
    async (userId: string, limit = 20): Promise<Mention[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('mentions')
          .select(`
            *,
            user:users!mentions_user_id_fkey(id, username, display_name, avatar_url),
            comment:comments(id, content, text, target_type, target_id)
          `)
          .eq('mentioned_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fetchError) {
          log.error('Error fetching user mentions', {
            component: 'useMentions',
            action: 'getUserMentions',
            error: fetchError
          })
          throw fetchError
        }

        return data || []
      } catch (err) {
        log.error('Failed to fetch user mentions', { component: 'useMentions', action: 'getUserMentions' }, err)
        return []
      }
    },
    [supabase]
  )

  /**
   * Clear suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    isLoading,
    error,
    searchUsers: debouncedSearch,
    createMention,
    getMentionsForComment,
    getUserMentions,
    clearSuggestions
  }
}
