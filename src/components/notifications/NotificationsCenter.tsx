'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Bell, Heart, MessageCircle, UserPlus, Camera, Trophy, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'

interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'follow' | 'album' | 'achievement'
  title: string
  message: string
  link?: string
  read: boolean
  created_at: string
  actor?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

const NOTIFICATION_ICONS = {
  like: { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50' },
  comment: { icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  follow: { icon: UserPlus, color: 'text-green-500', bgColor: 'bg-green-50' },
  album: { icon: Camera, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  achievement: { icon: Trophy, color: 'text-yellow-500', bgColor: 'bg-yellow-50' }
}

export function NotificationsCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchNotifications()

      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(prev => prev + 1)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchNotifications and supabase are stable references
  }, [user])

  async function fetchNotifications() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.read).length)
    } catch (error) {
      log.error('Error fetching notifications', { component: 'NotificationsCenter', action: 'fetch-notifications' }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      log.error('Error marking notification as read', { component: 'NotificationsCenter', action: 'mark-as-read' }, error as Error)
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      log.error('Error marking all as read', { component: 'NotificationsCenter', action: 'mark-all-read' }, error as Error)
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      log.error('Error deleting notification', { component: 'NotificationsCenter', action: 'delete-notification' }, error as Error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 bg-white border border-stone-200 rounded-lg animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-stone-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-stone-600">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-stone-50 rounded-full inline-flex mb-4">
              <Bell className="h-8 w-8 text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">No notifications yet</p>
            <p className="text-sm text-stone-500 mt-1">
              We&apos;ll notify you when something happens
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const iconConfig = NOTIFICATION_ICONS[notification.type]
            const Icon = iconConfig.icon

            return (
              <div
                key={notification.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200 group hover:shadow-md",
                  notification.read
                    ? "bg-white border-stone-200"
                    : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn("p-2 rounded-full flex-shrink-0", iconConfig.bgColor)}>
                    <Icon className={cn("h-5 w-5", iconConfig.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-sm text-stone-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-stone-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 hover:bg-stone-100 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-stone-600" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <X className="h-4 w-4 text-stone-600 hover:text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Link */}
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="inline-block mt-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
                        onClick={() => markAsRead(notification.id)}
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
