'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Album, Photo, User } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { Comments } from '@/components/social/Comments'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { BackButton } from '@/components/common/BackButton'
import { useFollows } from '@/lib/hooks/useFollows'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { filterDuplicatePhotos } from '@/lib/utils/photo-deduplication'
import { toast } from 'sonner'
import { PhotoCarousel } from '@/components/albums/PhotoCarousel'
import { ThumbnailStrip } from '@/components/albums/ThumbnailStrip'
import { AlbumInfoSidebar } from '@/components/albums/AlbumInfoSidebar'
import { RelatedAlbums } from '@/components/albums/RelatedAlbums'
import { useLikes } from '@/lib/hooks/useSocial'

export default function AlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isPrivateContent, setIsPrivateContent] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [redirectTimer, setRedirectTimer] = useState<number>(3)
  const supabase = createClient()
  const { getFollowStatus, follow, unfollow, followStatus: hookFollowStatus } = useFollows(album?.user_id)
  const [followLoading, setFollowLoading] = useState(false)
  const [followStatus, setFollowStatus] = useState<string>('not_following')

  // Use likes hook for like functionality
  const { likes, isLiked, toggleLike } = useLikes(album?.id)

  const fetchAlbumData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch album details
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', params.id)
        .single()

      if (albumError) {
        if (albumError.code === 'PGRST116' || albumError.message?.includes('No rows')) {
          setIsDeleted(true)
          setLoading(false)
          return
        }
        throw albumError
      }

      // Fetch user data separately
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
        if (albumData.visibility === 'private') {
          if (!user) {
            setIsPrivateContent(true)
            setAlbum(albumData)
            return
          }
          throw new Error('You do not have permission to view this album')
        }

        if (albumData.visibility === 'friends') {
          if (!user) {
            setIsPrivateContent(true)
            setAlbum(albumData)
            return
          }

          const status = await getFollowStatus(albumData.user_id)
          if (status !== 'following') {
            throw new Error('This album is only visible to friends')
          }
        }
      }

      setAlbum(albumData)
      setIsPrivateContent(false)

      // Fetch photos for this album
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', params.id)

      if (photosError) {
        setPhotos([])
      } else {
        const filteredPhotos = filterDuplicatePhotos(photosData || [])
        setPhotos(filteredPhotos)
      }
    } catch (err) {
      let errorMessage = 'Unknown error occurred'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }

      log.error('Failed to fetch album details', {
        component: 'AlbumDetailPage',
        action: 'fetchAlbum',
        albumId: Array.isArray(params.id) ? params.id[0] : params.id,
        userId: user?.id,
        errorMessage: errorMessage
      }, err instanceof Error ? err : new Error(errorMessage))

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [params.id, user?.id, supabase, getFollowStatus])

  useEffect(() => {
    if (params.id) {
      fetchAlbumData()
    }
  }, [params.id, fetchAlbumData])

  // Update follow status
  useEffect(() => {
    if (album?.user_id && user?.id) {
      getFollowStatus(album.user_id).then(setFollowStatus)
    }
  }, [album?.user_id, user?.id, getFollowStatus])

  // Set up real-time subscription for album changes
  useEffect(() => {
    if (!params.id) return

    const channel = supabase
      .channel(`album-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'albums',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setIsDeleted(true)
            toast.error('This album has been deleted', {
              description: 'Redirecting to feed...'
            })
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedAlbum = payload.new as Album
            const isOwner = updatedAlbum.user_id === user?.id
            if (!isOwner && updatedAlbum.visibility === 'private') {
              toast.warning('Album visibility changed', {
                description: 'This album is now private. Redirecting...'
              })
              setIsPrivateContent(true)
              setTimeout(() => router.push('/feed'), 2000)
            } else {
              setAlbum(updatedAlbum)
              toast.info('Album updated')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id, user?.id, router, supabase])

  // Handle redirect timer for deleted albums
  useEffect(() => {
    if (isDeleted && redirectTimer > 0) {
      const timer = setTimeout(() => {
        setRedirectTimer(prev => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (isDeleted && redirectTimer === 0) {
      router.push('/feed')
    }
  }, [isDeleted, redirectTimer, router])

  const handleFollowClick = async () => {
    if (!album?.user_id || followLoading) return

    setFollowLoading(true)
    try {
      if (followStatus === 'following') {
        await unfollow(album.user_id)
        setFollowStatus('not_following')
        toast.success('Unfollowed user')
      } else {
        await follow(album.user_id)
        const newStatus = await getFollowStatus(album.user_id)
        setFollowStatus(newStatus)
        toast.success(newStatus === 'pending' ? 'Follow request sent' : 'Following user')
      }
    } catch (err) {
      log.error('Failed to update follow status', {
        component: 'AlbumDetailPage',
        action: 'handleFollowClick'
      }, err instanceof Error ? err : new Error(String(err)))
      toast.error('Failed to update follow status')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleLikeClick = async () => {
    if (!user) {
      toast.error('Please log in to like albums')
      return
    }
    await toggleLike()
  }

  const handleCommentClick = () => {
    const commentsSection = document.getElementById('comments-section')
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleGlobeClick = () => {
    if (album?.latitude && album?.longitude) {
      router.push(`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`)
    }
  }

  const isOwner = album?.user_id === user?.id

  // Show deleted album message
  if (isDeleted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackRoute="/feed" />
          <Card className="border-amber-200 bg-amber-50 mt-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-amber-900 font-medium text-lg">Album Deleted</p>
                  <p className="text-amber-700 text-sm mt-1">
                    This album has been deleted and is no longer available.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-gray-600">
                    Redirecting to feed in {redirectTimer} seconds...
                  </p>
                  <Link href="/feed">
                    <Button variant="outline" className="min-w-[120px]">
                      Go to Feed Now
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="aspect-[4/3] bg-gray-200 rounded-lg"></div>
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex-1 aspect-square bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-96 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-600 hover:text-gray-900"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-red-600 font-medium text-lg">Unable to Load Album</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <Button onClick={fetchAlbumData} disabled={loading} className="min-w-[120px]">
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
        </div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackRoute="/feed" />
          <Card className="mt-6">
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
      </div>
    )
  }

  // Show private/login message
  if (isPrivateContent && album) {
    if (!user) {
      return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <BackButton fallbackRoute="/feed" />
            <Card className="border-blue-200 bg-blue-50 mt-6">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-blue-900 font-medium text-lg">Login Required</p>
                    <p className="text-blue-700 text-sm mt-1">
                      This album is {album.visibility}. Please log in to view it.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <Link href={`/login?redirect=/albums/${album.id}`}>
                      <Button className="bg-blue-600 hover:bg-blue-700">Log In</Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline">Home</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    if (album.user) {
      return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <BackButton fallbackRoute="/feed" />
            <div className="mt-6">
              <PrivateAccountMessage profile={album.user} showFollowButton={true} />
            </div>
          </div>
        </div>
      )
    }
  }

  const albumUser = album.user || (album as unknown as { users?: User }).users

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {photos.length > 0 ? (
          <>
            {/* Two-Column Layout: Photo Display + Sidebar (60/40 split) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-8">
              {/* Left: Photo Carousel and Thumbnails (60%) */}
              <div className="md:col-span-2 lg:col-span-2 space-y-4 sm:space-y-6">
                <PhotoCarousel
                  photos={photos}
                  currentIndex={currentPhotoIndex}
                  onPhotoChange={setCurrentPhotoIndex}
                />
                <ThumbnailStrip
                  photos={photos}
                  currentIndex={currentPhotoIndex}
                  onThumbnailClick={setCurrentPhotoIndex}
                />

                {/* Comments Section */}
                <div id="comments-section">
                  <Comments albumId={album.id} />
                </div>
              </div>

              {/* Right: Album Info Sidebar (40%) */}
              <div className="md:col-span-1 lg:col-span-1">
                <div className="md:sticky md:top-20 lg:top-24">
                  <AlbumInfoSidebar
                    album={album}
                    user={albumUser}
                    isOwnAlbum={isOwner}
                    onFollowClick={handleFollowClick}
                    followStatus={followStatus}
                    followLoading={followLoading}
                    likeCount={likes.length}
                    commentCount={0}
                    isLiked={isLiked}
                    onLikeClick={handleLikeClick}
                    onCommentClick={handleCommentClick}
                    onGlobeClick={handleGlobeClick}
                  />
                </div>
              </div>
            </div>

            {/* Related Albums - Full width below */}
            {albumUser && (
              <div className="mt-12">
                <RelatedAlbums
                  userId={album.user_id}
                  currentAlbumId={album.id}
                  username={albumUser.username || albumUser.display_name || 'User'}
                />
              </div>
            )}
          </>
        ) : (
          /* No Photos Empty State */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16">
            <div className="text-center max-w-md mx-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {isOwner ? 'Start Your Journey' : 'No photos yet'}
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {isOwner
                  ? 'Upload your first photo to bring this adventure to life.'
                  : "This album doesn't have any photos yet."}
              </p>
              {isOwner && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700">
                    Upload Photos
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
