'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { MeshGradient } from '@/components/ui/animated-gradient'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/glass-card'
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
  MapPin,
  Camera,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Image from 'next/image'
import { uploadCoverPhoto, deleteCoverPhoto } from '@/lib/utils/storage'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { FollowRequests } from '@/components/social/FollowRequests'
import { FollowLists } from '@/components/social/FollowLists'
import { cn } from '@/lib/utils'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
} as const

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const prefersReducedMotion = useReducedMotion()
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
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
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

      const isGoingPublic = privacyLevel !== 'public' && newLevel === 'public'
      let pendingCount = 0

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

      if (isGoingPublic && pendingCount > 0) {
        setSuccess(`Privacy settings updated! ${pendingCount} pending follow request${pendingCount > 1 ? 's' : ''} automatically accepted.`)
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

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match')
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      const hasUpperCase = /[A-Z]/.test(passwordData.newPassword)
      const hasLowerCase = /[a-z]/.test(passwordData.newPassword)
      const hasNumbers = /\d/.test(passwordData.newPassword)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new Error('Password must contain uppercase, lowercase, number, and special character')
      }

      if (passwordData.currentPassword && user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordData.currentPassword
        })

        if (signInError) {
          throw new Error('Current password is incorrect')
        }
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

      const exportDate = new Date()
      const formattedDate = exportDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

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
          note_about_photos: 'This export contains metadata about your photos (captions, locations, dates) but not the actual image files.',
          privacy_reminder: 'This file contains your personal data. Keep it secure.'
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
          coordinates: album.latitude && album.longitude ? { latitude: album.latitude, longitude: album.longitude } : null,
          travel_dates: { start: album.date_start, end: album.date_end },
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
          coordinates: photo.latitude && photo.longitude ? { latitude: photo.latitude, longitude: photo.longitude } : null,
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

      const { error: deleteError } = await supabase
        .rpc('soft_delete_user', { user_id_param: user.id })

      if (deleteError) {
        log.error('Error soft deleting user', { userId: user.id }, deleteError)
        throw deleteError
      }

      log.info('User account soft deleted successfully', { userId: user.id })
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
      case 'public': return 'Anyone can see your profile and albums'
      case 'friends': return 'Only your friends can see your content'
      case 'private': return 'Only you can see your content'
      default: return ''
    }
  }

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'public': return <Globe className="h-4 w-4" />
      case 'friends': return <Users className="h-4 w-4" />
      case 'private': return <Lock className="h-4 w-4" />
      default: return <Globe className="h-4 w-4" />
    }
  }

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please select a JPEG, PNG, or WebP image')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Cover photo must be less than 10MB')
        return
      }
      setCoverPhotoFile(file)
      setCoverPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleCoverPhotoUpload = async () => {
    if (!coverPhotoFile || !user?.id) return

    try {
      setUploadingCover(true)
      setError(null)

      const coverUrl = await uploadCoverPhoto(coverPhotoFile, user.id)

      const { error: updateError } = await supabase
        .from('users')
        .update({
          cover_photo_url: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()

      setCoverPhotoFile(null)
      setCoverPhotoPreview(null)

      setSuccess('Cover photo updated successfully')
      setTimeout(() => setSuccess(null), 3000)

      log.info('Cover photo uploaded', {
        component: 'SettingsPage',
        action: 'uploadCoverPhoto',
        userId: user.id
      })
    } catch (err) {
      log.error('Error uploading cover photo', { component: 'SettingsPage', action: 'uploadCoverPhoto' }, err)
      setError(err instanceof Error ? err.message : 'Failed to upload cover photo')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleRemoveCoverPhoto = async () => {
    if (!user?.id || !profile?.cover_photo_url) return

    try {
      setUploadingCover(true)
      setError(null)

      try {
        await deleteCoverPhoto(profile.cover_photo_url)
      } catch {
        log.warn('Could not delete cover photo from storage', { component: 'SettingsPage' })
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          cover_photo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()

      setSuccess('Cover photo removed')
      setTimeout(() => setSuccess(null), 3000)

      log.info('Cover photo removed', {
        component: 'SettingsPage',
        action: 'removeCoverPhoto',
        userId: user.id
      })
    } catch (err) {
      log.error('Error removing cover photo', { component: 'SettingsPage', action: 'removeCoverPhoto' }, err)
      setError(err instanceof Error ? err.message : 'Failed to remove cover photo')
    } finally {
      setUploadingCover(false)
    }
  }

  const cancelCoverPhotoPreview = () => {
    setCoverPhotoFile(null)
    if (coverPhotoPreview) {
      URL.revokeObjectURL(coverPhotoPreview)
      setCoverPhotoPreview(null)
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Modern gradient background */}
      <MeshGradient variant="subtle" className="fixed inset-0" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Animated Header */}
        <motion.div
          className="mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center shadow-lg"
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Settings className="h-7 w-7 text-teal-600" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account preferences and privacy</p>
            </div>
          </div>
        </motion.div>

        {/* Feedback Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard variant="solid" padding="md" className="border-red-200 bg-red-50/80">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard variant="solid" padding="md" className="border-green-200 bg-green-50/80">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Settings Sections */}
        <motion.div
          className="space-y-6"
          variants={prefersReducedMotion ? {} : containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Cover Photo Settings */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="featured" hover="lift" glow="teal">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <GlassCardTitle>Cover Photo</GlassCardTitle>
                    <GlassCardDescription>Add a banner image to your profile</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600">
                  {(coverPhotoPreview || profile?.cover_photo_url) && (
                    <Image
                      src={coverPhotoPreview || getPhotoUrl(profile?.cover_photo_url, 'covers') || ''}
                      alt="Cover photo preview"
                      fill
                      className="object-cover"
                    />
                  )}
                  {!coverPhotoPreview && !profile?.cover_photo_url && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white/80">
                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No cover photo set</p>
                      </div>
                    </div>
                  )}
                  {coverPhotoPreview && (
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                      Preview
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {coverPhotoPreview ? (
                    <>
                      <Button onClick={handleCoverPhotoUpload} disabled={uploadingCover} className="bg-teal-500 hover:bg-teal-600">
                        {uploadingCover ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Camera className="h-4 w-4 mr-2" />Save Cover Photo</>}
                      </Button>
                      <Button variant="outline" onClick={cancelCoverPhotoPreview} disabled={uploadingCover}>
                        <X className="h-4 w-4 mr-2" />Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Label htmlFor="cover-photo-input" className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 cursor-pointer text-sm font-medium transition-colors">
                        <Camera className="h-4 w-4 mr-2 text-teal-600" />
                        {profile?.cover_photo_url ? 'Change Cover Photo' : 'Upload Cover Photo'}
                      </Label>
                      <input id="cover-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverPhotoSelect} className="hidden" />
                      {profile?.cover_photo_url && (
                        <Button variant="outline" onClick={handleRemoveCoverPhoto} disabled={uploadingCover} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          {uploadingCover ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}Remove
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">Recommended: 1500 x 500 pixels. Max: 10MB. Formats: JPEG, PNG, WebP.</p>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          {/* Home Location Settings */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="glass" hover="lift" glow="subtle">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <GlassCardTitle>Home Location</GlassCardTitle>
                    <GlassCardDescription>Track total distance traveled from home</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="home-city">Home City</Label>
                    <Input id="home-city" type="text" value={homeLocationData.city} onChange={(e) => setHomeLocationData(prev => ({ ...prev, city: e.target.value }))} placeholder="e.g., New York, London" className="bg-white/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home-country">Home Country</Label>
                    <Input id="home-country" type="text" value={homeLocationData.country} onChange={(e) => setHomeLocationData(prev => ({ ...prev, country: e.target.value }))} placeholder="e.g., United States" className="bg-white/50" />
                  </div>
                </div>
                <Button onClick={updateHomeLocation} disabled={loading || (!homeLocationData.city && !homeLocationData.country)} className="bg-teal-500 hover:bg-teal-600">
                  {loading ? 'Saving...' : 'Save Home Location'}
                </Button>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          {/* Privacy Settings */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="glass" hover="lift" glow="subtle">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <GlassCardTitle>Privacy & Visibility</GlassCardTitle>
                    <GlassCardDescription>Control who can see your profile and adventures</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Profile Visibility</Label>
                    <Select value={privacyLevel} onValueChange={updatePrivacyLevel} disabled={loading}>
                      <SelectTrigger className="w-full bg-white/50">
                        <SelectValue placeholder="Select privacy level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public"><div className="flex items-center gap-2"><Globe className="h-4 w-4" /><span>Public</span></div></SelectItem>
                        <SelectItem value="friends"><div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>Friends Only</span></div></SelectItem>
                        <SelectItem value="private"><div className="flex items-center gap-2"><Lock className="h-4 w-4" /><span>Private</span></div></SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                      {getPrivacyIcon(privacyLevel)}
                      {getPrivacyDescription(privacyLevel)}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-200/50">
                    <Badge variant="outline" className="mb-2 bg-white/50">Current Setting</Badge>
                    <div className="flex items-center gap-2 text-sm">
                      {getPrivacyIcon(privacyLevel)}
                      <span className="font-medium capitalize">{privacyLevel}</span>
                    </div>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          {/* Social Settings - Follow Requests */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <FollowRequests />
          </motion.div>

          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <FollowLists />
          </motion.div>

          {/* Security Settings */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="elevated" hover="lift" glow="subtle">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <Key className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <GlassCardTitle>Security</GlassCardTitle>
                    <GlassCardDescription>Manage your account security and password</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} placeholder="Enter current password" className="bg-white/50 pr-10" />
                      <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} placeholder="Enter new password" className="bg-white/50 pr-10" />
                      <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Confirm new password" className="bg-white/50" />
                  </div>
                  <Button onClick={updatePassword} disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword} className="bg-teal-500 hover:bg-teal-600">
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="glass" hover="lift" glow="subtle">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <GlassCardTitle>Notifications</GlassCardTitle>
                    <GlassCardDescription>Configure how you receive notifications</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-sm text-gray-600 bg-gray-50/50 rounded-lg p-4">
                  Notification preferences will be available in a future update.
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          {/* Data Management */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="glass" hover="lift" glow="subtle">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <GlassCardTitle>Data Management</GlassCardTitle>
                    <GlassCardDescription>Export or manage your Adventure Log data</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50">
                  <h4 className="font-medium text-green-900 mb-2">Download Your Travel Memories</h4>
                  <p className="text-sm text-green-700 mb-4">Get a copy of all your adventures, albums, and memories</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-white hover:bg-green-50" disabled={loading}>
                        <Download className="h-4 w-4 mr-2" />Download My Data
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
                            </ul>
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button onClick={exportData} disabled={loading} className="bg-teal-500 hover:bg-teal-600">
                          {loading ? <><Download className="h-4 w-4 mr-2 animate-pulse" />Preparing...</> : <><Download className="h-4 w-4 mr-2" />Download Now</>}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
            <GlassCard variant="solid" hover="none" className="border-red-200 bg-red-50/50">
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <GlassCardTitle className="text-red-700">Danger Zone</GlassCardTitle>
                    <GlassCardDescription className="text-red-600/80">Irreversible and destructive actions</GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-white/50">
                  <div>
                    <h4 className="font-medium text-red-700">Delete Account</h4>
                    <p className="text-sm text-red-600/80">Delete your account with 30-day recovery period</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">Delete Account</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription className="space-y-2">
                          <p>Your account and all your data will be scheduled for deletion.</p>
                          <p className="font-medium text-orange-600">✓ You have 30 days to recover your account</p>
                          <p className="text-sm">During this period, your data is preserved. After 30 days, all data will be permanently deleted.</p>
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
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
