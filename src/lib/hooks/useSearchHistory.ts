/**
 * useSearchHistory Hook
 *
 * React hook for managing user search history
 */

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SearchHistory, SearchType } from '@/types/database'
import { log } from '@/lib/utils/logger'

export function useSearchHistory() {
  const supabase = createClient()

  /**
   * Add search query to history
   */
  const addToHistory = useCallback(
    async (
      query: string,
      searchType: SearchType,
      resultId?: string,
      resultClicked: boolean = false
    ): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return false
        }

        const { error: insertError } = await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            query: query.trim(),
            search_type: searchType,
            result_id: resultId || null,
            result_clicked: resultClicked
          })

        if (insertError) {
          log.error('Error adding to search history', {
            component: 'useSearchHistory',
            action: 'addToHistory',
            error: insertError
          })
          throw insertError
        }

        log.info('Added to search history', {
          component: 'useSearchHistory',
          action: 'addToHistory',
          searchType,
          query
        })

        return true
      } catch (err) {
        log.error('Failed to add to search history', { component: 'useSearchHistory', action: 'addToHistory' }, err)
        return false
      }
    },
    [supabase]
  )

  /**
   * Get recent search queries
   */
  const getRecentSearches = useCallback(
    async (limit = 10, searchType?: SearchType): Promise<SearchHistory[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return []
        }

        let query = supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('searched_at', { ascending: false })
          .limit(limit)

        if (searchType) {
          query = query.eq('search_type', searchType)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          log.error('Error fetching recent searches', {
            component: 'useSearchHistory',
            action: 'getRecentSearches',
            error: fetchError
          })
          throw fetchError
        }

        return data || []
      } catch (err) {
        log.error('Failed to fetch recent searches', { component: 'useSearchHistory', action: 'getRecentSearches' }, err)
        return []
      }
    },
    [supabase]
  )

  /**
   * Get unique recent queries (deduplicated)
   */
  const getUniqueRecentQueries = useCallback(
    async (limit = 5, searchType?: SearchType): Promise<string[]> => {
      try {
        const searches = await getRecentSearches(50, searchType)

        // Deduplicate by query and take most recent
        const uniqueQueries = new Map<string, SearchHistory>()

        for (const search of searches) {
          const normalizedQuery = search.query.toLowerCase().trim()
          if (!uniqueQueries.has(normalizedQuery)) {
            uniqueQueries.set(normalizedQuery, search)
          }
        }

        return Array.from(uniqueQueries.values())
          .slice(0, limit)
          .map(s => s.query)
      } catch (err) {
        log.error('Failed to get unique recent queries', { component: 'useSearchHistory', action: 'getUniqueRecentQueries' }, err)
        return []
      }
    },
    [getRecentSearches]
  )

  /**
   * Clear search history for current user
   */
  const clearHistory = useCallback(
    async (searchType?: SearchType): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return false
        }

        let query = supabase
          .from('search_history')
          .delete()
          .eq('user_id', user.id)

        if (searchType) {
          query = query.eq('search_type', searchType)
        }

        const { error: deleteError } = await query

        if (deleteError) {
          log.error('Error clearing search history', {
            component: 'useSearchHistory',
            action: 'clearHistory',
            error: deleteError
          })
          throw deleteError
        }

        log.info('Cleared search history', {
          component: 'useSearchHistory',
          action: 'clearHistory',
          searchType: searchType || 'all'
        })

        return true
      } catch (err) {
        log.error('Failed to clear search history', { component: 'useSearchHistory', action: 'clearHistory' }, err)
        return false
      }
    },
    [supabase]
  )

  /**
   * Delete single search entry
   */
  const deleteSearch = useCallback(
    async (searchId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('search_history')
          .delete()
          .eq('id', searchId)

        if (deleteError) {
          log.error('Error deleting search', {
            component: 'useSearchHistory',
            action: 'deleteSearch',
            error: deleteError
          })
          throw deleteError
        }

        return true
      } catch (err) {
        log.error('Failed to delete search', { component: 'useSearchHistory', action: 'deleteSearch' }, err)
        return false
      }
    },
    [supabase]
  )

  return {
    addToHistory,
    getRecentSearches,
    getUniqueRecentQueries,
    clearHistory,
    deleteSearch
  }
}
