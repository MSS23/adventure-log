'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
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
    if (user) {
      fetchNotifications()
      subscribeToNotifications()
    }
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
        return <Heart className="h-5 w-5 text-red-500" />
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-500" />
      case 'album_invite':
      case 'collaboration':
        return <Users className="h-5 w-5 text-purple-500" />
      case 'photo':
        return <Camera className="h-5 w-5 text-pink-500" />
      case 'location':
        return <MapPin className="h-5 w-5 text-orange-500" />
      case 'achievement':
        return <Award className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => window.history.back()} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-gray-600 text-sm mt-1">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="text-blue-600 hover:text-blue-700 border-blue-200"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Bell className="h-8 w-8 text-gray-400 animate-pulse" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600">
                We&apos;ll notify you when something happens
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'group relative transition-all hover:shadow-md',
                !notification.is_read && 'border-l-4 border-l-blue-600 bg-blue-50/30'
              )}
            >
              <CardContent className="p-4">
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
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-full"
                  title="Delete notification"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </CardContent>
            </Card>
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
    <div className="flex items-start gap-4">
      {/* Sender Avatar or Icon */}
      {notification.sender ? (
        <UserAvatarLink user={notification.sender}>
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={notification.sender.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
              {notification.sender.display_name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </UserAvatarLink>
      ) : (
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
          {getIcon(notification.type)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 mb-1">
          {notification.message}
        </p>
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
