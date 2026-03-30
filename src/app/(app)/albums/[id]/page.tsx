'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowLeft, Heart, MessageCircle, Globe, Bookmark, MapPin, Calendar, Share2, X, Check, Flag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album, Photo, User } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { Comments } from '@/components/social/Comments'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { BackButton } from '@/components/common/BackButton'
import { useFollows } from '@/lib/hooks/useFollows'
import { filterDuplicatePhotos } from '@/lib/utils/photo-deduplication'
import { toast } from 'sonner'
import { InteractivePhotoGallery } from '@/components/albums/InteractivePhotoGallery'
import { LiveViewers } from '@/components/albums/LiveViewers'
import { RelatedAlbums } from '@/components/albums/RelatedAlbums'
import { useLikes, useComments } from '@/lib/hooks/useSocial'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { ShareButton } from '@/components/albums/ShareButton'
import { SocialShareButtons } from '@/components/albums/SocialShareButtons'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useRecordAlbumView } from '@/lib/hooks/useAlbumViews'
import { AnimatedSkeleton } from '@/components/ui/AnimatedSkeleton'
import { useCollaborativeAlbum } from '@/lib/hooks/useCollaborativeAlbum'
import { ReportDialog } from '@/components/social/ReportDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'

export default function AlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrivateContent, setIsPrivateContent] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [redirectTimer, setRedirectTimer] = useState<number>(3)
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const supabase = createClient()
  const { getFollowStatus, follow, unfollow } = useFollows(album?.user_id)
  const [followLoading, setFollowLoading] = useState(false)
  const [followStatus, setFollowStatus] = useState<string>('not_following')

  // Show share prompt when album was just created
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setShowSharePrompt(true)
      // Clean URL without reload
      window.history.replaceState({}, '', `/albums/${params.id}`)
    }
  }, [searchParams, params.id])

  // Use likes hook for like functionality
  const { likes, isLiked, toggleLike } = useLikes(album?.id)

  // Use comments hook for comment count
  const { comments: albumComments } = useComments(album?.id)

  // Use favorites hook for save functionality
  const { isFavorited, toggleFavorite } = useFavorites({
    targetType: 'album',
    autoFetch: true
  })
  const isSaved = album?.id ? isFavorited(album.id, 'album') : false

  // Animation support - used for reduced motion preference in RelatedAlbums
  const prefersReducedMotion = useReducedMotion()

  // Track album view (deduplicated per user per day)
  useRecordAlbumView(album?.id, user?.id)

  // Collaborative album support
  const { collaborators } = useCollaborativeAlbum(album?.id)
  const activeCollaborators = collaborators.filter(c => c.status === 'accepted')

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is sufficient; adding full user object causes unnecessary re-renders
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

  const handleSaveClick = async () => {
    if (!user) {
      toast.error('Please log in to save albums')
      return
    }
    if (!album) return
    try {
      const saved = await toggleFavorite(album.id, 'album', {
        title: album.title,
        photo_url: album.cover_photo_url || undefined
      })
      toast.success(saved ? 'Album saved' : 'Album unsaved', { duration: 2000, position: 'bottom-center' })
    } catch {
      toast.error('Failed to save album', { duration: 3000, position: 'bottom-center' })
    }
  }

  const isOwner = album?.user_id === user?.id
  const [reportOpen, setReportOpen] = useState(false)

  // Show deleted album message
  if (isDeleted) {
    return (
      <div className="min-h-screen bg-stone-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackRoute="/feed" />
          <Card className="border-olive-200 bg-olive-50 mt-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-olive-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-olive-600" />
                </div>
                <div>
                  <p className="text-olive-900 font-medium text-lg">Album Deleted</p>
                  <p className="text-olive-700 text-sm mt-1">
                    This album has been deleted and is no longer available.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-stone-600">
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
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <AnimatedSkeleton className="aspect-[4/3] w-full rounded-2xl" variant="rounded" />
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
                      className="flex-1"
                    >
                      <AnimatedSkeleton className="aspect-square w-full rounded-lg" variant="rounded" />
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1">
                <AnimatedSkeleton className="h-96 w-full rounded-xl" variant="rounded" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-stone-600 hover:text-stone-900"
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
      <div className="min-h-screen bg-stone-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackRoute="/feed" />
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-stone-800">Album not found</p>
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
        <div className="min-h-screen bg-stone-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <BackButton fallbackRoute="/feed" />
            <Card className="border-olive-200 bg-olive-50 mt-6">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-olive-900 font-medium text-lg">Login Required</p>
                    <p className="text-olive-700 text-sm mt-1">
                      This album is {album.visibility}. Please log in to view it.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <Link href={`/login?redirect=/albums/${album.id}`}>
                      <Button className="bg-olive-600 hover:bg-olive-700">Log In</Button>
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
        <div className="min-h-screen bg-stone-50 py-8 px-4">
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

  // Format date for mobile header
  const formatDate = () => {
    const dateStr = album.date_start
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return null }
  }

  return (
    <div className="min-h-screen bg-[#F5F7F0] dark:bg-black pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {photos.length > 0 ? (
          <>
            {/* ── Share Prompt (after album creation) ── */}
            {showSharePrompt && (
              <motion.div
                className="mb-5 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800/40 rounded-xl p-4 flex items-center justify-between gap-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-olive-100 dark:bg-olive-800/40 flex items-center justify-center shrink-0">
                    <Share2 className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-olive-900 dark:text-olive-100">Album created!</p>
                    <p className="text-xs text-olive-600 dark:text-olive-400">Share it with friends and fellow travelers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-olive-600 hover:bg-olive-700 text-white rounded-lg h-8 px-3 text-xs gap-1.5"
                    onClick={async () => {
                      const url = window.location.href
                      if (navigator.share) {
                        try {
                          await navigator.share({ title: album?.title, url })
                        } catch { /* cancelled */ }
                      } else {
                        await navigator.clipboard.writeText(url)
                        setShareCopied(true)
                        setTimeout(() => setShareCopied(false), 2000)
                      }
                    }}
                  >
                    {shareCopied ? <><Check className="h-3 w-3" /> Copied</> : <><Share2 className="h-3 w-3" /> Share</>}
                  </Button>
                  <button onClick={() => setShowSharePrompt(false)} className="text-olive-400 hover:text-olive-600 dark:hover:text-olive-300 cursor-pointer transition-all duration-200 active:scale-[0.97] p-1 rounded-md focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Album Header ── */}
            <motion.div
              className="mb-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* User row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {albumUser && (
                    <Link href={`/profile/${albumUser.username}`} className="shrink-0 cursor-pointer">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-olive-400 to-olive-600 flex items-center justify-center ring-2 ring-white dark:ring-stone-800 shadow-sm overflow-hidden relative">
                        {albumUser.avatar_url ? (
                          <Image src={albumUser.avatar_url} alt="" fill className="object-cover" sizes="40px" />
                        ) : (
                          <span className="text-white text-sm font-semibold">
                            {albumUser.display_name?.[0] || albumUser.username?.[0] || 'U'}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                  <div className="min-w-0">
                    {albumUser && (
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {albumUser.display_name || albumUser.username}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                      {albumUser && <span>@{albumUser.username}</span>}
                      {formatDate() && (
                        <>
                          <span className="text-stone-300 dark:text-stone-600">&middot;</span>
                          <span>{formatDate()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Follow button (desktop) */}
                {!isOwner && albumUser && (
                  <div className="hidden sm:block">
                    <Button
                      size="sm"
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={cn(
                        "rounded-full px-5 h-9 text-sm font-medium",
                        followStatus === 'following'
                          ? "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 border border-stone-200 dark:border-stone-700"
                          : "bg-olive-600 hover:bg-olive-700 text-white"
                      )}
                    >
                      {followLoading ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : followStatus === 'following' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Title + metadata */}
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white leading-tight mb-2">
                {album.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                {album.location_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-olive-500" />
                    {album.location_name}
                  </span>
                )}
                {album.date_start && album.date_end && album.date_start !== album.date_end && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-olive-500" />
                    {new Date(album.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(album.date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {photos.length > 0 && (
                  <span className="text-stone-400 dark:text-stone-500">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
                )}
              </div>

              {album.description && (
                <p className="mt-3 text-stone-600 dark:text-stone-400 text-sm leading-relaxed max-w-2xl">
                  {album.description}
                </p>
              )}

              {/* Collaborators */}
              {activeCollaborators.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-stone-400">with</span>
                  <div className="flex -space-x-1.5">
                    {activeCollaborators.slice(0, 6).map((c) => (
                      <Avatar key={c.id} className="h-6 w-6 ring-2 ring-white dark:ring-stone-900">
                        <AvatarImage src={getPhotoUrl(c.user?.avatar_url) || undefined} />
                        <AvatarFallback className="text-[8px] bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400">
                          {c.user?.display_name?.[0] || c.user?.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {activeCollaborators.map(c => c.user?.display_name || c.user?.username).filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </motion.div>

            {/* ── Photo Gallery (full width) ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <InteractivePhotoGallery
                photos={photos}
                albumTitle={album.title}
                albumId={album.id}
              />
            </motion.div>

            {/* ── Engagement Bar ── */}
            <motion.div
              className="flex items-center justify-between py-3 mt-3 border-y border-stone-200/60 dark:border-stone-700/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-5">
                {/* Like */}
                <button
                  onClick={handleLikeClick}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded-md p-1 -m-1",
                    isLiked ? "text-red-500" : "text-stone-600 dark:text-stone-400 hover:text-red-500"
                  )}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                  <span>{likes.length}</span>
                </button>

                {/* Comment */}
                <button
                  onClick={handleCommentClick}
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded-md p-1 -m-1"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{albumComments.length}</span>
                </button>

                {/* Share */}
                <div className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400">
                  <ShareButton
                    albumId={album.id}
                    albumTitle={album.title}
                    variant="icon"
                    className="!p-0"
                  />
                </div>

                {/* Globe */}
                {album.latitude && album.longitude && (
                  <button
                    onClick={handleGlobeClick}
                    className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-olive-600 transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded-md p-1 -m-1"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="hidden sm:inline">Globe</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Save */}
                {!isOwner && (
                  <button
                    onClick={handleSaveClick}
                    className={cn(
                      "transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded-md p-1",
                      isSaved ? "text-olive-500" : "text-stone-400 dark:text-stone-500 hover:text-stone-600"
                    )}
                  >
                    <Bookmark className={cn("h-5 w-5", isSaved && "fill-current")} />
                  </button>
                )}

                {/* Report */}
                {!isOwner && user && (
                  <button
                    onClick={() => setReportOpen(true)}
                    className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded-md p-1"
                    title="Report album"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}

                {/* Owner actions */}
                {isOwner && (
                  <Link href={`/albums/${album.id}/edit`} className="cursor-pointer">
                    <Button variant="ghost" size="sm" className="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 cursor-pointer active:scale-[0.97] transition-all duration-200">
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>

            {/* ── Social Share Buttons ── */}
            <motion.div
              className="py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Share this album</p>
              <SocialShareButtons
                albumId={album.id}
                albumTitle={album.title}
                albumCoverUrl={album.cover_photo_url || undefined}
                locationName={album.location_name || undefined}
              />
            </motion.div>

            <LiveViewers albumId={album.id} userId={user?.id} />

            {/* ── Comments ── */}
            <motion.div
              id="comments-section"
              className="mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Comments albumId={album.id} />
            </motion.div>

            {/* ── Related Albums ── */}
            {albumUser && (
              <motion.div
                className="mt-12"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.2 }}
              >
                <RelatedAlbums
                  userId={album.user_id}
                  currentAlbumId={album.id}
                  username={albumUser.username || albumUser.display_name || 'User'}
                />
              </motion.div>
            )}
          </>
        ) : (
          /* No Photos Empty State */
          <div className="bg-white dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700/60 p-8 sm:p-16">
            <div className="text-center max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-white mb-3">
                {isOwner ? 'Start Your Journey' : 'No photos yet'}
              </h3>
              <p className="text-stone-600 dark:text-stone-400 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                {isOwner
                  ? 'Upload your first photo to bring this adventure to life.'
                  : "This album doesn't have any photos yet."}
              </p>
              {isOwner && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button size="lg" className="bg-olive-600 hover:bg-olive-700 text-white">
                    Upload Photos
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Action Bar */}
      <div className="sm:hidden fixed left-4 right-4 z-40 fab-position">
        <motion.div
          className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-2xl shadow-lg border border-stone-200/60 dark:border-stone-700/40 px-4 py-2.5"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="grid grid-cols-5 gap-1">
            <motion.button
              onClick={handleLikeClick}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
                isLiked ? "text-red-500" : "text-stone-600 dark:text-stone-400"
              )}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
              <span className="text-[10px] font-medium">{likes.length}</span>
            </motion.button>

            <motion.button
              onClick={handleCommentClick}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-stone-600 dark:text-stone-400 transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]"
              whileTap={{ scale: 0.9 }}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="text-[10px] font-medium">Comment</span>
            </motion.button>

            <div className="flex flex-col items-center gap-1 py-2 rounded-xl text-stone-600 dark:text-stone-400">
              <ShareButton albumId={album.id} albumTitle={album.title} variant="icon" className="!p-0" />
              <span className="text-[10px] font-medium">Share</span>
            </div>

            {!isOwner && (
              <motion.button
                onClick={handleSaveClick}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
                  isSaved ? "text-olive-500" : "text-stone-600 dark:text-stone-400"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <Bookmark className={cn("h-6 w-6", isSaved && "fill-current")} />
                <span className="text-[10px] font-medium">Save</span>
              </motion.button>
            )}

            {album.latitude && album.longitude && (
              <motion.button
                onClick={handleGlobeClick}
                className="flex flex-col items-center gap-1 py-2 rounded-xl text-olive-600 transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]"
                whileTap={{ scale: 0.9 }}
              >
                <Globe className="h-6 w-6" />
                <span className="text-[10px] font-medium">Globe</span>
              </motion.button>
            )}

            {!isOwner && user && (
              <motion.button
                onClick={() => setReportOpen(true)}
                className="flex flex-col items-center gap-1 py-2 rounded-xl text-stone-400 dark:text-stone-500 transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]"
                whileTap={{ scale: 0.9 }}
              >
                <Flag className="h-5 w-5" />
                <span className="text-[10px] font-medium">Report</span>
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Report Dialog */}
      {album && !isOwner && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="album"
          targetId={album.id}
          targetUserId={album.user_id}
        />
      )}
    </div>
  )
}
