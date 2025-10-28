'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import type { Follower } from '@/types/database'

interface FollowStats {
  followersCount: number
  followingCount: number
  pendingRequestsCount: number
}

interface UseFollowsReturn {
  // Stats
  stats: FollowStats
  loading: boolean
  error: string | null

  // Follow status for a specific user
  followStatus: 'not_following' | 'pending' | 'following' | 'blocked'

  // Actions
  follow: (userId: string) => Promise<void>
  unfollow: (userId: string) => Promise<void>
  followUser: (userId: string) => Promise<void> // Alias
  unfollowUser: (userId: string) => Promise<void> // Alias
  acceptFollowRequest: (followerUserId: string) => Promise<void>
  rejectFollowRequest: (followerUserId: string) => Promise<void>

  // Lists
  followers: Follower[]
  following: Follower[]
  pendingRequests: Follower[]

  // Methods
  getFollowStatus: (userId: string) => Promise<'not_following' | 'pending' | 'following' | 'blocked'>
  refreshStats: () => Promise<void>
  refreshFollowLists: () => Promise<void>
}

export function useFollows(targetUserId?: string): UseFollowsReturn {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<FollowStats>({
    followersCount: 0,
    followingCount: 0,
    pendingRequestsCount: 0
  })
  const [followStatus, setFollowStatus] = useState<'not_following' | 'pending' | 'following' | 'blocked'>('not_following')
  const [followers, setFollowers] = useState<Follower[]>([])
  const [following, setFollowing] = useState<Follower[]>([])
  const [pendingRequests, setPendingRequests] = useState<Follower[]>([])

  const supabase = createClient()

  const refreshStats = useCallback(async () => {
    if (!user?.id) return

    try {
      const [followersResult, followingResult, pendingResult] = await Promise.all([
        // Count followers (people following me with accepted status)
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', user.id)
          .eq('status', 'accepted'),

        // Count following (people I'm following with accepted status)
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', user.id)
          .eq('status', 'accepted'),

        // Count pending requests TO me (people requesting to follow me)
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', user.id)
          .eq('status', 'pending')
      ])

      setStats({
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
        pendingRequestsCount: pendingResult.count || 0
      })
    } catch (err) {
      log.error('Error fetching follow stats', {
        component: 'useFollows',
        action: 'refreshStats',
        userId: user.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to fetch follow stats')
    }
  }, [user?.id, supabase])

  const refreshFollowLists = useCallback(async () => {
    if (!user?.id) return

    try {
      const [followersResult, followingResult, pendingResult] = await Promise.all([
        // My followers
        supabase
          .from('follows')
          .select(`
            *,
            follower:users!follows_follower_id_fkey(*)
          `)
          .eq('following_id', user.id)
          .eq('status', 'accepted'),

        // People I follow
        supabase
          .from('follows')
          .select(`
            *,
            following:users!follows_following_id_fkey(*)
          `)
          .eq('follower_id', user.id)
          .eq('status', 'accepted'),

        // Pending requests to me
        supabase
          .from('follows')
          .select(`
            *,
            follower:users!follows_follower_id_fkey(*)
          `)
          .eq('following_id', user.id)
          .eq('status', 'pending')
      ])

      setFollowers(followersResult.data || [])
      setFollowing(followingResult.data || [])
      setPendingRequests(pendingResult.data || [])
    } catch (err) {
      log.error('Error fetching follow lists', {
        component: 'useFollows',
        action: 'refreshFollowLists',
        userId: user.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to fetch follow lists')
    }
  }, [user?.id, supabase])

  const getFollowStatus = useCallback(async (userId: string): Promise<'not_following' | 'pending' | 'following' | 'blocked'> => {
    if (!user?.id || userId === user.id) return 'not_following'

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) return 'not_following'

      switch (data.status) {
        case 'accepted':
          return 'following'
        case 'pending':
          return 'pending'
        case 'rejected':
          return 'blocked'
        default:
          return 'not_following'
      }
    } catch (err) {
      log.error('Error getting follow status', {
        component: 'useFollows',
        action: 'getFollowStatus',
        userId,
        currentUser: user.id
      }, err instanceof Error ? err : new Error(String(err)))
      return 'not_following'
    }
  }, [user?.id, supabase])

  const follow = useCallback(async (userId: string) => {
    if (!user?.id || userId === user.id) return

    try {
      setLoading(true)
      setError(null)

      // Get target user's privacy level to determine status
      const { data: targetUser } = await supabase
        .from('users')
        .select('privacy_level')
        .eq('id', userId)
        .single()

      const status = targetUser?.privacy_level === 'private' ? 'pending' : 'accepted'

      // Direct database insert instead of RPC (workaround until migration is applied)
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
          status: status,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      // Update follow status
      setFollowStatus(status === 'accepted' ? 'following' : 'pending')

      await refreshStats()

      log.info('Follow request processed', {
        component: 'useFollows',
        action: 'follow',
        targetUserId: userId,
        result: status
      })
    } catch (err) {
      log.error('Error following user', {
        component: 'useFollows',
        action: 'follow',
        targetUserId: userId
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to follow user')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase, refreshStats])

  const unfollow = useCallback(async (userId: string) => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId)

      if (error) throw error

      setFollowStatus('not_following')
      await refreshStats()

      log.info('User unfollowed', {
        component: 'useFollows',
        action: 'unfollow',
        targetUserId: userId
      })
    } catch (err) {
      log.error('Error unfollowing user', {
        component: 'useFollows',
        action: 'unfollow',
        targetUserId: userId
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to unfollow user')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase, refreshStats])

  const acceptFollowRequest = useCallback(async (followerUserId: string) => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // Direct database update instead of RPC (workaround until migration is applied)
      const { error } = await supabase
        .from('follows')
        .update({ status: 'accepted' })
        .eq('follower_id', followerUserId)
        .eq('following_id', user.id)
        .eq('status', 'pending')

      if (error) throw error

      await Promise.all([refreshStats(), refreshFollowLists()])

      log.info('Follow request accepted', {
        component: 'useFollows',
        action: 'acceptFollowRequest',
        followerUserId
      })
    } catch (err) {
      log.error('Error accepting follow request', {
        component: 'useFollows',
        action: 'acceptFollowRequest',
        followerUserId
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to accept follow request')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase, refreshStats, refreshFollowLists])

  const rejectFollowRequest = useCallback(async (followerUserId: string) => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // Direct database delete instead of RPC (workaround until migration is applied)
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerUserId)
        .eq('following_id', user.id)
        .eq('status', 'pending')

      if (error) throw error

      await Promise.all([refreshStats(), refreshFollowLists()])

      log.info('Follow request rejected', {
        component: 'useFollows',
        action: 'rejectFollowRequest',
        followerUserId
      })
    } catch (err) {
      log.error('Error rejecting follow request', {
        component: 'useFollows',
        action: 'rejectFollowRequest',
        followerUserId
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to reject follow request')
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase, refreshStats, refreshFollowLists])

  // Update follow status for specific target user
  useEffect(() => {
    if (targetUserId && user?.id) {
      getFollowStatus(targetUserId).then(setFollowStatus)
    }
  }, [targetUserId, user?.id, getFollowStatus])

  // Initial data load
  useEffect(() => {
    if (user?.id) {
      refreshStats()
      refreshFollowLists()
    }
  }, [user?.id, refreshStats, refreshFollowLists])

  return {
    stats,
    loading,
    error,
    followStatus,
    follow,
    unfollow,
    followUser: follow, // Alias for backwards compatibility
    unfollowUser: unfollow, // Alias for backwards compatibility
    acceptFollowRequest,
    rejectFollowRequest,
    followers,
    following,
    pendingRequests,
    getFollowStatus,
    refreshStats,
    refreshFollowLists
  }
}