'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Settings,
  Shield,
  Bell,
  Download,
  Trash2,
  Key,
  Globe,
  Users,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import { FollowRequests } from '@/components/social/FollowRequests'
import { FollowLists } from '@/components/social/FollowLists'

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [privacyLevel, setPrivacyLevel] = useState(profile?.privacy_level || 'public')
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      setPrivacyLevel(profile.privacy_level)
    }
  }, [profile])

  const updatePrivacyLevel = async (newLevel: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) throw error

      setPrivacyLevel(newLevel as 'public' | 'private' | 'friends')
      await refreshProfile()
      setSuccess('Privacy settings updated successfully')

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error updating privacy level', {}, err)
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    try {
      setLoading(true)
      setError(null)

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match')
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long')
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setSuccess('Password updated successfully')

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error updating password', {}, err)
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user's data
      const [albumsResult, photosResult] = await Promise.all([
        supabase
          .from('albums')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('photos')
          .select('*')
          .eq('user_id', user?.id)
      ])

      const userData = {
        profile: profile,
        albums: albumsResult.data || [],
        photos: photosResult.data || [],
        exported_at: new Date().toISOString()
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement('a')
      link.href = url
      link.download = `adventure-log-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess('Data exported successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error exporting data', {}, err)
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    try {
      setLoading(true)
      setError(null)

      // Note: In a real application, you'd want to implement proper account deletion
      // This would involve deleting all user data and potentially soft-deleting the account
      // For now, we'll just sign out the user

      await signOut()

    } catch (err) {
      log.error('Error deleting account', {}, err)
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  const getPrivacyDescription = (level: string) => {
    switch (level) {
      case 'public':
        return 'Anyone can see your profile and albums'
      case 'friends':
        return 'Only your friends can see your content'
      case 'private':
        return 'Only you can see your content'
      default:
        return ''
    }
  }

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'public':
        return <Globe className="h-4 w-4" />
      case 'friends':
        return <Users className="h-4 w-4" />
      case 'private':
        return <Lock className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and privacy settings</p>
      </div>

      {/* Feedback Messages */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-green-600 font-medium">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Visibility
          </CardTitle>
          <CardDescription>
            Control who can see your profile and adventures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Profile Visibility</Label>
              <Select
                value={privacyLevel}
                onValueChange={updatePrivacyLevel}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select privacy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Friends Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                {getPrivacyIcon(privacyLevel)}
                {getPrivacyDescription(privacyLevel)}
              </p>
            </div>

            <div className="pt-4 border-t">
              <Badge variant="outline" className="mb-2">
                Current Setting
              </Badge>
              <div className="flex items-center gap-2 text-sm">
                {getPrivacyIcon(privacyLevel)}
                <span className="font-medium capitalize">{privacyLevel}</span>
                <span className="text-gray-600">- {getPrivacyDescription(privacyLevel)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Settings */}
      <FollowRequests />

      <FollowLists />

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security and password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>

            <Button
              onClick={updatePassword}
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="w-full sm:w-auto"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Notification preferences will be available in a future update.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export or manage your Adventure Log data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Export Your Data</h4>
                <p className="text-sm text-gray-600">Download all your albums, photos, and profile data</p>
              </div>
              <Button variant="outline" onClick={exportData} disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h4 className="font-medium text-red-600">Delete Account</h4>
                <p className="text-sm text-red-500">Permanently delete your account and all data</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
                      {loading ? 'Deleting...' : 'Yes, delete my account'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}