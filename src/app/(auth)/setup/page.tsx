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
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const watchedUsername = watch('username')

  // Check username availability with debouncing
  useEffect(() => {
    const checkUsernameAvailability = async (username: string) => {
      if (!username || username.length < 3) {
        setUsernameStatus(null)
        return
      }

      // Basic format validation first
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameStatus(null)
        return
      }

      setUsernameStatus('checking')

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single()

        if (error && error.code === 'PGRST116') {
          // No rows returned - username is available
          setUsernameStatus('available')
        } else if (data) {
          // Username already exists
          setUsernameStatus('taken')
        } else if (error) {
          // Other error
          setUsernameStatus('error')
        }
      } catch {
        setUsernameStatus('error')
      }
    }

    // Clear existing timeout
    if (checkTimeout) {
      clearTimeout(checkTimeout)
      setCheckTimeout(null)
    }

    // Set new timeout for debouncing
    if (watchedUsername) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(watchedUsername)
      }, 500) // 500ms delay

      setCheckTimeout(timeout)
    } else {
      setUsernameStatus(null)
    }

    return () => {
      // Cleanup function will clear the current timeout
    }
  }, [watchedUsername, supabase])

  // Separate cleanup effect
  useEffect(() => {
    return () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }
    }
  }, [checkTimeout])

  const onSubmit = async (data: ProfileFormData) => {
    // Double-check username availability before submitting
    if (usernameStatus !== 'available') {
      return
    }
    await createProfile(data)
  }

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'taken':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getUsernameStatusMessage = () => {
    switch (usernameStatus) {
      case 'checking':
        return 'Checking availability...'
      case 'available':
        return 'Username is available!'
      case 'taken':
        return 'Username is already taken'
      case 'error':
        return 'Error checking availability'
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
              <Label htmlFor="username">Profile Name *</Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Choose a unique profile name"
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
              <p className="text-sm text-gray-800">
                This will be your unique profile name that others can use to find you.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="Your display name"
                {...register('display_name')}
                className={errors.display_name ? 'border-red-500' : ''}
              />
              {errors.display_name && (
                <p className="text-sm text-red-600">{errors.display_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself and your travel interests..."
                rows={3}
                {...register('bio')}
                className={errors.bio ? 'border-red-500' : ''}
              />
              {errors.bio && (
                <p className="text-sm text-red-600">{errors.bio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Where are you based?"
                {...register('location')}
                className={errors.location ? 'border-red-500' : ''}
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
                placeholder="https://yourwebsite.com"
                {...register('website')}
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>
          </CardContent>

          <CardContent>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || usernameStatus !== 'available'}
            >
              {loading ? 'Creating profile...' : 'Complete setup'}
            </Button>
            {usernameStatus === 'taken' && (
              <p className="text-sm text-red-600 text-center mt-2">
                Please choose a different profile name to continue
              </p>
            )}
          </CardContent>
        </form>
      </Card>
    </div>
  )
}