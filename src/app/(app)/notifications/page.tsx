'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Camera,
  MapPin,
  Award,
  Users,
  Trash2,
  Check,
  ArrowLeft
} from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { formatDistanceToNow } from 'date-fns'
import { UserAvatarLink } from '@/components/social/UserLink'
import Link from 'next/link'
import { getAvatarUrl } from '@/lib/utils/avatar'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    fetchNotifications()
    const unsub = subscribeToNotifications()

    return () => {
      // Guard: subscribeToNotifications always returns a cleanup fn, but stay defensive.
      if (typeof unsub === 'function') unsub()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchNotifications and subscribeToNotifications are stable functions defined below
  }, [user])

  const fetchNotifications = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id(id, username, display_name, avatar_url)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])

      log.info('Notifications fetched', {
        component: 'NotificationsPage',
        count: data?.length
      })
    } catch (error) {
      log.error('Failed to fetch notifications', {
        component: 'NotificationsPage'
      }, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      log.error('Failed to mark notification as read', {
        component: 'NotificationsPage'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      log.error('Failed to mark all as read', {
        component: 'NotificationsPage'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      log.error('Failed to delete notification', {
        component: 'NotificationsPage'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5" style={{ color: 'var(--color-coral)' }} />
      case 'comment':
        return <MessageCircle className="h-5 w-5" style={{ color: 'var(--color-forest)' }} />
      case 'follow':
        return <UserPlus className="h-5 w-5" style={{ color: 'var(--color-forest)' }} />
      case 'album_invite':
      case 'collaboration':
        return <Users className="h-5 w-5" style={{ color: 'var(--color-sky)' }} />
      case 'photo':
        return <Camera className="h-5 w-5" style={{ color: 'var(--color-coral)' }} />
      case 'location':
        return <MapPin className="h-5 w-5" style={{ color: 'var(--color-sky)' }} />
      case 'achievement':
        return <Award className="h-5 w-5" style={{ color: 'var(--color-gold)' }} />
      default:
        return <Bell className="h-5 w-5" style={{ color: 'var(--color-muted-warm)' }} />
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" onClick={() => window.history.back()} size="sm" className="cursor-pointer rounded-full active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <p className="al-eyebrow mb-0.5">Inbox</p>
            <h1 className="al-display text-3xl md:text-4xl flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-6 h-6 px-2 text-[11px] font-bold text-white rounded-full"
                  style={{ background: 'var(--color-coral)' }}
                >
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 && (
              <p className="text-[color:var(--color-muted-warm)] text-sm mt-1 font-mono tracking-wide">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="shrink-0 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97] transition-all duration-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div
            className="h-8 w-8 rounded-full border-[3px] animate-spin"
            style={{ borderColor: 'var(--color-coral-tint)', borderTopColor: 'var(--color-coral)' }}
          />
          <p className="text-sm text-[color:var(--color-muted-warm)]">Loading...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="al-card py-16">
          <div className="text-center">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--color-ivory-alt)' }}
            >
              <Bell className="h-8 w-8" style={{ color: 'var(--color-muted-warm)' }} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-[color:var(--color-ink)] mb-2">
              No notifications yet
            </h3>
            <p className="text-sm text-[color:var(--color-muted-warm)]">
              We&apos;ll let you know when something happens.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="group relative rounded-2xl transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden"
              style={{
                background: notification.is_read ? 'var(--card)' : 'var(--color-coral-tint)',
                border: '1px solid var(--color-line-warm)',
              }}
            >
              {/* Unread accent rail */}
              {!notification.is_read && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: 'var(--color-coral)' }}
                  aria-hidden
                />
              )}
              <div className="p-4 pl-5">
                {notification.link ? (
                  <Link
                    href={notification.link}
                    onClick={() => markAsRead(notification.id)}
                    className="block"
                  >
                    <NotificationItem notification={notification} getIcon={getNotificationIcon} />
                  </Link>
                ) : (
                  <NotificationItem notification={notification} getIcon={getNotificationIcon} />
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    deleteNotification(notification.id)
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:opacity-100 active:scale-[0.9]"
                  title="Delete notification"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  getIcon
}: {
  notification: Notification
  getIcon: (type: string) => React.ReactElement
}) {
  return (
    <div className="flex items-start gap-4 pr-8">
      {/* Sender Avatar or Icon */}
      {notification.sender ? (
        <UserAvatarLink user={notification.sender}>
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={getAvatarUrl(notification.sender.avatar_url, notification.sender.username)} />
            <AvatarFallback className="text-white font-semibold" style={{ background: 'var(--color-coral)' }}>
              {notification.sender.display_name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </UserAvatarLink>
      ) : (
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-ivory-alt)' }}
        >
          {getIcon(notification.type)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[color:var(--color-ink)] mb-1 leading-snug">
          {notification.message}
        </p>
        <p className="text-xs font-mono tracking-wide text-[color:var(--color-muted-warm)]">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
