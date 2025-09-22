'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, X, Globe, Users, Lock, MapPin } from 'lucide-react'
import Link from 'next/link'

const albumSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  location_name: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  visibility: z.enum(['private', 'friends', 'public']),
  tags: z.array(z.string())
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

type AlbumFormData = z.infer<typeof albumSchema>

export default function NewAlbumPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      title: '',
      description: '',
      location_name: '',
      start_date: '',
      end_date: '',
      visibility: 'public',
      tags: []
    }
  })

  const watchedTags = watch('tags')
  const watchedVisibility = watch('visibility')

  const addTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !watchedTags.includes(trimmedTag) && watchedTags.length < 10) {
      setValue('tags', [...watchedTags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const onSubmit = async (data: AlbumFormData) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const albumData = {
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        location_name: data.location_name || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        visibility: data.visibility,
        tags: data.tags.length > 0 ? data.tags : null
      }

      const { data: album, error } = await supabase
        .from('albums')
        .insert([albumData])
        .select()
        .single()

      if (error) throw error

      router.push(`/albums/${album.id}`)
    } catch (err) {
      console.error('Error creating album:', err)
      setError(err instanceof Error ? err.message : 'Failed to create album')
    } finally {
      setLoading(false)
    }
  }

  const visibilityOptions = [
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone can see this album',
      icon: Globe
    },
    {
      value: 'friends',
      label: 'Friends',
      description: 'Only people you follow can see this',
      icon: Users
    },
    {
      value: 'private',
      label: 'Private',
      description: 'Only you can see this album',
      icon: Lock
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Album</h1>
        <p className="text-gray-600 mt-2">
          Organize your travel photos and memories into a beautiful album
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your album a title and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Album Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Summer Trip to Italy"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell the story of your trip..."
                rows={4}
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location & Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location & Dates
            </CardTitle>
            <CardDescription>
              Where and when did this adventure take place?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_name">Location</Label>
              <Input
                id="location_name"
                placeholder="e.g., Rome, Italy"
                {...register('location_name')}
                className={errors.location_name ? 'border-red-500' : ''}
              />
              {errors.location_name && (
                <p className="text-sm text-red-600">{errors.location_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  className={errors.start_date ? 'border-red-500' : ''}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-600">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  className={errors.end_date ? 'border-red-500' : ''}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-600">{errors.end_date.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Choose who can see your album
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibilityOptions.map((option) => {
                const Icon = option.icon
                return (
                  <label
                    key={option.value}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      watchedVisibility === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('visibility')}
                      className="mt-1"
                    />
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      watchedVisibility === option.value ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        watchedVisibility === option.value ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </p>
                      <p className={`text-sm ${
                        watchedVisibility === option.value ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Add tags to help organize and find your album later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1"
                disabled={watchedTags.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || watchedTags.includes(tagInput.trim()) || watchedTags.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {watchedTags.length >= 10 && (
              <p className="text-sm text-gray-500">Maximum of 10 tags allowed</p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/albums" className="flex-1">
            <Button variant="outline" className="w-full" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Creating...' : 'Create Album'}
          </Button>
        </div>
      </form>
    </div>
  )
}