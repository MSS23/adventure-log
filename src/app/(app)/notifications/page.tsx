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
import { cn } from '@/lib/utils'

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
        return <Heart className="h-5 w-5 text-accent" />
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-primary" />
      case 'follow':
        return <UserPlus className="h-5 w-5 text-primary" />
      case 'album_invite':
      case 'collaboration':
        return <Users className="h-5 w-5 text-primary" />
      case 'photo':
        return <Camera className="h-5 w-5 text-accent" />
      case 'location':
        return <MapPin className="h-5 w-5 text-primary" />
      case 'achievement':
        return <Award className="h-5 w-5 text-[color:var(--color-gold)]" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" onClick={() => window.history.back()} size="sm" className="cursor-pointer rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <header className="min-w-0 space-y-1">
            <p className="al-eyebrow">Inbox</p>
            <h1 className="al-display text-3xl md:text-4xl flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-accent text-accent-foreground text-[11px] font-bold">
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 && (
              <p className="text-xs font-mono tracking-wide text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </header>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="shrink-0 rounded-full text-xs font-semibold cursor-pointer"
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
            className="h-8 w-8 rounded-full border-[3px] border-muted border-t-primary animate-spin"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            No notifications yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            We&apos;ll let you know when something happens.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'group relative transition-colors duration-200 hover:bg-muted/60 cursor-pointer',
                !notification.is_read && 'bg-accent/5'
              )}
            >
              {/* Unread accent rail */}
              {!notification.is_read && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
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
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 hover:bg-destructive/10 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:opacity-100 active:scale-[0.9]"
                  title="Delete notification"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
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
            <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
              {notification.sender.display_name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </UserAvatarLink>
      ) : (
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {getIcon(notification.type)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground mb-1 leading-snug">
          {notification.message}
        </p>
        <p className="text-xs font-mono tracking-wide text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
