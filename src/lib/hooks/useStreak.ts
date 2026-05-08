'use client'

import { useEffect, useState, useCallback } from 'react'
import { log } from '@/lib/utils/logger'

export interface StreakData {
  current: number
  longest: number
  last_activity: string | null
}

/**
 * useStreak — read-only streak data with a `record` helper that pings
 * /api/me/streak POST when the user performs a meaningful action
 * (create album, add photo, add pin). Idempotent per day.
 */
export function useStreak() {
  const [data, setData] = useState<StreakData>({
    current: 0,
    longest: 0,
    last_activity: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/streak')
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (error) {
        log.error('Streak fetch failed', { component: 'useStreak' }, error as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const record = useCallback(async () => {
    try {
      const res = await fetch('/api/me/streak', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      log.error('Streak record failed', { component: 'useStreak' }, error as Error)
    }
  }, [])

  return { ...data, loading, record }
}
