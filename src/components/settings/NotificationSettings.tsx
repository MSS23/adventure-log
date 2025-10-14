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
  Camera,
  Users,
  Award,
  Bell,
  Mail,
  Smartphone
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/toast-provider'
import { log } from '@/lib/utils/logger'

interface NotificationPreferences {
  likes_enabled: boolean
  comments_enabled: boolean
  follows_enabled: boolean
  messages_enabled: boolean
  collaborations_enabled: boolean
  achievements_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
  likes_email: boolean
  comments_email: boolean
  follows_email: boolean
  messages_email: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    likes_enabled: true,
    comments_enabled: true,
    follows_enabled: true,
    messages_enabled: true,
    collaborations_enabled: true,
    achievements_enabled: true,
    email_notifications: true,
    push_notifications: false,
    likes_email: false,
    comments_email: true,
    follows_email: true,
    messages_email: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user])

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
        setPreferences(data)
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

  const notificationTypes = [
    {
      key: 'likes_enabled',
      emailKey: 'likes_email',
      icon: Heart,
      title: 'Likes',
      description: 'When someone likes your album or photo',
      color: 'text-red-500'
    },
    {
      key: 'comments_enabled',
      emailKey: 'comments_email',
      icon: MessageCircle,
      title: 'Comments',
      description: 'When someone comments on your content',
      color: 'text-blue-500'
    },
    {
      key: 'follows_enabled',
      emailKey: 'follows_email',
      icon: UserPlus,
      title: 'New Followers',
      description: 'When someone starts following you',
      color: 'text-green-500'
    },
    {
      key: 'messages_enabled',
      emailKey: 'messages_email',
      icon: MessageCircle,
      title: 'Messages',
      description: 'When you receive a direct message',
      color: 'text-purple-500'
    },
    {
      key: 'collaborations_enabled',
      emailKey: null,
      icon: Users,
      title: 'Collaborations',
      description: 'Album invitations and collaboration updates',
      color: 'text-orange-500'
    },
    {
      key: 'achievements_enabled',
      emailKey: null,
      icon: Award,
      title: 'Achievements',
      description: 'When you unlock a new badge or milestone',
      color: 'text-yellow-500'
    }
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-400 animate-pulse" />
            <p>Loading preferences...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how and when you want to be notified about activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels */}
          <div>
            <h3 className="font-semibold mb-4">Notification Channels</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Label htmlFor="push" className="text-base font-medium">
                      In-App Notifications
                    </Label>
                    <p className="text-sm text-gray-600">
                      Show notifications in the notification center
                    </p>
                  </div>
                </div>
                <Switch
                  id="push"
                  checked={preferences.push_notifications}
                  onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-base font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-gray-600">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
                />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <h3 className="font-semibold mb-4">Notification Types</h3>
            <div className="space-y-3">
              {notificationTypes.map((type) => (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                    <div className="flex-1">
                      <Label htmlFor={type.key} className="font-medium cursor-pointer">
                        {type.title}
                      </Label>
                      <p className="text-sm text-gray-600">
                        {type.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* In-App Toggle */}
                    <div className="flex flex-col items-center gap-1">
                      <Bell className="h-4 w-4 text-gray-400" />
                      <Switch
                        id={type.key}
                        checked={preferences[type.key as keyof NotificationPreferences] as boolean}
                        onCheckedChange={(checked) =>
                          updatePreference(type.key as keyof NotificationPreferences, checked)
                        }
                      />
                    </div>

                    {/* Email Toggle */}
                    {type.emailKey && preferences.email_notifications && (
                      <div className="flex flex-col items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Switch
                          checked={preferences[type.emailKey as keyof NotificationPreferences] as boolean}
                          onCheckedChange={(checked) =>
                            updatePreference(type.emailKey as keyof NotificationPreferences, checked)
                          }
                          disabled={!preferences.email_notifications}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Notification Settings</p>
                <div className="space-y-1 text-blue-800">
                  <p>• <Bell className="h-3 w-3 inline mr-1" />In-app notifications appear in your notification center</p>
                  <p>• <Mail className="h-3 w-3 inline mr-1" />Email notifications are sent to your registered email</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={savePreferences} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            About Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>In-App Notifications:</strong> Appear in the notification bell at the top of the page. They're stored in your account and can be reviewed anytime.
          </p>
          <p>
            <strong>Email Notifications:</strong> Sent to your registered email address. You can control which types of activities trigger emails.
          </p>
          <p className="text-xs text-gray-500 mt-4">
            Note: Critical system notifications and account security alerts will always be sent regardless of these settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
