'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
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
  EyeOff,
  MapPin
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
  const [homeLocationData, setHomeLocationData] = useState({
    city: profile?.home_city || '',
    country: profile?.home_country || ''
  })
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      if (profile.privacy_level) {
        setPrivacyLevel(profile.privacy_level)
      }
      if (profile.home_city || profile.home_country) {
        setHomeLocationData({
          city: profile.home_city || '',
          country: profile.home_country || ''
        })
      }
    }
  }, [profile])

  const updatePrivacyLevel = async (newLevel: string) => {
    try {
      setLoading(true)
      setError(null)

      // Check if switching from private/friends to public
      const isGoingPublic = privacyLevel !== 'public' && newLevel === 'public'
      let pendingCount = 0

      // If going public, check for pending follow requests first
      if (isGoingPublic && user?.id) {
        const { data: pendingFollows, error: countError } = await supabase
          .from('follows')
          .select('id')
          .eq('following_id', user.id)
          .eq('status', 'pending')

        if (!countError && pendingFollows) {
          pendingCount = pendingFollows.length
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          privacy_level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) throw error

      setPrivacyLevel(newLevel as 'public' | 'private' | 'friends')
      await refreshProfile()

      // Show appropriate success message
      if (isGoingPublic && pendingCount > 0) {
        setSuccess(`Privacy settings updated! ${pendingCount} pending follow request${pendingCount > 1 ? 's' : ''} automatically accepted.`)

        // Log the auto-accept event
        log.info('Auto-accepted follow requests on privacy change to public', {
          component: 'SettingsPage',
          action: 'updatePrivacyLevel',
          userId: user?.id,
          pendingCount
        })
      } else {
        setSuccess('Privacy settings updated successfully')
      }

      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      log.error('Error updating privacy level', { component: 'SettingsPage', action: 'updatePrivacyLevel' }, err)
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings')
    } finally {
      setLoading(false)
    }
  }

  const updateHomeLocation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Basic geocoding using Nominatim (free, no API key required)
      let latitude: number | null = null
      let longitude: number | null = null

      if (homeLocationData.city && homeLocationData.country) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(homeLocationData.city)},${encodeURIComponent(homeLocationData.country)}&limit=1`
          )
          const data = await response.json()
          if (data && data.length > 0) {
            latitude = parseFloat(data[0].lat)
            longitude = parseFloat(data[0].lon)
          }
        } catch (geocodeError) {
          log.error('Geocoding failed, saving without coordinates', { component: 'SettingsPage', action: 'updateHomeLocation' }, geocodeError)
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          home_city: homeLocationData.city || null,
          home_country: homeLocationData.country || null,
          home_latitude: latitude,
          home_longitude: longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) throw error

      await refreshProfile()

      setSuccess('Home location updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error updating home location', { component: 'SettingsPage', action: 'updateHomeLocation' }, err)
      setError(err instanceof Error ? err.message : 'Failed to update home location')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate new password matches confirmation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match')
      }

      // Stronger password validation (8 chars minimum, complexity requirements)
      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // Check for password complexity
      const hasUpperCase = /[A-Z]/.test(passwordData.newPassword)
      const hasLowerCase = /[a-z]/.test(passwordData.newPassword)
      const hasNumbers = /\d/.test(passwordData.newPassword)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new Error('Password must contain uppercase, lowercase, number, and special character')
      }

      // Verify current password by re-authenticating
      if (passwordData.currentPassword && user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordData.currentPassword
        })

        if (signInError) {
          throw new Error('Current password is incorrect')
        }
      }

      // Update the password
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
      log.error('Error updating password', { component: 'SettingsPage', action: 'updatePassword' }, err)
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user's data with progress indication
      log.info('Starting data export', { userId: user?.id })

      const [albumsResult, photosResult, storiesResult, likesResult, commentsResult] = await Promise.all([
        supabase
          .from('albums')
          .select('*')
          .eq('user_id', user?.id)
          .neq('status', 'draft'),
        supabase
          .from('photos')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('stories')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('likes')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('comments')
          .select('*')
          .eq('user_id', user?.id)
      ])

      // Format export date in a user-friendly way
      const exportDate = new Date()
      const formattedDate = exportDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Create user-friendly export structure
      const userData = {
        README: {
          title: 'Your Adventure Log Data Export',
          exported_on: formattedDate,
          description: 'This file contains all your travel memories, albums, and photos from Adventure Log.',
          what_is_included: [
            'Your profile information (username, display name, bio)',
            'All published albums with titles, descriptions, and locations',
            'Photo records with captions, locations, and timestamps',
            'Your stories (24-hour posts)',
            'Your likes and comments',
            'Travel statistics and activity data'
          ],
          note_about_photos: 'This export contains metadata about your photos (captions, locations, dates) but not the actual image files. To download your photo files, use the "Download All" option on each album page.',
          how_to_use: 'This is a JSON file that can be opened with any text editor or imported into other applications. You can also keep it as a backup of your Adventure Log data.',
          privacy_reminder: 'This file contains your personal data. Keep it secure and don\'t share it with untrusted parties.'
        },
        profile: {
          username: profile?.username,
          display_name: profile?.display_name,
          bio: profile?.bio,
          account_created: profile?.created_at,
          privacy_level: profile?.privacy_level
        },
        summary: {
          total_albums: albumsResult.data?.length || 0,
          total_photos: photosResult.data?.length || 0,
          total_stories: storiesResult.data?.length || 0,
          total_likes_given: likesResult.data?.length || 0,
          total_comments_made: commentsResult.data?.length || 0
        },
        albums: (albumsResult.data || []).map(album => ({
          title: album.title,
          description: album.description,
          location: album.location_name,
          country: album.country_code,
          coordinates: album.latitude && album.longitude ? {
            latitude: album.latitude,
            longitude: album.longitude
          } : null,
          travel_dates: {
            start: album.date_start,
            end: album.date_end
          },
          tags: album.tags,
          created_on: album.created_at,
          visibility: album.visibility,
          photo_count: photosResult.data?.filter(p => p.album_id === album.id).length || 0
        })),
        photos: (photosResult.data || []).map(photo => ({
          caption: photo.caption,
          album_id: photo.album_id,
          taken_at: photo.taken_at,
          location: photo.location_name,
          coordinates: photo.latitude && photo.longitude ? {
            latitude: photo.latitude,
            longitude: photo.longitude
          } : null,
          camera_info: photo.exif_data ? {
            make: photo.exif_data.Make,
            model: photo.exif_data.Model
          } : null,
          uploaded_on: photo.created_at
        })),
        stories: (storiesResult.data || []).map(story => ({
          caption: story.caption,
          location: story.location_name,
          created_on: story.created_at,
          expires_at: story.expires_at
        })),
        export_metadata: {
          export_version: '2.0',
          exported_at: exportDate.toISOString(),
          user_id: user?.id,
          export_format: 'json'
        }
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const fileSizeKB = (dataBlob.size / 1024).toFixed(2)
      const fileSizeMB = (dataBlob.size / (1024 * 1024)).toFixed(2)
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement('a')
      link.href = url
      const filename = `my-adventure-log-${profile?.username || 'data'}-${new Date().toISOString().split('T')[0]}.json`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      log.info('Data export completed', {
        userId: user?.id,
        albumsCount: albumsResult.data?.length || 0,
        photosCount: photosResult.data?.length || 0,
        fileSizeKB
      })

      const sizeDisplay = parseFloat(fileSizeMB) >= 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`
      setSuccess(`Your data has been downloaded! ${albumsResult.data?.length || 0} albums, ${photosResult.data?.length || 0} photos (${sizeDisplay})`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      log.error('Error exporting data', {}, err)
      setError(err instanceof Error ? err.message : 'Failed to export data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Call the soft delete function
      const { error: deleteError } = await supabase
        .rpc('soft_delete_user', { user_id_param: user.id })

      if (deleteError) {
        log.error('Error soft deleting user', { userId: user.id }, deleteError)
        throw deleteError
      }

      log.info('User account soft deleted successfully', { userId: user.id })

      // Sign out the user after deletion
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
        <p className="text-gray-800 mt-2">Manage your account preferences and privacy settings</p>
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

      {/* Home Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Home Location
          </CardTitle>
          <CardDescription>
            Set your home location to track total distance traveled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="home-city">Home City</Label>
              <Input
                id="home-city"
                type="text"
                value={homeLocationData.city}
                onChange={(e) => setHomeLocationData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., New York, London, Tokyo"
              />
              <p className="text-xs text-gray-500">
                Enter your primary city or hometown
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home-country">Home Country</Label>
              <Input
                id="home-country"
                type="text"
                value={homeLocationData.country}
                onChange={(e) => setHomeLocationData(prev => ({ ...prev, country: e.target.value }))}
                placeholder="e.g., United States, United Kingdom, Japan"
              />
              <p className="text-xs text-gray-500">
                Enter your home country
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>How this works:</strong> Your home location will be used to calculate the total distance you&apos;ve traveled from home in your Travel Insights.
                </p>
              </div>
            </div>

            <Button
              onClick={updateHomeLocation}
              disabled={loading || (!homeLocationData.city && !homeLocationData.country)}
              className="w-full sm:w-auto"
            >
              {loading ? 'Saving...' : 'Save Home Location'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm text-gray-800 mt-1 flex items-center gap-2">
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
                <span className="text-gray-800">- {getPrivacyDescription(privacyLevel)}</span>
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
                    <EyeOff className="h-4 w-4 text-gray-700" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-700" />
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
                    <EyeOff className="h-4 w-4 text-gray-700" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-700" />
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
            <div className="text-sm text-gray-800">
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
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-blue-50">
              <div>
                <h4 className="font-medium text-blue-900">Download Your Travel Memories</h4>
                <p className="text-sm text-blue-700 mt-1">Get a copy of all your adventures, albums, and memories</p>
              </div>

              <div className="text-sm text-blue-800 space-y-2">
                <p className="font-medium">What you&apos;ll get:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your profile and account details</li>
                  <li>All your albums with titles, descriptions, and locations</li>
                  <li>Photo information (captions, dates, locations, camera details)</li>
                  <li>Your stories, likes, and comments</li>
                  <li>Travel statistics and activity summary</li>
                </ul>
                <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> This downloads information about your photos (captions, locations, dates), not the actual photo files themselves. The file will be easy to read and can be opened with any text editor or spreadsheet program.
                  </p>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto bg-white" disabled={loading}>
                    <Download className="h-4 w-4 mr-2" />
                    Download My Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Download Your Adventure Log Data</DialogTitle>
                    <DialogDescription className="space-y-3 pt-2">
                      <p className="text-base text-gray-900">Ready to download your travel memories?</p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="font-medium text-green-900 text-sm mb-2">Your download will include:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                          <li>Profile and account information</li>
                          <li>All albums and their details</li>
                          <li>Photo metadata (captions, locations, dates)</li>
                          <li>Stories, likes, and comments</li>
                          <li>A summary of your travel statistics</li>
                        </ul>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-900">
                          <strong>Good to know:</strong> The file is organized in an easy-to-read format with a README section at the top explaining everything. It includes information <em>about</em> your photos, but not the photo files themselves.
                        </p>
                      </div>
                      <p className="text-sm text-gray-800">
                        The file will be downloaded to your device with a name like: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">my-adventure-log-yourname-2025-01-12.json</code>
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button onClick={exportData} disabled={loading}>
                      {loading ? (
                        <>
                          <Download className="h-4 w-4 mr-2 animate-pulse" />
                          Preparing Download...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download Now
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                <p className="text-sm text-red-500">Delete your account with 30-day recovery period</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete your account?</DialogTitle>
                    <DialogDescription className="space-y-2">
                      <p>Your account and all your data will be scheduled for deletion.</p>
                      <p className="font-medium text-orange-600">
                        ✓ You have 30 days to recover your account
                      </p>
                      <p className="text-sm">
                        During this period, your data is preserved and you can restore your account
                        by contacting support or logging back in. After 30 days, all data will be
                        permanently deleted.
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive" onClick={deleteAccount} disabled={loading}>
                      {loading ? 'Deleting...' : 'Delete my account'}
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