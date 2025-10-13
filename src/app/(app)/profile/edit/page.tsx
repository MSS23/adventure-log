'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Upload, User, Save, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'
import { log } from '@/lib/utils/logger'
import { uploadAvatar } from '@/lib/utils/storage'
import { getPhotoUrl } from '@/lib/utils/photo-url'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (profile) {
      setValue('username', profile.username || profile.name || '')
      setValue('display_name', profile.display_name || profile.name || '')
      setValue('bio', profile.bio || '')
      setValue('website', profile.website || '')
      setValue('location', profile.location || '')
      // Use getPhotoUrl to ensure avatar URL is properly formatted
      setAvatarPreview(getPhotoUrl(profile.avatar_url, 'avatars') || null)
    }
  }, [profile, setValue])

  // Watch username field
  const currentUsername = watch('username')

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      // Don't check if empty or same as current username
      if (!currentUsername || currentUsername === profile?.username) {
        setUsernameAvailable(null)
        return
      }

      // Don't check availability if username has validation errors from schema
      // This prevents showing "username taken" when there are format issues
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
      if (!usernameRegex.test(currentUsername)) {
        setUsernameAvailable(null)
        return
      }

      setCheckingUsername(true)

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('username', currentUsername)
          .maybeSingle()

        if (error) throw error

        // Available if no user found with this username
        setUsernameAvailable(!data)
      } catch (err) {
        log.error('Error checking username availability', {
          component: 'ProfileEditPage',
          username: currentUsername
        }, err instanceof Error ? err : new Error(String(err)))
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500) // 500ms debounce
    return () => clearTimeout(timeoutId)
  }, [currentUsername, profile?.username, supabase])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const previewUrl = URL.createObjectURL(file)
      setAvatarPreview(previewUrl)
    }
  }

  const handleAvatarUpload = async (file: File): Promise<string | null> => {
    try {
      return await uploadAvatar(file, user!.id)
    } catch (err) {
      log.error('Avatar upload operation failed', {
        component: 'ProfileEditPage',
        action: 'uploadAvatar',
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      return null
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      setError(null)

      // Check if username is available (if changed)
      if (data.username !== profile?.username && usernameAvailable === false) {
        setError('This username is already taken. Please choose a different one.')
        setLoading(false)
        return
      }

      let avatarUrl = profile?.avatar_url

      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await handleAvatarUpload(avatarFile)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        } else {
          throw new Error('Failed to upload avatar')
        }
      }

      // Format website URL - add https:// if not present
      let websiteUrl = data.website ? data.website.trim() : null
      if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${websiteUrl}`
      }

      // Update profile in database
      const { error } = await supabase
        .from('users')
        .update({
          username: data.username || null,
          display_name: data.display_name || data.username || null,
          name: data.display_name || data.username || null, // Keep for backward compatibility
          bio: data.bio || null,
          website: websiteUrl,
          location: data.location || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) throw error

      // Refresh the profile data
      await refreshProfile()

      router.push('/profile')
    } catch (err) {
      log.error('Profile update failed', {
        component: 'ProfileEditPage',
        action: 'updateProfile',
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-yellow-600 font-medium">Profile not found</p>
              <p className="text-yellow-500 text-sm mt-1">Please complete your profile setup</p>
              <Link href="/setup" className="mt-4 inline-block">
                <Button>Complete Profile Setup</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/profile" className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Profile
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-800">Update your personal information and preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Picture
            </CardTitle>
            <CardDescription>
              Upload a profile picture to help others recognize you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} alt="Profile picture" />
                <AvatarFallback className="text-xl">
                  {getInitials(watch('username') || 'User')}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <Label htmlFor="avatar" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-800">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your public profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <Input
                    id="username"
                    {...register('username')}
                    className={errors.username ? 'border-red-500' : usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : ''}
                  />
                  {checkingUsername && (
                    <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <Check className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                  )}
                  {!checkingUsername && usernameAvailable === false && watch('username') !== profile?.username && (
                    <X className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                  )}
                </div>
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
                {!errors.username && usernameAvailable === false && watch('username') !== profile?.username && (
                  <p className="text-sm text-red-600">This username is already taken</p>
                )}
                {!errors.username && usernameAvailable === true && (
                  <p className="text-sm text-green-600">Username is available!</p>
                )}
                <p className="text-sm text-gray-800">
                  3-30 characters, letters, numbers, underscores, and hyphens only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  {...register('display_name')}
                  className={errors.display_name ? 'border-red-500' : ''}
                  placeholder="Your full name"
                />
                {errors.display_name && (
                  <p className="text-sm text-red-600">{errors.display_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                className={errors.bio ? 'border-red-500' : ''}
                placeholder="Tell others about yourself and your adventures..."
                rows={3}
                maxLength={1000}
              />
              {errors.bio && (
                <p className="text-sm text-red-600">{errors.bio.message}</p>
              )}
              <p className="text-sm text-gray-800">
                Maximum 1000 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register('location')}
                  className={errors.location ? 'border-red-500' : ''}
                  placeholder="City, Country"
                />
                {errors.location && (
                  <p className="text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="text"
                  {...register('website')}
                  className={errors.website ? 'border-red-500' : ''}
                  placeholder="your-website.com or https://your-website.com"
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
                <p className="text-sm text-gray-800">
                  You can enter with or without https://
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Changes */}
        <div className="flex justify-end gap-4">
          <Link href="/profile">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}