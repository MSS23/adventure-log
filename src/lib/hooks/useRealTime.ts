import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'

interface RealtimeConfig {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  autoSubscribe?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: string) => void
}

interface RealtimeUpdate<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
  table: string
  timestamp: string
}

export function useRealTime<T = unknown>(config: RealtimeConfig) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate<T> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  const handleRealtimeUpdate = useCallback((payload: Record<string, unknown>) => {
    const update: RealtimeUpdate<T> = {
      eventType: payload.eventType as 'DELETE' | 'INSERT' | 'UPDATE',
      new: payload.new as T | null,
      old: payload.old as T | null,
      table: payload.table as string,
      timestamp: new Date().toISOString()
    }

    setLastUpdate(update)
    setError(null)

    log.info('Real-time update received', {
      table: config.table,
      event: payload.eventType,
      recordId: (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id
    })
  }, [config.table])

  const subscribe = useCallback(() => {
    if (!user || channelRef.current) return

    try {
      // Create a unique channel name
      const channelName = `${config.table}-${user.id}-${Date.now()}`
      const channel = supabase.channel(channelName)

      // Build the event listener
      const eventConfig: Record<string, unknown> = {
        event: config.event,
        table: config.table,
        schema: 'public'
      }

      // Add filter if provided
      if (config.filter) {
        eventConfig.filter = config.filter
      }

      // Add the listener
      // @ts-ignore - Supabase v2 API typing inconsistency, functional despite TypeScript warning
      channel.on(
        'postgres_changes',
        eventConfig,
        handleRealtimeUpdate
      )

      // Handle connection status
      channel.subscribe((status) => {
        log.debug('Real-time subscription status', {
          table: config.table,
          status,
          userId: user.id
        })

        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          setIsConnected(true)
          config.onConnect?.()
        } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
          setIsConnected(false)
          setError('Failed to connect to real-time updates')
          config.onError?.('Failed to connect to real-time updates')
        } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
          setIsConnected(false)
          setError('Real-time connection timed out')
          config.onError?.('Real-time connection timed out')
        } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
          setIsConnected(false)
          config.onDisconnect?.()
        }
      })

      channelRef.current = channel

      log.info('Real-time subscription started', {
        table: config.table,
        event: config.event,
        userId: user.id
      })

    } catch (err) {
      const errorMessage = 'Failed to initialize real-time subscription'
      setError(errorMessage)
      config.onError?.(err)
      log.error('Real-time subscription error', { error: err })
    }
  }, [user, config, handleRealtimeUpdate, supabase])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
      setIsConnected(false)
      setError(null)

      log.info('Real-time subscription ended', {
        table: config.table
      })
    }
  }, [config.table])

  const reconnect = useCallback(() => {
    unsubscribe()
    setTimeout(subscribe, 1000) // Delay reconnection slightly
  }, [subscribe, unsubscribe])

  // Auto-subscribe if enabled
  useEffect(() => {
    if (config.autoSubscribe !== false && user) {
      subscribe()
    }

    return () => {
      unsubscribe()
    }
  }, [user, config.autoSubscribe, subscribe, unsubscribe])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe()
    }
  }, [unsubscribe])

  return {
    isConnected,
    lastUpdate,
    error,
    subscribe,
    unsubscribe,
    reconnect
  }
}

// Specialized hooks for common use cases

export function useAlbumsRealTime() {
  const { user } = useAuth()

  return useRealTime({
    table: 'albums',
    event: '*',
    filter: user ? `user_id=eq.${user.id}` : undefined,
    autoSubscribe: true
  })
}

export function usePhotosRealTime(albumId?: string) {
  const { user } = useAuth()

  return useRealTime({
    table: 'photos',
    event: '*',
    filter: albumId ? `album_id=eq.${albumId}` : (user ? `user_id=eq.${user.id}` : undefined),
    autoSubscribe: true
  })
}

export function useLikesRealTime(targetType: 'album' | 'photo', targetId?: string) {
  return useRealTime({
    table: 'likes',
    event: '*',
    filter: targetId ? `${targetType}_id=eq.${targetId}` : undefined,
    autoSubscribe: !!targetId
  })
}

export function useCommentsRealTime(targetType: 'album' | 'photo', targetId?: string) {
  return useRealTime({
    table: 'comments',
    event: '*',
    filter: targetId ? `${targetType}_id=eq.${targetId}` : undefined,
    autoSubscribe: !!targetId
  })
}

export function useFollowsRealTime() {
  const { user } = useAuth()

  return useRealTime({
    table: 'followers',
    event: '*',
    filter: user ? `follower_id=eq.${user.id} OR following_id=eq.${user.id}` : undefined,
    autoSubscribe: true
  })
}

// Real-time notifications hook
export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    title: string
    message: string
    type: 'album' | 'photo' | 'like' | 'comment' | 'follow'
    timestamp: string
    read: boolean
  }>>([])

  const albumUpdates = useAlbumsRealTime()
  const photoUpdates = usePhotosRealTime()
  const likeUpdates = useLikesRealTime('album') // Can be extended for photos
  const commentUpdates = useCommentsRealTime('album')
  const followUpdates = useFollowsRealTime()

  // Process album updates
  useEffect(() => {
    if (albumUpdates.lastUpdate && albumUpdates.lastUpdate.eventType === 'INSERT') {
      const newAlbum = albumUpdates.lastUpdate.new
      if (newAlbum) {
        const notification = {
          id: `album-${newAlbum.id}-${Date.now()}`,
          title: 'New Album Created',
          message: `"${newAlbum.title}" has been added to your collection`,
          type: 'album' as const,
          timestamp: albumUpdates.lastUpdate.timestamp,
          read: false
        }
        setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10
      }
    }
  }, [albumUpdates.lastUpdate])

  // Process photo updates
  useEffect(() => {
    if (photoUpdates.lastUpdate && photoUpdates.lastUpdate.eventType === 'INSERT') {
      const newPhoto = photoUpdates.lastUpdate.new
      if (newPhoto) {
        const notification = {
          id: `photo-${newPhoto.id}-${Date.now()}`,
          title: 'New Photo Added',
          message: 'A new photo has been uploaded to your album',
          type: 'photo' as const,
          timestamp: photoUpdates.lastUpdate.timestamp,
          read: false
        }
        setNotifications(prev => [notification, ...prev.slice(0, 9)])
      }
    }
  }, [photoUpdates.lastUpdate])

  // Process like updates
  useEffect(() => {
    if (likeUpdates.lastUpdate && likeUpdates.lastUpdate.eventType === 'INSERT') {
      const newLike = likeUpdates.lastUpdate.new
      if (newLike) {
        const notification = {
          id: `like-${newLike.id}-${Date.now()}`,
          title: 'New Like',
          message: 'Someone liked your content',
          type: 'like' as const,
          timestamp: likeUpdates.lastUpdate.timestamp,
          read: false
        }
        setNotifications(prev => [notification, ...prev.slice(0, 9)])
      }
    }
  }, [likeUpdates.lastUpdate])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    clearNotifications,
    isConnected: albumUpdates.isConnected || photoUpdates.isConnected
  }
}