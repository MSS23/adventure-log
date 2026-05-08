'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Heart,
  MessageCircle,
  UserPlus,
  Bell,
  Smartphone,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/toast-provider'
import { log } from '@/lib/utils/logger'
import {
  isPushSupported,
  isPushConfigured,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  getPushPermission,
} from '@/lib/services/push-notifications'

interface NotificationPreferences {
  likes_enabled: boolean
  comments_enabled: boolean
  follows_enabled: boolean
  messages_enabled: boolean
  collaborations_enabled: boolean
  achievements_enabled: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    likes_enabled: true,
    comments_enabled: true,
    follows_enabled: true,
    messages_enabled: true,
    collaborations_enabled: true,
    achievements_enabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushAvailable, setPushAvailable] = useState(false)
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchPreferences()
      // Check push notification status
      const checkPush = async () => {
        const supported = isPushSupported() && isPushConfigured()
        setPushAvailable(supported)
        if (supported) {
          const subscribed = await isPushSubscribed()
          setPushEnabled(subscribed)
        }
      }
      checkPush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handlePushToggle = async (enabled: boolean) => {
    if (!user) return
    setPushLoading(true)
    try {
      if (enabled) {
        const subscribed = await subscribeToPush(user.id)
        setPushEnabled(subscribed)
        if (!subscribed) {
          const perm = getPushPermission()
          if (perm === 'denied') {
            showError('Blocked', 'Push notifications are blocked by your browser. Enable them in your browser settings.')
          } else {
            showError('Failed', 'Could not enable push notifications.')
          }
        } else {
          success('Enabled!', 'You will receive push notifications for new activity.')
        }
      } else {
        await unsubscribeFromPush(user.id)
        setPushEnabled(false)
        success('Disabled', 'Push notifications turned off.')
      }
    } catch {
      showError('Error', 'Failed to update push notification settings.')
    } finally {
      setPushLoading(false)
    }
  }

  const fetchPreferences = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setPreferences({
          likes_enabled: data.likes_enabled,
          comments_enabled: data.comments_enabled,
          follows_enabled: data.follows_enabled,
          messages_enabled: data.messages_enabled,
          collaborations_enabled: data.collaborations_enabled,
          achievements_enabled: data.achievements_enabled
        })
      }

      log.info('Notification preferences fetched', {
        component: 'NotificationSettings'
      })
    } catch (error) {
      log.error('Failed to fetch preferences', {
        component: 'NotificationSettings'
      }, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      success('Saved!', 'Your notification preferences have been updated')

      log.info('Notification preferences saved', {
        component: 'NotificationSettings'
      })
    } catch (error) {
      log.error('Failed to save preferences', {
        component: 'NotificationSettings'
      }, error instanceof Error ? error : new Error(String(error)))
      showError('Save failed', 'Could not save your preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  // Only show implemented notification types
  const notificationTypes = [
    {
      key: 'likes_enabled',
      icon: Heart,
      title: 'Likes',
      description: 'When someone likes your album',
      color: 'text-red-500'
    },
    {
      key: 'comments_enabled',
      icon: MessageCircle,
      title: 'Comments',
      description: 'When someone comments on your album',
      color: 'text-olive-500'
    },
    {
      key: 'follows_enabled',
      icon: UserPlus,
      title: 'New Followers',
      description: 'When someone starts following you',
      color: 'text-green-500'
    }
    // Messages, Collaborations, and Achievements are hidden until features are complete
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-stone-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-stone-400 animate-pulse" />
            <p>Loading preferences...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which activities you want to be notified about
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        {pushAvailable && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-olive-50/50 dark:bg-olive-950/20 border-olive-200 dark:border-olive-800">
            <div className="flex items-center gap-3 flex-1">
              <Smartphone className="h-5 w-5 text-olive-600 dark:text-olive-400" />
              <div className="flex-1">
                <Label htmlFor="push-toggle" className="font-medium cursor-pointer">Push Notifications</Label>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Get notified on this device even when the app is closed
                </p>
              </div>
            </div>
            {pushLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-olive-500" />
            ) : (
              <Switch
                id="push-toggle"
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
              />
            )}
          </div>
        )}

        {/* Notification Types */}
        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <div
              key={type.key}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 dark:border-stone-700 transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex items-center gap-3 flex-1">
                <type.icon className={`h-5 w-5 ${type.color}`} />
                <div className="flex-1">
                  <Label htmlFor={type.key} className="font-medium cursor-pointer text-stone-900 dark:text-stone-100">
                    {type.title}
                  </Label>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {type.description}
                  </p>
                </div>
              </div>

              <Switch
                id={type.key}
                checked={preferences[type.key as keyof NotificationPreferences]}
                onCheckedChange={(checked) =>
                  updatePreference(type.key as keyof NotificationPreferences, checked)
                }
                className="cursor-pointer"
              />
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-olive-50 dark:bg-olive-950/30 border border-olive-200 dark:border-olive-800/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-olive-600 dark:text-olive-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-olive-900 dark:text-olive-200">
              <p className="font-medium mb-1">About Notifications</p>
              <p className="text-olive-800 dark:text-olive-300">
                In-app notifications appear in the notification bell at the top of the page.
                They&apos;re stored in your account and can be reviewed anytime.
              </p>
              <p className="text-xs text-olive-700 dark:text-olive-400 mt-2">
                Note: Critical account security alerts will always be shown regardless of these settings.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t dark:border-stone-700">
          <Button onClick={savePreferences} disabled={saving} className="cursor-pointer active:scale-[0.97] transition-all duration-200 bg-olive-600 hover:bg-olive-700 text-white focus-visible:ring-2 focus-visible:ring-olive-500">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
