'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  MapPin,
  Globe,
  Users,
  Lock,
  Calendar as CalendarIcon,
  Crop
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import Image from 'next/image'
import { albumSchema, AlbumFormData } from '@/lib/validations/album'
import { Album } from '@/types/database'
import { LocationDropdown } from '@/components/location/LocationDropdown'
import { log } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { Photo } from '@/types/database'
import { PhotoGridEditor } from '@/components/photos/PhotoGridEditor'
import { filterDuplicatePhotos } from '@/lib/utils/photo-deduplication'
import { Camera, ImagePlus } from 'lucide-react'
import { CollaboratorManager } from '@/components/albums/CollaboratorManager'
import { CoverPhotoPositionEditor } from '@/components/albums/CoverPhotoPositionEditor'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { deletePhoto as deletePhotoAction } from '../actions'

interface LocationData {
  latitude: number
  longitude: number
  display_name: string
  place_id?: string
  city_id?: number
  country_id?: number
  country_code?: string
}

export default function EditAlbumPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [albumLocation, setAlbumLocation] = useState<LocationData | null>(null)
  const [showExactDates, setShowExactDates] = useState(true)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [selectedCoverPhoto, setSelectedCoverPhoto] = useState<string | null>(null)
  const [coverPosition, setCoverPosition] = useState<{
    position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset: number
    yOffset: number
  }>({ position: 'center', xOffset: 50, yOffset: 50 })
  const [cropEditorOpen, setCropEditorOpen] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
  })

  const visibility = watch('visibility')

  const fetchAlbum = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()

      if (albumError) throw albumError

      if (!albumData) {
        throw new Error('Album not found or you do not have permission to edit it')
      }

      setAlbum(albumData)
      setTags(albumData.tags || [])
      setShowExactDates(albumData.show_exact_dates !== false) // Default to true
      setSelectedCoverPhoto(albumData.cover_photo_url || null)
      setCoverPosition({
        position: albumData.cover_photo_position || 'center',
        xOffset: albumData.cover_photo_x_offset ?? 50,
        yOffset: albumData.cover_photo_y_offset ?? 50
      })

      // Set form values
      setValue('title', albumData.title)
      setValue('description', albumData.description || '')
      setValue('visibility', albumData.visibility)
      setValue('start_date', albumData.date_start || '')
      setValue('end_date', albumData.date_end || '')

      // Set location data if it exists
      if (albumData.location_name && albumData.latitude && albumData.longitude) {
        setAlbumLocation({
          display_name: albumData.location_name,
          latitude: albumData.latitude,
          longitude: albumData.longitude,
          city_id: albumData.city_id,
          country_id: albumData.country_id,
          country_code: albumData.country_code
        })
      }

      // Fetch photos for this album
      setPhotosLoading(true)
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', params.id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!photosError && photosData) {
        const filteredPhotos = filterDuplicatePhotos(photosData)
        setPhotos(filteredPhotos)
      }
      setPhotosLoading(false)
    } catch (err) {
      log.error('Failed to fetch album for editing', {
        component: 'AlbumEditPage',
        action: 'fetchAlbum',
        albumId: Array.isArray(params.id) ? params.id[0] : params.id,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to fetch album')
    } finally {
      setLoading(false)
    }
  }, [params.id, user?.id, setValue, supabase])

  useEffect(() => {
    if (params.id && user) {
      fetchAlbum()
    }
  }, [params.id, user, fetchAlbum])

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleDeletePhoto = async (photoId: string): Promise<void> => {
    const albumId = album?.id
    if (!albumId) throw new Error('Album not found')

    // Use server action for proper storage cleanup + cover photo handling
    const result = await deletePhotoAction(photoId, albumId)
    if (!result.success) throw new Error(result.error || 'Failed to delete photo')

    // If that was the last photo, the album was fully deleted
    if (result.albumDeleted) {
      toast.success('Album deleted — no photos remaining')
      router.push('/albums')
      return
    }

    // Update local state
    setPhotos(prev => {
      const deletedPhoto = prev.find(p => p.id === photoId)
      if (deletedPhoto && (deletedPhoto.file_path === selectedCoverPhoto || deletedPhoto.storage_path === selectedCoverPhoto)) {
        setSelectedCoverPhoto(null)
      }
      return prev.filter(p => p.id !== photoId)
    })

    toast.success('Photo deleted successfully')
  }

  const handleSetCoverPhoto = (photoPath: string) => {
    // A crop saved for the previous cover doesn't apply to a different image
    if (photoPath !== selectedCoverPhoto) {
      setCoverPosition({ position: 'center', xOffset: 50, yOffset: 50 })
    }
    setSelectedCoverPhoto(photoPath)
    toast.success('Cover photo selected. Save changes to apply.')
  }

  const handlePhotosReorder = async (reorderedPhotos: Photo[]) => {
    setPhotos(reorderedPhotos)

    // Update display order in the database
    try {
      const updates = reorderedPhotos.map((photo, index) => ({
        id: photo.id,
        display_order: index
      }))

      for (const update of updates) {
        await supabase
          .from('photos')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
      // Note: PhotoGridEditor already shows toast on reorder
    } catch (err) {
      log.error('Failed to update photo order', {
        component: 'AlbumEditPage',
        action: 'reorderPhotos'
      }, err instanceof Error ? err : new Error(String(err)))
      toast.error('Failed to update photo order')
    }
  }

  const onSubmit = async (data: AlbumFormData) => {
    try {
      setSaving(true)
      setError(null)

      // Show saving toast
      toast.loading('Saving album changes...', { id: 'album-save' })

      // Prepare update data - avoid foreign key conflicts
      const updateData: Record<string, unknown> = {
        title: data.title,
        description: data.description || null,
        visibility: data.visibility,
        date_start: data.start_date || null,
        date_end: data.end_date || null,
        show_exact_dates: showExactDates,
        tags: tags.length > 0 ? tags : null,
        cover_photo_url: selectedCoverPhoto,
        cover_photo_position: coverPosition.position,
        cover_photo_x_offset: coverPosition.xOffset,
        cover_photo_y_offset: coverPosition.yOffset,
        updated_at: new Date().toISOString()
      }

      // Add location data if present
      if (albumLocation) {
        updateData.location_name = albumLocation.display_name
        updateData.latitude = albumLocation.latitude
        updateData.longitude = albumLocation.longitude
        updateData.country_code = albumLocation.country_code || null
      }

      const { error, data: updatedAlbum } = await supabase
        .from('albums')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single()

      if (error) {
        // Log the full error for debugging
        log.error('Supabase update error', {
          component: 'AlbumEditPage',
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw new Error(error.message || 'Failed to update album')
      }

      if (!updatedAlbum) {
        throw new Error('Album update succeeded but no data returned')
      }

      // Log successful update
      log.info('Album updated successfully', {
        component: 'AlbumEditPage',
        action: 'updateAlbum',
        albumId: Array.isArray(params.id) ? params.id[0] : params.id,
        hasLocation: !!(albumLocation?.latitude && albumLocation?.longitude),
        hasCountryCode: !!albumLocation?.country_code
      })

      // Show success toast
      toast.success('Album updated successfully!', {
        id: 'album-save',
        description: 'All changes have been saved and will appear across the app.'
      })

      // Invalidate any cached data and refresh the router
      // This ensures the globe, feed, and other pages get fresh data
      router.refresh()

      // Small delay to ensure cache is invalidated before navigation
      setTimeout(() => {
        router.push(`/albums/${params.id}`)
      }, 100)
    } catch (err) {
      log.error('Failed to update album', {
        component: 'AlbumEditPage',
        action: 'updateAlbum',
        albumId: Array.isArray(params.id) ? params.id[0] : params.id,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))

      const errorMessage = err instanceof Error ? err.message : 'Failed to update album'
      setError(errorMessage)

      // Show error toast
      toast.error('Failed to save album', {
        id: 'album-save',
        description: errorMessage
      })
    } finally {
      setSaving(false)
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4 text-primary" />
      case 'friends':
        return <Users className="h-4 w-4 text-primary" />
      case 'private':
        return <Lock className="h-4 w-4 text-muted-foreground" />
      default:
        return <Globe className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Anyone can view this album'
      case 'friends':
        return 'Only your friends can view this album'
      case 'private':
        return 'Only you can view this album'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1 -m-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>

        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive font-medium">Failed to load album</p>
              <p className="text-destructive text-sm mt-1">{error}</p>
              <div className="mt-4 space-x-2">
                <Button variant="outline" onClick={fetchAlbum}>
                  Try Again
                </Button>
                <Link href="/albums">
                  <Button variant="outline">Back to Albums</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1 -m-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-foreground">Album not found</p>
              <Link href="/albums" className="mt-4 inline-block">
                <Button variant="outline">Back to Albums</Button>
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
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1 -m-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>

        <div>
          <p className="al-eyebrow mb-1">Editing</p>
          <h1 className="al-display text-2xl sm:text-3xl">Edit Album</h1>
          <p className="text-sm text-[color:var(--color-muted-warm)] mt-1.5">Update your album details and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update your album&apos;s basic details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Album Title *</Label>
              <Input
                id="title"
                {...register('title')}
                className={errors.title ? 'border-destructive' : ''}
                placeholder="Enter album title"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
                placeholder="Describe your adventure..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location & Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Dates
            </CardTitle>
            <CardDescription>
              Add location and date information for your adventure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_name">Location</Label>
              <LocationDropdown
                value={albumLocation}
                onChange={setAlbumLocation}
                placeholder="Search destinations or pick a popular one..."
                allowCurrentLocation={true}
                showPopularDestinations={true}
                className={errors.location_name ? 'border-destructive' : ''}
              />
              {errors.location_name && (
                <p className="text-sm text-destructive">{errors.location_name.message}</p>
              )}
              {albumLocation && (
                <div className="rounded-xl bg-muted/50 p-3 text-sm">
                  <p className="text-foreground font-medium">Selected: {albumLocation.display_name}</p>
                  <p className="text-muted-foreground text-sm">
                    Coordinates: {albumLocation.latitude.toFixed(6)}, {albumLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.start_date ? 'border-destructive' : ''}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.end_date ? 'border-destructive' : ''}
                />
                {errors.end_date && (
                  <p className="text-sm text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="show_exact_dates" className="text-base font-medium">
                      Show Exact Dates
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {showExactDates
                      ? 'Full dates will be displayed (e.g., "December 12, 1999")'
                      : 'Only month and year will be shown (e.g., "December 1999")'}
                  </p>
                </div>
                <Switch
                  id="show_exact_dates"
                  checked={showExactDates}
                  onCheckedChange={setShowExactDates}
                  className="cursor-pointer"
                />
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Privacy Tip:</strong> For your safety, we recommend keeping this off.
                  Sharing exact dates can reveal when you&apos;re away from home.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Visibility</CardTitle>
            <CardDescription>
              Control who can see this album
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setValue('visibility', value as 'private' | 'friends' | 'public')}
              >
                <SelectTrigger className="cursor-pointer transition-all duration-200">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Friends Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {visibility && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {getVisibilityIcon(visibility)}
                  {getVisibilityDescription(visibility)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photo Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos
              </div>
              <Link href={`/albums/${params.id}/upload`} className="cursor-pointer">
                <Button type="button" size="sm" variant="outline" className="gap-2 cursor-pointer active:scale-[0.97] transition-all duration-200">
                  <Plus className="h-4 w-4" />
                  Add Photos
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Manage your album photos - reorder, set cover, or delete
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCoverPhoto && !photosLoading && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Cover Preview</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCropEditorOpen(true)}
                    className="gap-2 cursor-pointer active:scale-[0.97] transition-all duration-200"
                  >
                    <Crop className="h-4 w-4" />
                    Adjust Crop
                  </Button>
                </div>
                <div className="relative aspect-[16/10] sm:max-w-md rounded-2xl overflow-hidden bg-muted border border-border">
                  <Image
                    src={getPhotoUrl(selectedCoverPhoto) || ''}
                    alt="Album cover preview"
                    fill
                    className="object-cover"
                    style={{ objectPosition: `${coverPosition.xOffset}% ${coverPosition.yOffset}%` }}
                    sizes="(max-width: 640px) 100vw, 448px"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This is how your cover appears in feeds and album previews. Use Adjust Crop if the framing cuts off the important part.
                </p>
              </div>
            )}
            {photosLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/30">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No photos in this album yet</p>
                <Link href={`/albums/${params.id}/upload`}>
                  <Button type="button" variant="outline">
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Upload Photos
                  </Button>
                </Link>
              </div>
            ) : (
              <PhotoGridEditor
                photos={photos}
                albumId={album?.id || ''}
                currentCoverPhotoUrl={selectedCoverPhoto || undefined}
                onPhotosReorder={handlePhotosReorder}
                onPhotoDelete={handleDeletePhoto}
                onCoverPhotoSet={handleSetCoverPhoto}
              />
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Add tags to help organize and find your albums
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive cursor-pointer transition-all duration-200 active:scale-[0.9] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
          <Link href={`/albums/${params.id}`} className="cursor-pointer">
            <Button type="button" variant="outline" className="cursor-pointer active:scale-[0.97] transition-all duration-200">
              Cancel
            </Button>
          </Link>

          <Button type="submit" variant="coral" disabled={saving} className="px-6 cursor-pointer disabled:opacity-60">
            {saving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Collaborators - outside form since it manages its own state */}
      {album && (
        <CollaboratorManager albumId={album.id} isOwner={album.user_id === user?.id} />
      )}

      {/* Cover crop editor - applied locally, persisted on Save Changes */}
      {selectedCoverPhoto && (
        <CoverPhotoPositionEditor
          isOpen={cropEditorOpen}
          onClose={() => setCropEditorOpen(false)}
          imageUrl={getPhotoUrl(selectedCoverPhoto) || ''}
          currentPosition={coverPosition}
          onSave={(position) => {
            setCoverPosition(position)
            toast.success('Crop updated. Save changes to apply.')
          }}
        />
      )}
    </div>
  )
}