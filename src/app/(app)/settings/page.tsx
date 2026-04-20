'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Shield,
  Download,
  Trash2,
  Key,
  Globe,
  Users,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Camera,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react'
import Image from 'next/image'
import { uploadCoverPhoto, deleteCoverPhoto } from '@/lib/utils/storage'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { FollowRequests } from '@/components/social/FollowRequests'
import { FollowLists } from '@/components/social/FollowLists'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [privacyLevel, setPrivacyLevel] = useState(profile?.privacy_level || 'public')
  const [homeLocationData, setHomeLocationData] = useState({ city: profile?.home_city || '', country: profile?.home_country || '' })
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      if (profile.privacy_level) setPrivacyLevel(profile.privacy_level)
      if (profile.home_city || profile.home_country) {
        setHomeLocationData({ city: profile.home_city || '', country: profile.home_country || '' })
      }
    }
  }, [profile])

  const updatePrivacyLevel = async (newLevel: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('users')
        .update({ privacy_level: newLevel, updated_at: new Date().toISOString() })
        .eq('id', user?.id)

      if (error) throw error

      setPrivacyLevel(newLevel as 'public' | 'private' | 'friends')
      await refreshProfile()
      setSuccess('Privacy updated')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error updating privacy', { component: 'Settings' }, err)
      setError(err instanceof Error ? err.message : 'Failed to update privacy')
    } finally {
      setLoading(false)
    }
  }

  const updateHomeLocation = async () => {
    try {
      setLoading(true)
      setError(null)

      let latitude: number | null = null
      let longitude: number | null = null

      if (homeLocationData.city && homeLocationData.country) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(homeLocationData.city)},${encodeURIComponent(homeLocationData.country)}&limit=1`
          )
          const data = await response.json()
          if (data?.[0]) {
            latitude = parseFloat(data[0].lat)
            longitude = parseFloat(data[0].lon)
          }
        } catch { /* geocoding failed, save without coords */ }
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
      setSuccess('Home location saved')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error updating home location', { component: 'Settings' }, err)
      setError(err instanceof Error ? err.message : 'Failed to update home location')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    try {
      setLoading(true)
      setError(null)

      if (passwordData.newPassword !== passwordData.confirmPassword) throw new Error('Passwords do not match')
      if (passwordData.newPassword.length < 8) throw new Error('Password must be at least 8 characters')

      if (passwordData.currentPassword && user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email, password: passwordData.currentPassword
        })
        if (signInError) throw new Error('Current password is incorrect')
      }

      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword })
      if (error) throw error

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Password updated')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error updating password', { component: 'Settings' }, err)
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [albumsResult, photosResult] = await Promise.all([
        supabase.from('albums').select('*').eq('user_id', user?.id).neq('status', 'draft'),
        supabase.from('photos').select('*').eq('user_id', user?.id),
      ])

      const userData = {
        profile: { username: profile?.username, display_name: profile?.display_name, bio: profile?.bio },
        albums: (albumsResult.data || []).map(a => ({
          title: a.title, location: a.location_name, country: a.country_code,
          dates: { start: a.date_start, end: a.date_end }, created: a.created_at,
        })),
        photos: (photosResult.data || []).map(p => ({
          caption: p.caption, album_id: p.album_id, taken_at: p.taken_at, location: p.location_name,
        })),
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `adventure-log-${profile?.username || 'data'}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(`Downloaded ${albumsResult.data?.length || 0} albums, ${photosResult.data?.length || 0} photos`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      log.error('Error exporting data', { component: 'Settings' }, err)
      setError('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    try {
      setLoading(true)
      if (!user?.id) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('soft_delete_user', { user_id_param: user.id })
      if (error) throw error

      await signOut()
    } catch (err) {
      log.error('Error deleting account', { component: 'Settings' }, err)
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setLoading(false)
    }
  }

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use JPEG, PNG, or WebP'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Max 10MB'); return }
    setCoverPhotoFile(file)
    setCoverPhotoPreview(URL.createObjectURL(file))
  }

  const handleCoverPhotoUpload = async () => {
    if (!coverPhotoFile || !user?.id) return
    try {
      setUploadingCover(true)
      setError(null)
      const coverUrl = await uploadCoverPhoto(coverPhotoFile, user.id)
      const { error } = await supabase.from('users').update({ cover_photo_url: coverUrl, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      setCoverPhotoFile(null)
      setCoverPhotoPreview(null)
      setSuccess('Cover photo updated')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error uploading cover photo', { component: 'Settings' }, err)
      setError('Failed to upload cover photo')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleRemoveCoverPhoto = async () => {
    if (!user?.id || !profile?.cover_photo_url) return
    try {
      setUploadingCover(true)
      try { await deleteCoverPhoto(profile.cover_photo_url) } catch { /* ok */ }
      const { error } = await supabase.from('users').update({ cover_photo_url: null, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      setSuccess('Cover photo removed')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      log.error('Error removing cover photo', { component: 'Settings' }, err)
      setError('Failed to remove cover photo')
    } finally {
      setUploadingCover(false)
    }
  }

  const privacyOptions = [
    { value: 'public', label: 'Public', desc: 'Anyone can see your profile', icon: Globe },
    { value: 'friends', label: 'Friends Only', desc: 'Only followers can see your content', icon: Users },
    { value: 'private', label: 'Private', desc: 'Only you can see your content', icon: Lock },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      <div className="mb-6">
        <p className="al-eyebrow mb-1">Preferences</p>
        <h1 className="al-display text-3xl md:text-4xl">Settings</h1>
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 px-4 py-3">
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="space-y-6">

        {/* Cover Photo */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Cover Photo</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="relative w-full h-32 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
              {(coverPhotoPreview || profile?.cover_photo_url) ? (
                <Image
                  src={coverPhotoPreview || getPhotoUrl(profile?.cover_photo_url, 'covers') || ''}
                  alt="Cover photo"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-stone-300 dark:text-stone-600" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {coverPhotoPreview ? (
                <>
                  <Button size="sm" onClick={handleCoverPhotoUpload} disabled={uploadingCover} className="bg-olive-600 hover:bg-olive-700 text-white cursor-pointer active:scale-[0.97] transition-all duration-200">
                    {uploadingCover ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading</> : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setCoverPhotoFile(null); setCoverPhotoPreview(null) }} className="dark:border-stone-700 dark:text-stone-300 cursor-pointer active:scale-[0.97] transition-all duration-200">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Label htmlFor="cover-input" className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer text-xs font-medium text-stone-700 dark:text-stone-300 transition-all duration-200 hover:shadow-sm active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500">
                    <Camera className="h-3.5 w-3.5 mr-1.5" />
                    {profile?.cover_photo_url ? 'Change' : 'Upload'}
                  </Label>
                  <input id="cover-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverPhotoSelect} className="hidden" />
                  {profile?.cover_photo_url && (
                    <Button size="sm" variant="outline" onClick={handleRemoveCoverPhoto} disabled={uploadingCover} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                      Remove
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Home Location */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Home Location</h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 ml-6.5">Used to calculate total distance traveled</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-stone-600 dark:text-stone-400">City</Label>
                <Input value={homeLocationData.city} onChange={(e) => setHomeLocationData(prev => ({ ...prev, city: e.target.value }))} placeholder="London" className="dark:bg-stone-900 dark:border-stone-700 h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-600 dark:text-stone-400">Country</Label>
                <Input value={homeLocationData.country} onChange={(e) => setHomeLocationData(prev => ({ ...prev, country: e.target.value }))} placeholder="United Kingdom" className="dark:bg-stone-900 dark:border-stone-700 h-9 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={updateHomeLocation} disabled={loading || (!homeLocationData.city && !homeLocationData.country)} className="bg-olive-600 hover:bg-olive-700 text-white cursor-pointer active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </section>

        {/* Privacy */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Privacy</h2>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {privacyOptions.map(opt => {
                const Icon = opt.icon
                const active = privacyLevel === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => updatePrivacyLevel(opt.value)}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 active:scale-[0.98]",
                      active
                        ? "border-olive-300 dark:border-olive-700 bg-olive-50 dark:bg-olive-950/30 shadow-sm"
                        : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 hover:shadow-sm"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-olive-600 dark:text-olive-400" : "text-stone-400")} />
                    <div>
                      <p className={cn("text-sm font-medium", active ? "text-olive-800 dark:text-olive-200" : "text-stone-700 dark:text-stone-300")}>{opt.label}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{opt.desc}</p>
                    </div>
                    {active && <div className="ml-auto w-2 h-2 rounded-full bg-olive-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Follow Requests & Lists */}
        <FollowRequests />
        <FollowLists />

        {/* Change Password */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <Key className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Change Password</h2>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-stone-600 dark:text-stone-400">Current Password</Label>
              <div className="relative">
                <Input type={showCurrentPassword ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} className="dark:bg-stone-900 dark:border-stone-700 h-9 text-sm pr-9" />
                <button type="button" className="absolute right-2.5 top-2 cursor-pointer p-1 rounded-md transition-colors duration-200 hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500" onClick={() => setShowCurrentPassword(!showCurrentPassword)} aria-label={showCurrentPassword ? 'Hide password' : 'Show password'} aria-pressed={showCurrentPassword}>
                  {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5 text-stone-400" /> : <Eye className="h-3.5 w-3.5 text-stone-400" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600 dark:text-stone-400">New Password</Label>
              <div className="relative">
                <Input type={showNewPassword ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} className="dark:bg-stone-900 dark:border-stone-700 h-9 text-sm pr-9" />
                <button type="button" className="absolute right-2.5 top-2 cursor-pointer p-1 rounded-md transition-colors duration-200 hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Hide password' : 'Show password'} aria-pressed={showNewPassword}>
                  {showNewPassword ? <EyeOff className="h-3.5 w-3.5 text-stone-400" /> : <Eye className="h-3.5 w-3.5 text-stone-400" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600 dark:text-stone-400">Confirm New Password</Label>
              <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} className="dark:bg-stone-900 dark:border-stone-700 h-9 text-sm" />
            </div>
            <Button size="sm" onClick={updatePassword} disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword} className="bg-olive-600 hover:bg-olive-700 text-white cursor-pointer active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </section>

        {/* Data Export */}
        <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Export Data</h2>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">Download all your albums, photos, and profile data as JSON.</p>
            <Button size="sm" variant="outline" onClick={exportData} disabled={loading} className="dark:border-stone-700 dark:text-stone-300 cursor-pointer active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500 hover:shadow-sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {loading ? 'Preparing...' : 'Download Data'}
            </Button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Delete Account</h2>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-3">Your account will be deactivated with a 30-day recovery period before permanent deletion.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete your account?</DialogTitle>
                  <DialogDescription>
                    Your data will be preserved for 30 days. After that, everything is permanently deleted.
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
        </section>
      </div>
    </div>
  )
}
