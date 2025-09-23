'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'

export default function SetupPage() {
  const { createProfile, loading, error } = useAuthActions()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const onSubmit = async (data: ProfileFormData) => {
    await createProfile(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Complete your profile
          </CardTitle>
          <CardDescription className="text-center">
            Tell us a bit about yourself to get started
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
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Choose a unique username"
                {...register('username')}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
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
              disabled={loading}
            >
              {loading ? 'Creating profile...' : 'Complete setup'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}