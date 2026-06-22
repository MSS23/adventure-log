'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Heart,
  MessageCircle,
  UserPlus,
  Bell,
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
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      color: 'text-accent'
    },
    {
      key: 'comments_enabled',
      icon: MessageCircle,
      title: 'Comments',
      description: 'When someone comments on your album',
      color: 'text-primary'
    },
    {
      key: 'follows_enabled',
      icon: UserPlus,
      title: 'New followers',
      description: 'When someone starts following you',
      color: 'text-primary'
    }
    // Messages, Collaborations, and Achievements are hidden until features are complete
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
            <p className="text-sm">Loading preferences...</p>
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
          Notification preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Types */}
        <div className="space-y-1">
          {notificationTypes.map((type) => {
            const key = type.key as keyof NotificationPreferences
            const checked = preferences[key]
            return (
              <div
                key={type.key}
                role="switch"
                aria-checked={checked}
                tabIndex={0}
                onClick={() => updatePreference(key, !checked)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    updatePreference(key, !checked)
                  }
                }}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 min-h-[44px] cursor-pointer transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3 flex-1">
                  <type.icon className={`h-5 w-5 ${type.color}`} aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{type.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>

                {/* Visual only — the whole row is the control. */}
                <Switch
                  checked={checked}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none"
                />
              </div>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1 text-foreground">About Notifications</p>
              <p>
                In-app notifications appear in the notification bell at the top of the page.
                They&apos;re stored in your account and can be reviewed anytime.
              </p>
              <p className="text-xs mt-2">
                Note: Critical account security alerts will always be shown regardless of these settings.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={savePreferences} disabled={saving} className="cursor-pointer">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
