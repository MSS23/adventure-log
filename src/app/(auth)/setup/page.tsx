'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'

export default function SetupPage() {
  const { createProfile, loading, error } = useAuthActions()
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'error' | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onSubmit', // Only validate on submit, not on every change
    reValidateMode: 'onChange', // Re-validate after first submit
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

  // Check username availability with debouncing
  useEffect(() => {
    const checkUsernameAvailability = async (username: string) => {
      // Normalize username for checking (trim and lowercase)
      const normalizedUsername = username.trim().toLowerCase()

      if (!normalizedUsername || normalizedUsername.length < 3) {
        setUsernameStatus(null)
        return
      }

      // Basic format validation first
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        setUsernameStatus(null)
        return
      }

      // Check for reserved usernames
      const reserved = ['admin', 'administrator', 'root', 'system', 'moderator', 'support', 'help', 'api', 'www', 'mail', 'ftp']
      if (reserved.includes(normalizedUsername)) {
        setUsernameStatus('taken')
        return
      }

      setUsernameStatus('checking')

      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('username', normalizedUsername)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned - username is available
            setUsernameStatus('available')
          } else {
            // Real error
            console.error('Username check error:', error)
            setUsernameStatus('error')
          }
        } else if (data) {
          // Username already exists
          setUsernameStatus('taken')
        }
      } catch (err) {
        console.error('Username check exception:', err)
        setUsernameStatus('error')
      }
    }

    // Set new timeout for debouncing
    if (watchedUsername) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(watchedUsername)
      }, 500) // 500ms delay

      return () => clearTimeout(timeout)
    } else {
      setUsernameStatus(null)
    }
  }, [watchedUsername, supabase])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      console.log('Form submitted with data:', data)
      console.log('Username status:', usernameStatus)

      // Defensive checks before submission
      if (!data.username || data.username.trim().length < 3) {
        throw new Error('Profile name is required and must be at least 3 characters')
      }

      // Double-check username availability before submitting
      if (usernameStatus !== 'available') {
        throw new Error('Please wait for username availability check or choose a different username')
      }

      // Sanitize all inputs before submission
      const sanitizedData: ProfileFormData = {
        username: data.username.trim().toLowerCase(),
        display_name: data.display_name?.trim() || undefined,
        bio: data.bio?.trim() || undefined,
        location: data.location?.trim() || undefined,
        website: data.website?.trim() ? (data.website.trim().startsWith('http') ? data.website.trim() : `https://${data.website.trim()}`) : undefined,
      }

      console.log('Sanitized data:', sanitizedData)
      await createProfile(sanitizedData)
    } catch (err) {
      console.error('Profile setup error:', err)
    }
  }

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'taken':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getUsernameStatusMessage = () => {
    switch (usernameStatus) {
      case 'taken':
        return 'This profile name is already taken. Please choose a different one.'
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-center">
            Set up your profile and start your adventure as a Level 1 Explorer
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="username">Profile Name *</Label>
                <span className="text-xs text-gray-500">
                  {watchedUsername?.length || 0}/50
                </span>
              </div>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="e.g. travel_explorer"
                  maxLength={50}
                  {...register('username')}
                  className={
                    errors.username
                      ? 'border-red-500 pr-10'
                      : usernameStatus === 'taken'
                      ? 'border-red-500 pr-10'
                      : usernameStatus === 'available'
                      ? 'border-green-500 pr-10'
                      : 'pr-10'
                  }
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {getUsernameStatusIcon()}
                </div>
              </div>
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
              {!errors.username && getUsernameStatusMessage() && (
                <p className={`text-sm ${
                  usernameStatus === 'available' ? 'text-green-600' :
                  usernameStatus === 'taken' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {getUsernameStatusMessage()}
                </p>
              )}
              <div className="text-xs text-gray-600 space-y-1">
                <p>• 3-50 characters</p>
                <p>• Lowercase letters, numbers, and underscores only</p>
                <p>• This will be your unique identifier (automatically converted to lowercase)</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="display_name">Display Name (Optional)</Label>
                <span className="text-xs text-gray-500">
                  {watchedDisplayName?.length || 0}/100
                </span>
              </div>
              <Input
                id="display_name"
                placeholder="e.g. John Doe"
                maxLength={100}
                {...register('display_name')}
                className={errors.display_name ? 'border-red-500' : ''}
              />
              {errors.display_name && (
                <p className="text-sm text-red-600">{errors.display_name.message}</p>
              )}
              <p className="text-xs text-gray-600">
                Your public display name (can contain spaces and capitals)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <span className={`text-xs ${
                  (watchedBio?.length || 0) > 1000 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {watchedBio?.length || 0}/1000
                </span>
              </div>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself and your travel interests..."
                rows={4}
                maxLength={1000}
                {...register('bio')}
                className={errors.bio ? 'border-red-500' : ''}
              />
              {errors.bio && (
                <p className="text-sm text-red-600">{errors.bio.message}</p>
              )}
              <p className="text-xs text-gray-600">
                Share your travel philosophy, favorite destinations, or what you&apos;re looking for
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="location">Location (Optional)</Label>
                <span className="text-xs text-gray-500">
                  {watchedLocation?.length || 0}/100
                </span>
              </div>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                maxLength={100}
                {...register('location')}
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && (
                <p className="text-sm text-red-600">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="text"
                placeholder="yourwebsite.com or https://yourwebsite.com"
                {...register('website')}
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-600">{errors.website.message}</p>
              )}
              <p className="text-xs text-gray-600">
                Your personal website, blog, or social media (https:// will be added automatically)
              </p>
            </div>
          </CardContent>

          <CardContent>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || usernameStatus !== 'available' || !watchedUsername}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating profile...
                </div>
              ) : (
                'Complete setup'
              )}
            </Button>
            {!watchedUsername && (
              <p className="text-sm text-amber-600 text-center mt-2">
                ⚠️ Profile name is required to continue
              </p>
            )}
            {watchedUsername && usernameStatus === 'taken' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-red-800 font-medium text-center">
                  ❌ This profile name is already taken
                </p>
                <p className="text-xs text-red-700 text-center mt-1">
                  You cannot use this profile name. Please choose a different one.
                </p>
              </div>
            )}
            {watchedUsername && Object.keys(errors).length > 0 && (
              <p className="text-sm text-red-600 text-center mt-2">
                Please fix the errors above before continuing
              </p>
            )}
          </CardContent>
        </form>
      </Card>
    </div>
  )
}