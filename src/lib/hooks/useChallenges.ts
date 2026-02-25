'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Challenge {
  id: string
  title: string
  description: string
  icon: string
  badge_color: string
  category: string
  target_count: number
  target_type: string
  sort_order: number
}

export interface UserChallenge {
  challenge_id: string
  progress: number
  completed_at: string | null
}

export interface ChallengeWithProgress extends Challenge {
  progress: number
  completed_at: string | null
  percentage: number
}

export function useChallenges(userId: string | undefined) {
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChallenges = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // First, update challenge progress (ignore errors if RPC not available yet)
      await Promise.resolve(supabase.rpc('update_challenge_progress', { p_user_id: userId })).catch(() => {})

      // Fetch all active challenges
      const { data: allChallenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      // Fetch user's progress
      const { data: userProgress } = await supabase
        .from('user_challenges')
        .select('challenge_id, progress, completed_at')
        .eq('user_id', userId)

      if (allChallenges) {
        const progressMap = new Map(
          (userProgress || []).map(up => [up.challenge_id, up])
        )

        const merged: ChallengeWithProgress[] = allChallenges.map(c => {
          const up = progressMap.get(c.id)
          const progress = up?.progress || 0
          return {
            ...c,
            progress,
            completed_at: up?.completed_at || null,
            percentage: Math.min(100, Math.round((progress / c.target_count) * 100)),
          }
        })

        setChallenges(merged)
      }
    } catch {
      // Tables might not exist yet
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  const completedCount = challenges.filter(c => c.completed_at).length
  const totalCount = challenges.length
  const inProgressChallenges = challenges.filter(c => !c.completed_at && c.progress > 0)
  const completedChallenges = challenges.filter(c => c.completed_at)

  return {
    challenges,
    loading,
    completedCount,
    totalCount,
    inProgressChallenges,
    completedChallenges,
    refresh: fetchChallenges,
  }
}
