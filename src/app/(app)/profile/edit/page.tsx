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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Save, Check, X, Loader2, Camera } from 'lucide-react'
import Link from 'next/link'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'
import { log } from '@/lib/utils/logger'
import { uploadAvatar } from '@/lib/utils/storage'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'

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
      setAvatarPreview(getPhotoUrl(profile.avatar_url, 'avatars') || null)
    }
  }, [profile, setValue])

  const currentUsername = watch('username')

  useEffect(() => {
    const checkUsername = async () => {
      if (!currentUsername || currentUsername === profile?.username) {
        setUsernameAvailable(null)
        return
      }

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
        setUsernameAvailable(!data)
      } catch (err) {
        log.error('Error checking username', { component: 'EditProfile' }, err instanceof Error ? err : new Error(String(err)))
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [currentUsername, profile?.username, supabase])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      setError(null)

      if (data.username !== profile?.username && usernameAvailable === false) {
        setError('This username is already taken.')
        setLoading(false)
        return
      }

      let avatarUrl = profile?.avatar_url

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile, user!.id)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        } else {
          throw new Error('Failed to upload avatar')
        }
      }

      let websiteUrl = data.website ? data.website.trim() : null
      if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${websiteUrl}`
      }

      const { error } = await supabase
        .from('users')
        .update({
          username: data.username || null,
          display_name: data.display_name || data.username || null,
          name: data.display_name || data.username || null,
          bio: data.bio || null,
          website: websiteUrl,
          location: data.location || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) throw error

      await refreshProfile()
      router.push('/profile')
    } catch (err) {
      log.error('Profile update failed', { component: 'EditProfile' }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-stone-600 dark:text-stone-400">Profile not found</p>
          <Link href="/setup" className="mt-3 inline-block">
            <Button>Complete Profile Setup</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/profile" className="inline-flex items-center text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to profile
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Avatar */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] p-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-stone-200 dark:ring-stone-700">
                <AvatarImage src={avatarPreview || undefined} alt="Profile picture" />
                <AvatarFallback className="text-lg bg-olive-100 dark:bg-olive-900/40 text-olive-700 dark:text-olive-300">
                  {(watch('display_name') || watch('username') || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="avatar" className="absolute -bottom-1 -right-1 p-1.5 bg-olive-600 rounded-full cursor-pointer hover:bg-olive-700 transition-colors shadow-md">
                <Camera className="h-3.5 w-3.5 text-white" />
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Profile photo</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Square image, at least 200x200px</p>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111] p-5 space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-stone-700 dark:text-stone-300">Username</Label>
            <div className="relative">
              <Input
                id="username"
                {...register('username')}
                className={cn(
                  "dark:bg-stone-900 dark:border-stone-700",
                  errors.username || usernameAvailable === false ? 'border-red-500 dark:border-red-500' : '',
                  usernameAvailable === true ? 'border-green-500 dark:border-green-500' : ''
                )}
              />
              <div className="absolute right-3 top-2.5">
                {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
                {!checkingUsername && usernameAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                {!checkingUsername && usernameAvailable === false && watch('username') !== profile?.username && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            {errors.username && <p className="text-xs text-red-600 dark:text-red-400">{errors.username.message}</p>}
            {!errors.username && usernameAvailable === false && watch('username') !== profile?.username && (
              <p className="text-xs text-red-600 dark:text-red-400">Username taken</p>
            )}
            {!errors.username && usernameAvailable === true && (
              <p className="text-xs text-green-600 dark:text-green-400">Available</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-stone-700 dark:text-stone-300">Display Name</Label>
            <Input
              id="display_name"
              {...register('display_name')}
              placeholder="Your name"
              className={cn("dark:bg-stone-900 dark:border-stone-700", errors.display_name ? 'border-red-500' : '')}
            />
            {errors.display_name && <p className="text-xs text-red-600 dark:text-red-400">{errors.display_name.message}</p>}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-stone-700 dark:text-stone-300">Bio</Label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={1000}
              className={cn("dark:bg-stone-900 dark:border-stone-700 resize-none", errors.bio ? 'border-red-500' : '')}
            />
            {errors.bio && <p className="text-xs text-red-600 dark:text-red-400">{errors.bio.message}</p>}
          </div>

          {/* Location + Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-stone-700 dark:text-stone-300">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="City, Country"
                className={cn("dark:bg-stone-900 dark:border-stone-700", errors.location ? 'border-red-500' : '')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-stone-700 dark:text-stone-300">Website</Label>
              <Input
                id="website"
                {...register('website')}
                placeholder="your-site.com"
                className={cn("dark:bg-stone-900 dark:border-stone-700", errors.website ? 'border-red-500' : '')}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link href="/profile">
            <Button type="button" variant="outline" className="dark:border-stone-700 dark:text-stone-300">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-olive-600 hover:bg-olive-700 text-white"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
