'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
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
import { deletePhoto } from './actions'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { useFollows } from '@/lib/hooks/useFollows'
import { Native } from '@/lib/utils/native'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { UserLink } from '@/components/social/UserLink'
import { EditCoverPositionButton } from '@/components/albums/EditCoverPositionButton'
import { ShareAlbumDialog } from '@/components/albums/ShareAlbumDialog'
import { filterDuplicatePhotos } from '@/lib/utils/photo-deduplication'
import { formatDate as formatDateWithPrivacy, formatDateRange as formatDateRangeWithPrivacy } from '@/lib/utils/date-formatting'

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
          // If not logged in, show login prompt instead of error
          if (!user) {
            setIsPrivateContent(true)
            setAlbum(albumData)
            return
          }
          throw new Error('You do not have permission to view this album')
        }

        // Check friends-only albums
        if (albumData.visibility === 'friends') {
          // If not logged in, show login prompt
          if (!user) {
            setIsPrivateContent(true)
            setAlbum(albumData)
            return
          }

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
        // Filter out duplicate photos - keep only the earliest photo for each hash
        const filteredPhotos = filterDuplicatePhotos(photosData || [])
        setPhotos(filteredPhotos)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, user?.id, supabase, getFollowStatus, retryCount])

  useEffect(() => {
    // Fetch album data even if not logged in (for public albums)
    if (params.id) {
      fetchAlbumData()
    }
  }, [params.id, fetchAlbumData])

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

  const handleDeletePhoto = async (photoId: string) => {
    if (!album) return

    try {
      const result = await deletePhoto(photoId, album.id)

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete photo')
      }

      // Refresh album data to get the source of truth from database
      // This ensures cover photo is updated correctly and no race conditions
      await fetchAlbumData()
    } catch (err) {
      log.error('Failed to delete photo', {
        component: 'AlbumViewPage',
        action: 'deletePhoto',
        albumId: album.id,
        photoId,
        userId: user?.id
      }, err instanceof Error ? err : new Error(String(err)))
      throw err // Re-throw to let PhotoGrid handle the error display
    }
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

  // Legacy formatDate for created_at/updated_at (always show exact dates)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Privacy-aware date formatting for album dates
  const formatAlbumDate = (dateString: string) => {
    return formatDateWithPrivacy(dateString, {
      showExactDates: album?.show_exact_dates ?? false
    })
  }

  const formatAlbumDateRange = (startDate: string, endDate: string) => {
    return formatDateRangeWithPrivacy(startDate, endDate, {
      showExactDates: album?.show_exact_dates ?? false
    })
  }

  const isOwner = album?.user_id === user?.id

  // Smart back button handler - preserves scroll position using native browser back
  const handleBackClick = useCallback(() => {
    // Check if there's history to go back to
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      // Use native window.history.back() to preserve scroll position
      window.history.back()
    } else {
      // Default to feed if no referrer or external referrer
      router.push('/feed')
    }
  }, [router])

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
        <button
          onClick={handleBackClick}
          className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>

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
        <button
          onClick={handleBackClick}
          className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>

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

  // Show private/login message if user doesn't have access
  if (isPrivateContent && album) {
    // Non-logged-in users viewing private/friends content
    if (!user) {
      return (
        <div className="space-y-8">
          <button
            onClick={handleBackClick}
            className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-blue-900 font-medium text-lg">Login Required</p>
                  <p className="text-blue-700 text-sm mt-1">
                    This album is {album.visibility}. Please log in to view it.
                  </p>
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <Link href={`/login?redirect=/albums/${album.id}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline">Home</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Logged-in users viewing private content they don't have access to
    if (album.user) {
      return (
        <div className="space-y-8">
          <button
            onClick={handleBackClick}
            className="inline-flex items-center text-sm text-gray-800 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>

          <PrivateAccountMessage
            profile={album.user}
            showFollowButton={true}
          />
        </div>
      )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={handleBackClick}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </button>

      {/* Hero Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="relative">
          {/* Cover Image */}
          {album.cover_photo_url && (
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-100 to-purple-100">
              <Image
                src={getPhotoUrl(album.cover_photo_url) || ''}
                alt={album.title}
                fill
                className="object-cover"
                style={{
                  objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%`
                }}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />

              {/* Adjust Cover Button Overlay */}
              {isOwner && (
                <div className="absolute top-4 right-4">
                  <EditCoverPositionButton
                    albumId={album.id}
                    coverImageUrl={getPhotoUrl(album.cover_photo_url) || ''}
                    currentPosition={{
                      position: album.cover_photo_position,
                      xOffset: album.cover_photo_x_offset,
                      yOffset: album.cover_photo_y_offset
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Album Info Overlay */}
          <CardContent className={album.cover_photo_url ? "absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white" : "p-6 md:p-8"}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                    {album.title}
                  </h1>
                  <Badge
                    variant={album.visibility === 'public' ? 'default' : 'secondary'}
                    className={album.cover_photo_url ? "bg-white/20 backdrop-blur-sm border-white/30 text-white" : ""}
                  >
                    {getVisibilityIcon(album.visibility || album.privacy)}
                    <span className="capitalize ml-1">{album.visibility || album.privacy}</span>
                  </Badge>
                </div>

                {album.description && (
                  <p className={`text-lg leading-relaxed max-w-3xl ${album.cover_photo_url ? 'text-white/95' : 'text-gray-700'}`}>
                    {album.description}
                  </p>
                )}

                {/* Metadata */}
                <div className={`flex flex-wrap gap-4 text-sm ${album.cover_photo_url ? 'text-white/90' : 'text-gray-600'}`}>
                  {(album.location_name || album.country_code) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{[album.location_name, album.country_code].filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  {(album.date_start || album.date_end) && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {album.date_start && album.date_end
                          ? formatAlbumDateRange(album.date_start, album.date_end)
                          : album.date_start
                            ? formatAlbumDate(album.date_start)
                            : album.date_end && formatAlbumDate(album.date_end)
                        }
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4" />
                    <span>{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>

        {/* Actions Bar */}
        <CardContent className="pt-0 pb-6 px-6 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            {/* Social Actions */}
            <div className="flex items-center gap-2">
              <LikeButton albumId={album.id} showCount={false} />

              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
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
                  }
                }}
              >
                <Share className="h-4 w-4" />
                <span>Share</span>
              </Button>

              {isOwner && (
                <ShareAlbumDialog
                  albumId={album.id}
                  albumTitle={album.title}
                />
              )}
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="flex items-center gap-2 ml-auto">
                <Link href={`/albums/${album.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>

                {photos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectingFavorites(true)}
                    disabled={isSelectingFavorites}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Favorites
                  </Button>
                )}

                <Link href={`/albums/${album.id}/upload`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={handleDeleteAlbum}
                      disabled={deleteLoading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>{deleteLoading ? 'Deleting...' : 'Delete Album'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Reorder Hint */}
      {photos.length > 1 && isOwner && !isSelectingFavorites && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Drag and drop photos to reorder
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites Selection Mode */}
      {isSelectingFavorites && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-600" />
                <div>
                  <span className="text-sm font-semibold text-yellow-900">
                    Select Favorites ({selectedFavorites.length}/3)
                  </span>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Choose up to 3 photos for your globe pin tooltip
                  </p>
                </div>
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
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {favoritesLoading ? 'Saving...' : 'Save Favorites'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos Section */}
      {photos.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-20">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isOwner ? 'No photos yet' : 'No photos in this album'}
              </h3>
              <p className="text-gray-600 mb-6">
                {isOwner
                  ? 'Upload photos to bring your adventure to life and share it with the world.'
                  : 'This album doesn\'t have any photos yet.'}
              </p>
              {isOwner && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : isSelectingFavorites ? (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-6">
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

                  {selectedFavorites.includes(photoPath) && (
                    <>
                      <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <div className="absolute top-2 left-2 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        {selectedFavorites.indexOf(photoPath) + 1}
                      </div>
                    </>
                  )}

                  {!selectedFavorites.includes(photoPath) && selectedFavorites.length >= 3 && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Max 3</span>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-6">
            <PhotoGrid
              photos={photos}
              columns={5}
              showCaptions={true}
              albumId={album.id}
              isOwner={isOwner}
              onPhotosReorder={handlePhotosReorder}
              onPhotoDelete={handleDeletePhoto}
              allowReordering={true}
              currentCoverPhotoUrl={album.cover_photo_url}
              onCoverPhotoSet={handleSetCoverPhoto}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}