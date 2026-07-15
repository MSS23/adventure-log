'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import type { Follower } from '@/types/database'
import { PUBLIC_USER_COLUMNS } from '@/lib/constants/user-columns'

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

export function useFollows(
  targetUserId?: string,
  options?: {
    /**
     * Skip the viewer-wide eager work (6 stats/lists queries + a realtime
     * channel) and only expose follow status + actions. For pages that just
     * render a Follow button (profile view, album detail) — the eager load
     * is about the VIEWER's own follow graph, which those pages never show.
     */
    statusOnly?: boolean
  }
): UseFollowsReturn {
  const statusOnly = options?.statusOnly ?? false
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
  const loadedForUserIdRef = useRef<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

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
      // Users embeds list explicit safe columns — a (*) embed is permission-
      // denied once migration 76 locks down the users PII columns.
      const [followersResult, followingResult, pendingResult] = await Promise.all([
        // My followers
        supabase
          .from('follows')
          .select(`
            *,
            follower:users!follows_follower_id_fkey(${PUBLIC_USER_COLUMNS})
          `)
          .eq('following_id', user.id)
          .eq('status', 'accepted'),

        // People I follow
        supabase
          .from('follows')
          .select(`
            *,
            following:users!follows_following_id_fkey(${PUBLIC_USER_COLUMNS})
          `)
          .eq('follower_id', user.id)
          .eq('status', 'accepted'),

        // Pending requests to me
        supabase
          .from('follows')
          .select(`
            *,
            follower:users!follows_follower_id_fkey(${PUBLIC_USER_COLUMNS})
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
        .maybeSingle()

      if (error) {
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

    // Snapshot for rollback if the server rejects the optimistic change.
    const previousStatus = followStatus
    const previousStats = stats

    // Optimistic update: assume a public account (the common case) so the
    // button flips to "Following" instantly. We self-correct to "pending"
    // below if the target turns out to be private.
    setFollowStatus('following')
    setStats(s => ({ ...s, followingCount: s.followingCount + 1 }))
    setError(null)

    try {
      // Get target user's privacy level to determine final status
      const { data: targetUser } = await supabase
        .from('users')
        .select('privacy_level')
        .eq('id', userId)
        .maybeSingle()

      if (!targetUser) {
        throw new Error('User not found')
      }

      const status = targetUser.privacy_level === 'private' ? 'pending' : 'accepted'

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

      // Correct the optimistic assumption for private accounts: the request
      // is pending (not an accepted follow), so it shouldn't count yet.
      if (status === 'pending') {
        setFollowStatus('pending')
        setStats(s => ({ ...s, followingCount: Math.max(0, s.followingCount - 1) }))
      }

      // Reconcile real counts in the background (non-blocking).
      void refreshStats()

      log.info('Follow request processed', {
        component: 'useFollows',
        action: 'follow',
        targetUserId: userId,
        result: status
      })
    } catch (err) {
      // Roll back the optimistic update.
      setFollowStatus(previousStatus)
      setStats(previousStats)
      log.error('Error following user', {
        component: 'useFollows',
        action: 'follow',
        targetUserId: userId
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to follow user')
    }
  }, [user?.id, followStatus, stats, supabase, refreshStats])

  const unfollow = useCallback(async (userId: string) => {
    if (!user?.id) return

    // Snapshot for rollback.
    const previousStatus = followStatus
    const previousStats = stats

    // Optimistic update: flip to "not following" instantly. Only an accepted
    // follow contributes to followingCount, so only decrement in that case.
    const wasAccepted = previousStatus === 'following'
    setFollowStatus('not_following')
    if (wasAccepted) {
      setStats(s => ({ ...s, followingCount: Math.max(0, s.followingCount - 1) }))
    }
    setError(null)

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId)

      if (error) throw error

      void refreshStats()

      log.info('User unfollowed', {
        component: 'useFollows',
        action: 'unfollow',
        targetUserId: userId
      })
    } catch (err) {
      // Roll back.
      setFollowStatus(previousStatus)
      setStats(previousStats)
      log.error('Error unfollowing user', {
        component: 'useFollows',
        action: 'unfollow',
        targetUserId: userId
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to unfollow user')
    }
  }, [user?.id, followStatus, stats, supabase, refreshStats])

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
    if (!targetUserId || !user?.id) return

    // Cancellation guard: without it a slow response for a previous
    // targetUserId would render a stale status on the wrong profile.
    let cancelled = false
    getFollowStatus(targetUserId).then(status => {
      if (!cancelled) setFollowStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [targetUserId, user?.id, getFollowStatus])

  // Initial data load - only run once per user session
  useEffect(() => {
    if (statusOnly) return
    if (user?.id && loadedForUserIdRef.current !== user.id) {
      loadedForUserIdRef.current = user.id
      refreshStats()
      refreshFollowLists()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Real-time subscription for follow changes
  useEffect(() => {
    if (statusOnly || !user?.id) return

    // Topic must be unique PER HOOK INSTANCE: realtime-js "leaves open topics"
    // on subscribe, so with the shared `follows-${user.id}` topic every newly
    // mounted FollowButton silently killed the previous instance's channel
    // (and the last unmount left the topic entirely) — live follow updates
    // died unpredictably on any page with multiple follow buttons.
    const instanceTopic = `follows-${user.id}-${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(instanceTopic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`
        },
        () => {
          // When someone follows/unfollows me or accepts my request
          refreshStats()
          refreshFollowLists()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id}`
        },
        () => {
          // When I follow/unfollow someone
          refreshStats()
          refreshFollowLists()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase, refreshStats, refreshFollowLists, statusOnly])

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
