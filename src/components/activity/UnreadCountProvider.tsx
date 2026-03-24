'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

interface UnreadCountContextType {
  unreadCount: number
  refreshCount: () => Promise<void>
  decrementCount: (by?: number) => void
  resetCount: () => void
}

const UnreadCountContext = createContext<UnreadCountContextType>({
  unreadCount: 0,
  refreshCount: async () => {},
  decrementCount: () => {},
  resetCount: () => {},
})

export function UnreadCountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  const fetchCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    try {
      const { count, error } = await supabase
        .from('activity_feed')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', user.id)
        .eq('is_read', false)

      if (error) {
        log.error('Failed to fetch unread count', { component: 'UnreadCountProvider' }, error)
        return
      }

      setUnreadCount(count || 0)
    } catch (err) {
      log.error('Error in unread count fetch', { component: 'UnreadCountProvider' }, err as Error)
    }
  }, [user, supabase])

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  // Subscribe to new activity feed inserts for real-time badge updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('unread-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `target_user_id=eq.${user.id}`
      }, () => {
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const decrementCount = useCallback((by = 1) => {
    setUnreadCount(prev => Math.max(0, prev - by))
  }, [])

  const resetCount = useCallback(() => {
    setUnreadCount(0)
  }, [])

  const value = useMemo(() => ({
    unreadCount,
    refreshCount: fetchCount,
    decrementCount,
    resetCount,
  }), [unreadCount, fetchCount, decrementCount, resetCount])

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  )
}

export function useUnreadCount() {
  return useContext(UnreadCountContext)
}
