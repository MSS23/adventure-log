'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Edit,
  Share,
  Trash2,
  Camera,
  Plus,
  MapPin,
  Calendar,
  Globe,
  Users,
  Lock,
  MoreHorizontal,
  Download,
  GripVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { Album, Photo } from '@/types/database'
import { PhotoGrid } from '@/components/photos/PhotoGrid'
import { LikeButton } from '@/components/social/LikeButton'
import { Comments } from '@/components/social/Comments'

export default function AlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (params.id && user) {
      fetchAlbumData()
    }
  }, [params.id, user])

  const fetchAlbumData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch album details
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select(`
          *,
          user:profiles(username, display_name, avatar_url)
        `)
        .eq('id', params.id)
        .single()

      if (albumError) throw albumError

      // Check if user has permission to view this album
      if (albumData.visibility === 'private' && albumData.user_id !== user?.id) {
        throw new Error('You do not have permission to view this album')
      }

      setAlbum(albumData)

      // Fetch photos for this album
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', params.id)
        .order('order_index', { ascending: true })

      if (photosError) throw photosError

      setPhotos(photosData || [])
    } catch (err) {
      console.error('Error fetching album:', err)
      let errorMessage = 'Failed to fetch album'

      if (err instanceof Error) {
        if (err.message.includes('permission')) {
          errorMessage = 'You do not have permission to view this album'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlbum = async () => {
    if (!album || !window.confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
      return
    }

    try {
      setDeleteLoading(true)

      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', album.id)

      if (error) throw error

      router.push('/albums')
    } catch (err) {
      console.error('Error deleting album:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete album')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSetCoverPhoto = async (photoUrl: string) => {
    if (!album) return

    try {
      const { error } = await supabase
        .from('albums')
        .update({ cover_photo_url: photoUrl })
        .eq('id', album.id)

      if (error) throw error

      // Update local state
      setAlbum(prev => prev ? { ...prev, cover_photo_url: photoUrl } : null)
    } catch (err) {
      console.error('Error setting cover photo:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to set cover photo'
      setError(`Cover photo update failed: ${errorMessage}`)

      // Auto-clear error after 5 seconds for non-critical errors
      setTimeout(() => {
        setError(null)
      }, 5000)
    }
  }

  const handlePhotosReorder = (reorderedPhotos: Photo[]) => {
    setPhotos(reorderedPhotos)
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4 text-green-600" />
      case 'friends':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'private':
        return <Lock className="h-4 w-4 text-gray-600" />
      default:
        return <Globe className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    if (startDate === endDate) {
      return formatDate(startDate)
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  const isOwner = album?.user_id === user?.id

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Failed to load album</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <div className="mt-4 space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRetryCount(prev => prev + 1)
                    fetchAlbumData()
                  }}
                  disabled={loading}
                >
                  {loading ? 'Retrying...' : retryCount > 0 ? `Try Again (${retryCount + 1})` : 'Try Again'}
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
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">Album not found</p>
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
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 min-w-0">
            {/* Mobile-first title layout */}
            <div className="space-y-3 mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight break-words">
                {album.title}
              </h1>
              <Badge
                variant={album.visibility === 'public' ? 'default' : 'secondary'}
                className="flex items-center gap-1 w-fit"
              >
                {getVisibilityIcon(album.visibility)}
                <span className="capitalize">{album.visibility}</span>
              </Badge>
            </div>

            {album.description && (
              <p className="text-gray-600 text-base md:text-lg mb-6 leading-relaxed">{album.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
              {album.location_name && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{album.location_name}</span>
                </div>
              )}

              {(album.start_date || album.end_date) && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {album.start_date && album.end_date
                      ? formatDateRange(album.start_date, album.end_date)
                      : album.start_date
                        ? formatDate(album.start_date)
                        : album.end_date && formatDate(album.end_date)
                    }
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Camera className="h-4 w-4" />
                <span>{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {album.tags && album.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {album.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Social Features */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
              <LikeButton albumId={album.id} />
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: album.title,
                      text: album.description || `Check out this album: ${album.title}`,
                      url: window.location.href,
                    })
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                  }
                }}
              >
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isOwner && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href={`/albums/${album.id}/edit`}>
                  <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Album
                  </Button>
                </Link>

                <Link href={`/albums/${album.id}/upload`}>
                  <Button size="sm" className="min-h-[44px] w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                </Link>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto">
                  <MoreHorizontal className="h-4 w-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">More Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Share className="mr-2 h-4 w-4" />
                  <span>Share Album</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Download All</span>
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={handleDeleteAlbum}
                    disabled={deleteLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>{deleteLoading ? 'Deleting...' : 'Delete Album'}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length > 1 && isOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Reorder Photos</span>
            </div>
            <span className="text-sm text-blue-700 leading-relaxed">
              Drag and drop photos to reorder them in your album
            </span>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
              <p className="text-gray-600 mb-6">
                {isOwner
                  ? 'Start uploading photos to bring your album to life.'
                  : 'This album doesn\'t have any photos yet.'
                }
              </p>
              {isOwner && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <PhotoGrid
            photos={photos}
            columns={5}
            showCaptions={true}
            albumId={album.id}
            isOwner={isOwner}
            currentCoverPhotoUrl={album.cover_photo_url}
            onCoverPhotoSet={handleSetCoverPhoto}
            onPhotosReorder={handlePhotosReorder}
            allowReordering={true}
          />
        </div>
      )}

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <Comments albumId={album.id} />
        </CardContent>
      </Card>

      {/* Album Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Album Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">Created:</span>
              <span className="ml-2 text-gray-600">{formatDate(album.created_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Last updated:</span>
              <span className="ml-2 text-gray-600">{formatDate(album.updated_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Photos:</span>
              <span className="ml-2 text-gray-600">{photos.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Visibility:</span>
              <span className="ml-2 text-gray-600 capitalize">{album.visibility}</span>
            </div>
          </div>

          {album.user && (
            <div className="pt-4 border-t">
              <span className="font-medium text-gray-900">Created by:</span>
              <span className="ml-2 text-gray-600">
                {album.user.display_name || album.user.username}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}