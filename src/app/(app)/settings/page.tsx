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
  Bell,
  UserCog,
  ChevronRight,
  MessageSquarePlus,
  MessageCircle,
  Palette,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { uploadCoverPhoto, deleteCoverPhoto } from '@/lib/utils/storage'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { FollowRequests } from '@/components/social/FollowRequests'
import { FollowLists } from '@/components/social/FollowLists'
import { FeedbackLauncher } from '@/components/feedback/FeedbackLauncher'
import { ThemeToggleWithLabel } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL

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
    const ALLOWED_PRIVACY_LEVELS = ['public', 'private', 'friends'] as const
    if (!(ALLOWED_PRIVACY_LEVELS as readonly string[]).includes(newLevel)) {
      log.error('Invalid privacy level', { component: 'Settings' }, new Error(`Unexpected privacy level: ${newLevel}`))
      setError('Invalid privacy setting')
      return
    }
    const validatedLevel = newLevel as (typeof ALLOWED_PRIVACY_LEVELS)[number]
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('users')
        .update({ privacy_level: validatedLevel, updated_at: new Date().toISOString() })
        .eq('id', user?.id)

      if (error) throw error

      // Going public auto-accepts everyone who had a pending request — a public
      // account approves all followers automatically (Instagram behaviour).
      if (validatedLevel === 'public' && user?.id) {
        const { error: acceptError } = await supabase
          .from('follows')
          .update({ status: 'accepted' })
          .eq('following_id', user.id)
          .eq('status', 'pending')
        if (acceptError) {
          log.error('Failed to auto-accept pending follows on going public', { component: 'Settings' }, acceptError)
        }
      }

      setPrivacyLevel(validatedLevel)
      await refreshProfile()
      setSuccess(validatedLevel === 'public' ? 'Privacy updated — pending requests accepted' : 'Privacy updated')
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

      if (!user) throw new Error('Account is still loading. Try again in a moment.')

      // Re-authenticate with the current password so the field actually
      // verifies identity rather than being collected and ignored.
      if (!passwordData.currentPassword) throw new Error('Enter your current password')
      if (!user.email) throw new Error('Account email unavailable. Please sign in again.')
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      })
      if (reauthError) throw new Error('Current password is incorrect')

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })
      if (updateError) throw new Error(updateError.message)

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

      const uid = user?.id
      if (!uid) throw new Error('Not authenticated')

      // GDPR Article 20 (portability): export ALL of the user's personal data
      // in a machine-readable form, including direct download URLs for photos.
      // Each query is independent (allSettled) so a table that doesn't exist in
      // a given deployment never breaks the whole export.
      const rows = async (
        table: string,
        column: string,
        select = '*',
      ): Promise<Record<string, unknown>[]> => {
        const { data, error } = await supabase.from(table).select(select).eq(column, uid)
        if (error) throw error
        return (data as unknown as Record<string, unknown>[]) || []
      }

      const [
        profileRow,
        albums,
        photos,
        comments,
        likes,
        stories,
        following,
        followers,
        savedPlaces,
        trips,
      ] = await Promise.allSettled([
        supabase.from('users').select('*').eq('id', uid).maybeSingle().then(r => r.data),
        rows('albums', 'user_id'),
        rows('photos', 'user_id'),
        rows('comments', 'user_id'),
        rows('likes', 'user_id'),
        rows('stories', 'user_id'),
        rows('follows', 'follower_id'),
        rows('follows', 'following_id'),
        rows('saved_places', 'user_id'),
        rows('trips', 'user_id'),
      ])

      const settled = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === 'fulfilled' ? r.value : fallback

      const photoRows = settled(photos, [] as Record<string, unknown>[])

      const userData = {
        export_format: 'adventure-log-gdpr-export-v2',
        exported_at: new Date().toISOString(),
        account: { id: uid, email: user?.email ?? null },
        profile: settled(profileRow, null),
        albums: settled(albums, []),
        // Include the direct download URL so the export actually lets the user
        // recover their photo files, not just metadata.
        photos: photoRows.map(p => ({
          ...p,
          download_url: getPhotoUrl(p.file_path as string) || null,
        })),
        comments: settled(comments, []),
        likes: settled(likes, []),
        stories: settled(stories, []),
        following: settled(following, []),
        followers: settled(followers, []),
        saved_places: settled(savedPlaces, []),
        trips: settled(trips, []),
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

      setSuccess(`Exported ${userData.albums.length} albums, ${userData.photos.length} photos, and your full account data`)
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

      // m35: soft_delete_user signature is (p_user_id TEXT) — Clerk subject
      const { error } = await supabase.rpc('soft_delete_user', { p_user_id: user.id })
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
    { value: 'friends', label: 'Followers only', desc: 'Only people who follow you can see your content', icon: Users },
    { value: 'private', label: 'Private', desc: 'Only you can see your content', icon: Lock },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      {/* Page header */}
      <div className="mb-8">
        <p className="al-eyebrow mb-1">Preferences</p>
        <h1 className="al-display text-3xl md:text-4xl">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Manage your account, privacy, and data — all in one place.
        </p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3" role="alert">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3" role="status">
          <p className="text-sm text-primary font-medium">{success}</p>
        </div>
      )}

      <div className="space-y-5">

        {/* ── APPEARANCE ──────────────────────────────────────── */}
        <SectionHeader title="Appearance" />

        {/* Theme */}
        <Card>
          <CardHead icon={Palette} title="Theme" subtitle="Choose how Adventure Log looks for you" />
          <div className="p-5 flex flex-wrap items-center gap-3">
            <ThemeToggleWithLabel />
            <p className="text-xs text-muted-foreground">Your choice is saved across devices.</p>
          </div>
        </Card>

        {/* ── ACCOUNT ─────────────────────────────────────────── */}
        <SectionHeader title="Account" className="pt-3" />

        {/* Edit profile — identity fields live on the dedicated page */}
        <Link
          href="/profile/edit"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary shrink-0">
            <UserCog className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Edit profile</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Name, username, bio, avatar, links</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>

        {/* Cover photo */}
        <Card>
          <CardHead icon={ImageIcon} title="Cover photo" subtitle="Shown across the top of your profile" />
          <div className="p-5 space-y-4">
            <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted">
              {(coverPhotoPreview || profile?.cover_photo_url) ? (
                <Image
                  src={coverPhotoPreview || getPhotoUrl(profile?.cover_photo_url, 'covers') || ''}
                  alt="Cover photo"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {coverPhotoPreview ? (
                <>
                  <Button size="sm" onClick={handleCoverPhotoUpload} disabled={uploadingCover} className="min-h-[44px] px-5 cursor-pointer">
                    {uploadingCover ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Uploading</> : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setCoverPhotoFile(null); setCoverPhotoPreview(null) }} className="min-h-[44px] cursor-pointer">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Label htmlFor="cover-input" className="inline-flex items-center min-h-[44px] px-4 rounded-xl border border-border bg-card hover:bg-muted cursor-pointer text-sm font-medium text-foreground transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Camera className="h-4 w-4 mr-1.5" />
                    {profile?.cover_photo_url ? 'Change photo' : 'Upload photo'}
                  </Label>
                  <input id="cover-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverPhotoSelect} className="hidden" />
                  {profile?.cover_photo_url && (
                    <Button size="sm" variant="outline" onClick={handleRemoveCoverPhoto} disabled={uploadingCover} className="min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer">
                      Remove
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Home location */}
        <Card>
          <CardHead icon={MapPin} title="Home location" subtitle="Used to calculate total distance traveled" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="home-city" className="text-xs font-medium text-foreground">City</Label>
                <Input id="home-city" value={homeLocationData.city} onChange={(e) => setHomeLocationData(prev => ({ ...prev, city: e.target.value }))} placeholder="London" className="min-h-[44px] text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="home-country" className="text-xs font-medium text-foreground">Country</Label>
                <Input id="home-country" value={homeLocationData.country} onChange={(e) => setHomeLocationData(prev => ({ ...prev, country: e.target.value }))} placeholder="United Kingdom" className="min-h-[44px] text-sm" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Different from the location shown on your profile — only used to measure distance traveled.
            </p>
            <Button size="sm" onClick={updateHomeLocation} disabled={loading || (!homeLocationData.city && !homeLocationData.country)} className="min-h-[44px] px-5 cursor-pointer">
              {loading ? 'Saving…' : 'Save location'}
            </Button>
          </div>
        </Card>

        {/* ── PRIVACY & PEOPLE ────────────────────────────────── */}
        <SectionHeader title="Privacy & people" className="pt-3" />

        {/* Privacy */}
        <Card>
          <CardHead icon={Shield} title="Who can see your content" subtitle="Applies to your profile, albums, and globe" />
          <div className="p-5">
            <div className="space-y-2" role="radiogroup" aria-label="Privacy level">
              {privacyOptions.map(opt => {
                const Icon = opt.icon
                const active = privacyLevel === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => updatePrivacyLevel(opt.value)}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/60"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {active && <div className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Follow requests & lists (external components, kept as-is) */}
        <FollowRequests />
        <FollowLists />

        {/* Notifications — managed on a dedicated page */}
        <Link
          href="/settings/notifications"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary shrink-0">
            <Bell className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Notifications</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Choose what activity you get notified about</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>

        {/* ── SECURITY & DATA ─────────────────────────────────── */}
        <SectionHeader title="Security & data" className="pt-3" />

        {/* Change password */}
        <Card>
          <CardHead icon={Key} title="Change password" subtitle="Use at least 8 characters" />
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-medium text-foreground">Current password</Label>
              <div className="relative">
                <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} className="min-h-[44px] text-sm pr-11" />
                <button type="button" className="absolute right-2.5 inset-y-0 my-auto h-10 w-10 grid place-items-center cursor-pointer rounded-xl transition-colors duration-200 hover:bg-muted outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]" onClick={() => setShowCurrentPassword(!showCurrentPassword)} aria-label={showCurrentPassword ? 'Hide password' : 'Show password'} aria-pressed={showCurrentPassword} aria-controls="current-password">
                  {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-medium text-foreground">New password</Label>
              <div className="relative">
                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} className="min-h-[44px] text-sm pr-11" />
                <button type="button" className="absolute right-2.5 inset-y-0 my-auto h-10 w-10 grid place-items-center cursor-pointer rounded-xl transition-colors duration-200 hover:bg-muted outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Hide password' : 'Show password'} aria-pressed={showNewPassword} aria-controls="new-password">
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">Confirm new password</Label>
              <Input id="confirm-password" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} className="min-h-[44px] text-sm" />
            </div>
            <Button size="sm" onClick={updatePassword} disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword} className="min-h-[44px] px-5 cursor-pointer">
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </Card>

        {/* Export data */}
        <Card>
          <CardHead icon={Download} title="Export your data" subtitle="Download albums, photos, and profile as JSON" />
          <div className="p-5">
            <Button size="sm" variant="outline" onClick={exportData} disabled={loading} className="min-h-[44px] px-5 cursor-pointer">
              <Download className="h-4 w-4 mr-1.5" />
              {loading ? 'Preparing…' : 'Download data'}
            </Button>
          </div>
        </Card>

        {/* ── HELP & FEEDBACK ─────────────────────────────────── */}
        <SectionHeader title="Help & feedback" className="pt-3" />

        <Card>
          <CardHead icon={MessageSquarePlus} title="Send feedback" subtitle="Report a bug or suggest an idea — it reaches the team directly" />
          <div className="p-5 flex flex-wrap gap-2">
            <FeedbackLauncher label="Share feedback" />
            {DISCORD_INVITE_URL && (
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 min-h-[44px] text-sm font-medium text-foreground transition-all duration-200 cursor-pointer hover:border-primary/30 hover:bg-muted/60 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="h-4 w-4 text-primary" />
                Join our Discord
              </a>
            )}
          </div>
        </Card>

        {/* ── DANGER ZONE ─────────────────────────────────────── */}
        <SectionHeader title="Danger zone" className="pt-3" tone="danger" />

        <section className="rounded-2xl border border-destructive/25 bg-destructive/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-destructive/15">
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h2 className="font-heading text-sm font-semibold text-destructive">Delete account</h2>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Your account is deactivated immediately. You have a 30-day recovery window before everything is permanently deleted.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="min-h-[44px] px-5 cursor-pointer">Delete account</Button>
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
                    {loading ? 'Deleting…' : 'Delete my account'}
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

/* ── Local presentational helpers — keep card markup consistent & low-noise ── */

function SectionHeader({ title, className, tone = 'default' }: { title: string; className?: string; tone?: 'default' | 'danger' }) {
  return (
    <p className={cn('al-eyebrow', tone === 'danger' && 'text-destructive', className)}>
      {title}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card overflow-hidden">{children}</section>
}

function CardHead({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4 border-b border-border">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 ml-[26px]">{subtitle}</p>}
    </div>
  )
}
