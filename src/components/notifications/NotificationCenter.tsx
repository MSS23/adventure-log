'use client'

import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Check,
  Trash2,
  Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
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
  metadata?: Record<string, unknown>
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
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
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)

      log.info('Notifications fetched', {
        component: 'NotificationCenter',
        count: data?.length
      })
    } catch (error) {
      log.error('Failed to fetch notifications', {
        component: 'NotificationCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
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
          setNotifications(prev => [newNotification, ...prev].slice(0, 20))
          setUnreadCount(prev => prev + 1)

          log.info('New notification received', {
            component: 'NotificationCenter',
            type: newNotification.type
          })
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
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      log.error('Failed to mark notification as read', {
        component: 'NotificationCenter'
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
      setUnreadCount(0)
    } catch (error) {
      log.error('Failed to mark all as read', {
        component: 'NotificationCenter'
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

      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      log.error('Failed to delete notification', {
        component: 'NotificationCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'album_invite':
      case 'collaboration':
        return <Users className="h-4 w-4 text-purple-500" />
      case 'photo':
        return <Camera className="h-4 w-4 text-pink-500" />
      case 'location':
        return <MapPin className="h-4 w-4 text-orange-500" />
      case 'achievement':
        return <Award className="h-4 w-4 text-yellow-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.link) {
      setOpen(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Link href="/settings/notifications">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium mb-1">No notifications yet</p>
              <p className="text-sm text-gray-400">
                We&apos;ll notify you when something happens
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id}>
                <div
                  className={cn(
                    "group relative hover:bg-gray-50 transition-colors",
                    !notification.is_read && "bg-blue-50/50"
                  )}
                >
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => handleNotificationClick(notification)}
                      className="block p-4"
                    >
                      <NotificationContent notification={notification} />
                    </Link>
                  ) : (
                    <div className="p-4">
                      <NotificationContent notification={notification} />
                    </div>
                  )}

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full" />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      deleteNotification(notification.id)
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  >
                    <Trash2 className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
                <DropdownMenuSeparator />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Link href="/settings/notifications" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50" size="sm">
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationContent({ notification }: { notification: Notification }) {
  return (
    <div className="flex items-start gap-3 pl-4">
      {/* Sender Avatar */}
      {notification.sender ? (
        <UserAvatarLink user={notification.sender}>
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={notification.sender.avatar_url} />
            <AvatarFallback>
              {notification.sender.display_name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </UserAvatarLink>
      ) : (
        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-0.5">
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'like':
      return <Heart className="h-4 w-4 text-red-500" />
    case 'comment':
      return <MessageCircle className="h-4 w-4 text-blue-500" />
    case 'follow':
      return <UserPlus className="h-4 w-4 text-green-500" />
    case 'album_invite':
    case 'collaboration':
      return <Users className="h-4 w-4 text-purple-500" />
    case 'photo':
      return <Camera className="h-4 w-4 text-pink-500" />
    case 'location':
      return <MapPin className="h-4 w-4 text-orange-500" />
    case 'achievement':
      return <Award className="h-4 w-4 text-yellow-500" />
    default:
      return <Bell className="h-4 w-4 text-gray-500" />
  }
}
