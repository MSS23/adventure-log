'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Upload, User, Save } from 'lucide-react'
import Link from 'next/link'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'
import { log } from '@/lib/utils/logger'
import { uploadAvatar } from '@/lib/utils/storage'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
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
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile, setValue])

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

      // Update profile in database
      const { error } = await supabase
        .from('users')
        .update({
          username: data.username || null,
          display_name: data.display_name || data.username || null,
          name: data.display_name || data.username || null, // Keep for backward compatibility
          bio: data.bio || null,
          website: data.website || null,
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
                <Input
                  id="username"
                  {...register('username')}
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
                <p className="text-sm text-gray-800">
                  Your unique identifier on Adventure Log
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
                  type="url"
                  {...register('website')}
                  className={errors.website ? 'border-red-500' : ''}
                  placeholder="https://your-website.com"
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
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