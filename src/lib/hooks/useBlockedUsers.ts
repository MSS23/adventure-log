'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import type { UserBlock } from '@/types/database'

const BLOCKED_USERS_KEY = 'blocked-users'

/**
 * Fetch all users blocked by the current user.
 */
export function useBlockedUsers() {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery<UserBlock[]>({
    queryKey: [BLOCKED_USERS_KEY, user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id, blocker_id, blocked_id, reason, created_at, blocked_user:users!blocked_id(id, name, username, display_name, avatar_url)')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        log.error('Error fetching blocked users', { component: 'useBlockedUsers', action: 'fetch' }, error)
        throw error
      }

      return (data || []) as unknown as UserBlock[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Mutation to block a user.
 */
export function useBlockUser() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ blockedId, reason }: { blockedId: string; reason?: string }) => {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: blockedId, reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to block user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_USERS_KEY, user?.id] })
      // Also invalidate follow-related queries since follows are removed
      queryClient.invalidateQueries({ queryKey: ['follows'] })
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
    },
    onError: (error) => {
      log.error('Error blocking user', { component: 'useBlockUser', action: 'block' }, error)
    },
  })
}

/**
 * Mutation to unblock a user.
 */
export function useUnblockUser() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const response = await fetch(`/api/users/block?blocked_id=${blockedId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to unblock user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_USERS_KEY, user?.id] })
    },
    onError: (error) => {
      log.error('Error unblocking user', { component: 'useUnblockUser', action: 'unblock' }, error)
    },
  })
}

/**
 * Check if a specific user is blocked by the current user.
 */
export function useIsBlocked(userId: string | undefined) {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery<boolean>({
    queryKey: [BLOCKED_USERS_KEY, 'check', user?.id, userId],
    queryFn: async () => {
      if (!user || !userId) return false

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle()

      if (error) {
        log.error('Error checking block status', { component: 'useIsBlocked', action: 'check' }, error)
        return false
      }

      return !!data
    },
    enabled: !!user && !!userId && user.id !== userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
