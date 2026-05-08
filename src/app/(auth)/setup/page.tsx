'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, XCircle, Loader2, Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

export default function SetupPage() {
  const { createProfile, loading, error } = useAuthActions()
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'error' | null>(null)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      username: '',
      display_name: '',
      bio: '',
      location: '',
      website: '',
    },
  })

  const watchedUsername = watch('username')
  const watchedBio = watch('bio')
  const watchedLocation = watch('location')
  const watchedDisplayName = watch('display_name')

  // Pre-fill from auth metadata (username + display name chosen during signup)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata) {
          const { username, display_name } = user.user_metadata
          if (username) setValue('username', username)
          if (display_name) setValue('display_name', display_name)
        }

        // If user already has a profile with a non-auto-generated username, skip setup
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single()

          if (profile?.username && !profile.username.startsWith('user_')) {
            router.push('/feed')
            return
          }
        }
      } catch {
        // Ignore errors, user will fill in manually
      }
      setMetaLoaded(true)
    }
    loadMetadata()
  }, [supabase, setValue, router])

  // Check username availability with debouncing
  const checkUsername = useCallback(async (username: string) => {
    const normalized = username.trim().toLowerCase()
    if (!normalized || normalized.length < 3 || !/^[a-z0-9_]+$/.test(normalized)) {
      setUsernameStatus(null)
      return
    }

    const reserved = ['admin', 'administrator', 'root', 'system', 'moderator', 'support', 'help', 'api', 'www', 'mail', 'ftp']
    if (reserved.includes(normalized)) {
      setUsernameStatus('taken')
      return
    }

    setUsernameStatus('checking')
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('username')
        .eq('username', normalized)
        .single()

      if (fetchError?.code === 'PGRST116') {
        setUsernameStatus('available')
      } else if (data) {
        setUsernameStatus('taken')
      }
    } catch (err) {
      log.error('Username check exception', { component: 'SetupPage' }, err instanceof Error ? err : new Error(String(err)))
      setUsernameStatus('error')
    }
  }, [supabase])

  useEffect(() => {
    if (!watchedUsername) {
      setUsernameStatus(null)
      return
    }
    const timeout = setTimeout(() => checkUsername(watchedUsername), 500)
    return () => clearTimeout(timeout)
  }, [watchedUsername, checkUsername])

  const onSubmit = async (data: ProfileFormData) => {
    if (usernameStatus === 'taken') return
    try {
      if (!data.username || data.username.trim().length < 3) {
        throw new Error('Username is required and must be at least 3 characters')
      }

      const sanitizedData: ProfileFormData = {
        username: data.username.trim().toLowerCase(),
        display_name: data.display_name.trim(),
        bio: data.bio?.trim() || undefined,
        location: data.location?.trim() || undefined,
        website: data.website?.trim() ? (data.website.trim().startsWith('http') ? data.website.trim() : `https://${data.website.trim()}`) : undefined,
      }

      await createProfile(sanitizedData)
    } catch (err) {
      log.error('Profile setup error', { component: 'SetupPage', username: data.username }, err instanceof Error ? err : new Error(String(err)))
    }
  }

  if (!metaLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4 py-8">
      <Card className="w-full max-w-lg shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 bg-olive-700 rounded-2xl flex items-center justify-center shadow-lg shadow-olive-700/20">
              <Compass className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-olive-950 dark:text-olive-50">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-center text-olive-600 dark:text-olive-400">
            Set up your profile and start your adventure as a Level 1 Explorer
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="username" className="text-olive-800 dark:text-olive-200">
                  Username <span className="text-red-500">*</span>
                </Label>
                <span className="text-xs text-stone-500">{watchedUsername?.length || 0}/50</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-olive-500 pointer-events-none font-medium">@</span>
                <Input
                  id="username"
                  placeholder="your_username"
                  maxLength={50}
                  {...register('username')}
                  className={cn(
                    'pl-8 pr-10 text-base focus-visible:ring-2 focus-visible:ring-olive-500',
                    errors.username ? 'border-red-500' :
                    usernameStatus === 'taken' ? 'border-red-500' :
                    usernameStatus === 'available' ? 'border-green-500' : ''
                  )}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-olive-400" />}
                  {usernameStatus === 'available' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              {errors.username && <p className="text-xs text-red-600">{errors.username.message}</p>}
              {!errors.username && usernameStatus === 'taken' && (
                <p className="text-xs text-red-600">This username is already taken</p>
              )}
              <p className="text-[11px] text-stone-500">
                Lowercase letters, numbers, underscores. This is your unique identifier.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="display_name" className="text-olive-800 dark:text-olive-200">
                  Display Name <span className="text-red-500">*</span>
                </Label>
                <span className="text-xs text-stone-500">{watchedDisplayName?.length || 0}/100</span>
              </div>
              <Input
                id="display_name"
                placeholder="Your Name"
                maxLength={100}
                {...register('display_name')}
                className={cn('text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.display_name ? 'border-red-500' : '')}
              />
              {errors.display_name && <p className="text-xs text-red-600">{errors.display_name.message}</p>}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio" className="text-olive-800 dark:text-olive-200">Bio (Optional)</Label>
                <span className={cn('text-xs', (watchedBio?.length || 0) > 1000 ? 'text-red-600' : 'text-stone-500')}>
                  {watchedBio?.length || 0}/1000
                </span>
              </div>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself and your travel interests..."
                rows={3}
                maxLength={1000}
                {...register('bio')}
                className={cn('text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.bio ? 'border-red-500' : '')}
              />
              {errors.bio && <p className="text-xs text-red-600">{errors.bio.message}</p>}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="location" className="text-olive-800 dark:text-olive-200">Location (Optional)</Label>
                <span className="text-xs text-stone-500">{watchedLocation?.length || 0}/100</span>
              </div>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                maxLength={100}
                {...register('location')}
                className={cn('text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.location ? 'border-red-500' : '')}
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="text-olive-800 dark:text-olive-200">Website (Optional)</Label>
              <Input
                id="website"
                type="text"
                placeholder="yourwebsite.com"
                {...register('website')}
                className={cn('text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.website ? 'border-red-500' : '')}
              />
              {errors.website && <p className="text-xs text-red-600">{errors.website.message}</p>}
            </div>
          </CardContent>

          <CardContent className="pt-2">
            <Button
              type="submit"
              className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20 transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking' || !watchedUsername || !watchedDisplayName}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </span>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
