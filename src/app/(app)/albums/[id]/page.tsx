'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
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
  GripVertical,
  Star,
  Check
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
import { log } from '@/lib/utils/logger'
import { LikeButton } from '@/components/social/LikeButton'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { useFollows } from '@/lib/hooks/useFollows'
import { Native } from '@/lib/utils/native'
import { getPhotoUrl } from '@/lib/utils/photo-url'

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
  const [isSelectingFavorites, setIsSelectingFavorites] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [isPrivateContent, setIsPrivateContent] = useState(false)
  const supabase = createClient()
  const { getFollowStatus } = useFollows()

  const fetchAlbumData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch album details - first get album
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', params.id)
        .single()

      if (albumError) {
        throw albumError
      }

      // Then fetch user data separately - don't fail if user fetch fails
      let userData = null
      try {
        const { data, error: userError } = await supabase
          .from('users')
          .select('username, avatar_url, display_name')
          .eq('id', albumData.user_id)
          .single()

        if (!userError) {
          userData = data
        }
      } catch {
        // Don't throw - album can display without user info
      }

      // Merge user data into album
      if (userData) {
        ;(albumData as typeof albumData & { user: typeof userData }).user = userData
      }

      // Check album privacy
      const isOwner = albumData.user_id === user?.id

      if (!isOwner) {
        // Check album-level visibility
        if (albumData.visibility === 'private') {
          throw new Error('You do not have permission to view this album')
        }

        // Check friends-only albums
        if (albumData.visibility === 'friends') {
          const followStatus = await getFollowStatus(albumData.user_id)
          if (followStatus !== 'following') {
            throw new Error('This album is only visible to friends')
          }
        }
      }

      setAlbum(albumData)
      setIsPrivateContent(false)

      // Fetch photos for this album - without ordering to avoid column name errors
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', params.id)

      if (photosError) {
        // Don't throw - draft albums might have no photos or RLS issues
        setPhotos([])
      } else {
        setPhotos(photosData || [])
      }
    } catch (err) {
      // Safely extract error message
      let errorMessage = 'Unknown error occurred'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Handle Supabase error objects
        const supabaseErr = err as { message?: string; error?: { message?: string }; hint?: string; details?: string; code?: string }
        errorMessage = supabaseErr.message ||
                      supabaseErr.error?.message ||
                      supabaseErr.hint ||
                      JSON.stringify(err)
      }

      log.error('Failed to fetch album details', {
        component: 'AlbumViewPage',
        action: 'fetchAlbum',
        albumId: Array.isArray(params.id) ? params.id[0] : params.id,
        userId: user?.id,
        retryCount: retryCount || 0,
        errorMessage: errorMessage
      }, err instanceof Error ? err : new Error(errorMessage))

      let displayMessage = 'Failed to load album'
      let canRetry = false

      // Specific error handling
      const msg = errorMessage.toLowerCase()
      if (msg.includes('permission') || msg.includes('visible to friends')) {
        displayMessage = errorMessage
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
        displayMessage = 'Network error. Please check your connection.'
        canRetry = true
      } else if (msg.includes('json')) {
        displayMessage = 'Data format error. The album data may be corrupted.'
        canRetry = true
      } else if (msg.includes('timeout')) {
        displayMessage = 'Request timed out. Please try again.'
        canRetry = true
      } else {
        displayMessage = errorMessage
        canRetry = true
      }

      // Auto-retry once for network/transient errors
      if (canRetry && retryCount === 0) {
        setTimeout(() => {
          setRetryCount(1)
          fetchAlbumData()
        }, 1500)
        return
      }

      setError(displayMessage)
    } finally {
      setLoading(false)
    }
  }, [params.id, user?.id, supabase, getFollowStatus, retryCount])

  useEffect(() => {
    if (params.id && user) {
      fetchAlbumData()
    }
  }, [params.id, user, fetchAlbumData])

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
      log.error('Failed to delete album', {
        component: 'AlbumViewPage',
        action: 'deleteAlbum',
        albumId: album.id,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
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
      log.error('Failed to set cover photo', {
        component: 'AlbumViewPage',
        action: 'setCoverPhoto',
        albumId: album.id,
        photoUrl,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
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

  const handleToggleFavorite = (photoUrl: string) => {
    if (selectedFavorites.includes(photoUrl)) {
      setSelectedFavorites(prev => prev.filter(url => url !== photoUrl))
    } else if (selectedFavorites.length < 3) {
      setSelectedFavorites(prev => [...prev, photoUrl])
    }
  }

  const handleSaveFavorites = async () => {
    if (!album) return

    try {
      setFavoritesLoading(true)

      const { error } = await supabase
        .from('albums')
        .update({ favorite_photo_urls: selectedFavorites })
        .eq('id', album.id)

      if (error) throw error

      // Update local state
      setAlbum(prev => prev ? { ...prev, favorite_photo_urls: selectedFavorites } : null)
      setIsSelectingFavorites(false)
    } catch (err) {
      log.error('Failed to save favorite photos', {
        component: 'AlbumViewPage',
        action: 'saveFavorites',
        albumId: album.id,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to save favorite photos')
    } finally {
      setFavoritesLoading(false)
    }
  }

  const handleCancelFavorites = () => {
    setSelectedFavorites([])
    setIsSelectingFavorites(false)
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4 text-green-600" />
      case 'followers':
        return <Users className="h-4 w-4 text-purple-600" />
      case 'friends':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'private':
        return <Lock className="h-4 w-4 text-gray-800" />
      default:
        return <Globe className="h-4 w-4 text-gray-800" />
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
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-red-600 font-medium text-lg">Unable to Load Album</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              {retryCount > 0 && (
                <p className="text-sm text-gray-600">
                  {retryCount === 1 ? 'Automatically retried once.' : `Retried ${retryCount} times.`} Still having issues? Check your connection.
                </p>
              )}
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  onClick={() => {
                    setError(null)
                    setRetryCount(prev => prev + 1)
                    fetchAlbumData()
                  }}
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? 'Retrying...' : 'Try Again'}
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
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-800">Album not found</p>
              <Link href="/albums" className="mt-4 inline-block">
                <Button variant="outline">Back to Albums</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show private account message if user doesn't have access
  if (isPrivateContent && album.user) {
    return (
      <div className="space-y-8">
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>

        <PrivateAccountMessage
          profile={album.user}
          showFollowButton={true}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/albums" className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900">
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
                {getVisibilityIcon(album.visibility || album.privacy)}
                <span className="capitalize">{album.visibility || album.privacy}</span>
              </Badge>
            </div>

            {album.description && (
              <p className="text-gray-800 text-base md:text-lg mb-6 leading-relaxed">{album.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-800 mb-6">
              {(album.location_name || album.country_code) && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{[album.location_name, album.country_code].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {(album.date_start || album.date_end) && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {album.date_start && album.date_end
                      ? formatDateRange(album.date_start, album.date_end)
                      : album.date_start
                        ? formatDate(album.date_start)
                        : album.date_end && formatDate(album.date_end)
                    }
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Camera className="h-4 w-4" />
                <span>{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
              </div>
            </div>


            {/* Social Features */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
              <LikeButton albumId={album.id} />
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-sm"
                onClick={async () => {
                  try {
                    await Native.share({
                      title: album.title,
                      text: album.description || `Check out this album: ${album.title}`,
                      url: window.location.href,
                    })
                  } catch (error) {
                    log.error('Share failed', {
                      component: 'AlbumDetailPage',
                      action: 'share',
                      albumId: album?.id
                    }, error instanceof Error ? error : new Error(String(error)))
                    // Fallback is handled internally by Native.share
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

                {photos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] w-full sm:w-auto"
                    onClick={() => setIsSelectingFavorites(true)}
                    disabled={isSelectingFavorites}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Select Favorites
                  </Button>
                )}

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
      {photos.length > 1 && isOwner && !isSelectingFavorites && (
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

      {/* Favorites Selection Mode */}
      {isSelectingFavorites && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-900">
                  Select Favorites ({selectedFavorites.length}/3)
                </span>
              </div>
              <span className="text-sm text-yellow-700 leading-relaxed">
                Choose up to 3 photos to show in your globe pin tooltip
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelFavorites}
                disabled={favoritesLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveFavorites}
                disabled={favoritesLoading || selectedFavorites.length === 0}
              >
                {favoritesLoading ? 'Saving...' : 'Save Favorites'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-16">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-amber-600" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isOwner ? 'Album saved to drafts' : 'No photos yet'}
              </h3>
              <p className="text-gray-800 mb-6">
                {isOwner
                  ? 'This album is saved as a draft. Upload photos to publish it to your feed and globe.'
                  : 'This album doesn\'t have any photos yet.'
                }
              </p>
              {isOwner && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : isSelectingFavorites ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => {
              const photoPath = photo.storage_path || photo.file_path
              const photoUrl = getPhotoUrl(photoPath)
              if (!photoPath || !photoUrl) return null

              return (
              <div
                key={photo.id}
                className="relative aspect-square cursor-pointer group"
                onClick={() => handleToggleFavorite(photoPath)}
              >
                <Image
                  src={photoUrl}
                  alt={photo.caption || 'Photo'}
                  fill
                  className={`object-cover rounded-lg transition-all duration-200 ${
                    selectedFavorites.includes(photoPath)
                      ? 'ring-4 ring-yellow-500 opacity-75'
                      : selectedFavorites.length >= 3
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:opacity-80'
                  }`}
                />

                {/* Selection Indicator */}
                {selectedFavorites.includes(photoPath) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* Selection Number */}
                {selectedFavorites.includes(photoPath) && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {selectedFavorites.indexOf(photoPath) + 1}
                  </div>
                )}

                {/* Disabled Overlay */}
                {!selectedFavorites.includes(photoPath) && selectedFavorites.length >= 3 && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Max 3 selected</span>
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <PhotoGrid
            photos={photos}
            columns={5}
            showCaptions={true}
            albumId={album.id}
            isOwner={isOwner}
            onPhotosReorder={handlePhotosReorder}
            allowReordering={true}
            currentCoverPhotoUrl={album.cover_photo_url}
            onCoverPhotoSet={handleSetCoverPhoto}
          />
        </div>
      )}


      {/* Album Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Album Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">Created:</span>
              <span className="ml-2 text-gray-800">{formatDate(album.created_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Last updated:</span>
              <span className="ml-2 text-gray-800">{formatDate(album.updated_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Photos:</span>
              <span className="ml-2 text-gray-800">{photos.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">Visibility:</span>
              <span className="ml-2 text-gray-800 capitalize">{album.visibility}</span>
            </div>
          </div>

          {album.user && (
            <div className="pt-4 border-t">
              <span className="font-medium text-gray-900">Created by:</span>
              <span className="ml-2 text-gray-800">
                {album.user.name || album.user.email}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}