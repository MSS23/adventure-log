'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowLeft, Heart, MessageCircle, Globe, Bookmark, MapPin, Calendar, Share2, X, Check, Flag, Camera, Lock, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Album, Photo } from '@/types/database'
import { log } from '@/lib/utils/logger'
import { Comments } from '@/components/social/Comments'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { BackButton } from '@/components/common/BackButton'
import { useFollows } from '@/lib/hooks/useFollows'
import { filterDuplicatePhotos } from '@/lib/utils/photo-deduplication'
import { runQueryWithRetry, isNoRowsError } from '@/lib/utils/query-retry'
import { toast } from 'sonner'
import { InteractivePhotoGallery } from '@/components/albums/InteractivePhotoGallery'
import { LiveViewers } from '@/components/albums/LiveViewers'
import { RelatedAlbums } from '@/components/albums/RelatedAlbums'
import { useLikes, useComments } from '@/lib/hooks/useSocial'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { ShareButton } from '@/components/albums/ShareButton'
import { isPWAInstalled } from '@/lib/utils/pwa'
import { isNativePlatform } from '@/lib/api/client'
import { localizePath, getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useRecordAlbumView } from '@/lib/hooks/useAlbumViews'
import { AnimatedSkeleton } from '@/components/ui/AnimatedSkeleton'
import { useCollaborativeAlbum } from '@/lib/hooks/useCollaborativeAlbum'
import { ReportDialog } from '@/components/social/ReportDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { YouWereHereBadge } from '@/components/albums/YouWereHereBadge'
import { AlbumQualityNudges } from '@/components/albums/AlbumQualityNudges'
import { FavoriteAlbumToggle } from '@/components/albums/FavoriteAlbumToggle'
import { placeSlug } from '@/lib/utils/places'
import {
  formatTravelDateForViewer,
  formatTravelDateRangeForViewer,
} from '@/lib/utils/travel-date'

/**
 * Everything the album page needs for first paint, resolved by ONE React
 * Query so back-navigation and revisits serve from the 5-minute cache
 * instead of re-running the whole fetch waterfall (this was the last major
 * surface still on bare useState/useEffect).
 */
interface AlbumDetailData {
  album: Album | null
  photos: Photo[]
  isDeleted: boolean
  isPrivateContent: boolean
}

// Privacy verdicts are real answers, not transient failures — they must
// surface immediately instead of burning the cold-start retry schedule.
const TERMINAL_ALBUM_ERRORS = new Set([
  'You do not have permission to view this album',
  'This album is only visible to friends',
])

export function AlbumDetailView({ albumId }: { albumId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [redirectTimer, setRedirectTimer] = useState<number>(3)
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const supabase = createClient()
  // statusOnly + no target: this page renders a single Follow button and runs
  // its own follow-status effect below — skip the hook's eager viewer-wide
  // stats/lists queries, realtime channel, and duplicate status lookup.
  const { getFollowStatus, follow, unfollow } = useFollows(undefined, { statusOnly: true })
  const [followLoading, setFollowLoading] = useState(false)
  const [followStatus, setFollowStatus] = useState<string>('not_following')

  // Hide the fixed mobile floating action bar when running as an installed PWA
  // / native app — there a fixed bottom bar overlaps page content while
  // scrolling. The inline engagement bar still provides like/comment/share/fav.
  const [isStandalone, setIsStandalone] = useState(false)
  useEffect(() => {
    setIsStandalone(isPWAInstalled() || isNativePlatform())
  }, [])

  // Show share prompt when album was just created
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setShowSharePrompt(true)
      // Clean URL without reload
      window.history.replaceState({}, '', localizePath(`/albums/${albumId}`))
    }
  }, [searchParams, albumId])

  // Keyed on the viewer so a login/logout re-resolves privacy gating.
  const albumQueryKey = useMemo(
    () => ['album-detail', albumId, user?.id ?? null],
    [albumId, user?.id]
  )

  const {
    data: albumDetail,
    isPending: loading,
    isFetching: albumRefetching,
    error: albumQueryError,
    refetch: refetchAlbum,
  } = useQuery<AlbumDetailData>({
    queryKey: albumQueryKey,
    enabled: !!albumId,
    queryFn: async (): Promise<AlbumDetailData> => {
      // Fetch album details. Retried in place: a Supabase cold start on this
      // query used to strand the album page on the error card (same failure
      // mode the feed and globe timeline already guard against). A genuine
      // no-rows result must NOT retry — deleted albums should resolve fast.
      const { data: albumData, error: albumError } = await runQueryWithRetry(
        () =>
          supabase
            .from('albums')
            .select('*')
            .eq('id', albumId)
            .single(),
        { shouldRetry: (err) => !isNoRowsError(err) }
      )

      if (albumError) {
        if (isNoRowsError(albumError)) {
          return { album: null, photos: [], isDeleted: true, isPrivateContent: false }
        }
        throw albumError
      }

      // Kick off the photos query immediately — it only depends on albumId,
      // and RLS scopes the rows server-side, so it need not wait for the
      // byline fetch or the friends-visibility gate below. Serializing these
      // (album → user → follow check → photos) was most of the
      // time-to-first-photo on other people's albums.
      // order_index is the column all writers populate (display_order was a
      // never-written twin — sorting by it silently fell back to created_at).
      const photosPromise = runQueryWithRetry(() =>
        supabase
          .from('photos')
          .select('*')
          .eq('album_id', albumId)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true })
      )

      // Fetch user data separately (cold-start hardened like the album query;
      // the album can still display without the byline)
      let userData = null
      try {
        const { data, error: userError } = await runQueryWithRetry(() =>
          supabase
            .from('users')
            .select('username, avatar_url, display_name')
            .eq('id', albumData.user_id)
            .single()
        )

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
            return { album: albumData, photos: [], isDeleted: false, isPrivateContent: true }
          }
          throw new Error('You do not have permission to view this album')
        }

        if (albumData.visibility === 'friends') {
          if (!user) {
            return { album: albumData, photos: [], isDeleted: false, isPrivateContent: true }
          }

          const status = await getFollowStatus(albumData.user_id)
          if (status !== 'following') {
            throw new Error('This album is only visible to friends')
          }
        }
      }

      // Photos were fetched in parallel with the byline/privacy work above.
      const { data: photosData, error: photosError } = await photosPromise
      const photos = photosError ? [] : filterDuplicatePhotos(photosData || [])

      return { album: albumData, photos, isDeleted: false, isPrivateContent: false }
    },
    // Cold starts fail at the network layer for up to ~30s; retry through
    // that window, but privacy verdicts must surface immediately.
    retry: (failureCount, err) =>
      failureCount < 5 && !(err instanceof Error && TERMINAL_ALBUM_ERRORS.has(err.message)),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
  })

  const album = albumDetail?.album ?? null
  const photos = albumDetail?.photos ?? []
  const isDeleted = albumDetail?.isDeleted ?? false
  const isPrivateContent = albumDetail?.isPrivateContent ?? false
  const error = albumQueryError
    ? albumQueryError instanceof Error
      ? albumQueryError.message
      : String(albumQueryError)
    : null

  useEffect(() => {
    if (albumQueryError) {
      log.error('Failed to fetch album details', {
        component: 'AlbumDetailPage',
        action: 'fetchAlbum',
        albumId,
        userId: user?.id,
        errorMessage: error ?? 'Unknown error occurred'
      }, albumQueryError instanceof Error ? albumQueryError : new Error(String(albumQueryError)))
    }
  }, [albumQueryError, albumId, user?.id, error])

  // Surgical cache patches for realtime updates and optimistic toggles —
  // the setAlbum/setIsDeleted equivalents now that the data lives in the
  // React Query cache.
  const patchAlbumDetail = useCallback(
    (patch: Partial<AlbumDetailData> | ((prev: AlbumDetailData) => AlbumDetailData)) => {
      queryClient.setQueryData<AlbumDetailData>(albumQueryKey, (prev) => {
        if (!prev) return prev
        return typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      })
    },
    [queryClient, albumQueryKey]
  )

  // Use likes hook for like functionality
  const { likes, isLiked, toggleLike } = useLikes(album?.id)

  // Single useComments instance for the whole page — powers the engagement-bar
  // count here and is threaded into <Comments> below (it used to mount its
  // own duplicate fetch + realtime channel).
  const commentsApi = useComments(album?.id)
  const { comments: albumComments } = commentsApi

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

  // Update follow status
  useEffect(() => {
    if (album?.user_id && user?.id) {
      getFollowStatus(album.user_id).then(setFollowStatus)
    }
  }, [album?.user_id, user?.id, getFollowStatus])

  // Set up real-time subscription for album changes
  useEffect(() => {
    if (!albumId) return

    // WHY: track the visibility-change redirect timer so unmount cancels it —
    // otherwise a stray router.push('/feed') fires after the user navigated away.
    let redirectTimeout: ReturnType<typeof setTimeout> | undefined

    const channel = supabase
      .channel(`album-${albumId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'albums',
          filter: `id=eq.${albumId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            patchAlbumDetail({ isDeleted: true })
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
              patchAlbumDetail({ isPrivateContent: true })
              redirectTimeout = setTimeout(() => router.push('/feed'), 2000)
            } else {
              // WHY: payload.new is the bare albums row — replacing state with
              // it would wipe the joined `user` relation the query merged in
              // (breaking the owner byline). Merge into the previous album.
              patchAlbumDetail(prev =>
                prev.album
                  ? { ...prev, album: { ...prev.album, ...updatedAlbum, user: prev.album.user } }
                  : prev
              )
              toast.info('Album updated')
            }
          }
        }
      )
      .subscribe()

    return () => {
      if (redirectTimeout) clearTimeout(redirectTimeout)
      supabase.removeChannel(channel)
    }
  }, [albumId, user?.id, router, supabase, patchAlbumDetail])

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
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackRoute="/feed" />
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-lg font-semibold text-foreground">Album Deleted</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This album has been deleted and is no longer available.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">
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
    // Mirror the real single-column layout (max-w-4xl) so there's no width jump
    // or column collapse when content loads.
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Author row */}
            <div className="flex items-center gap-3">
              <AnimatedSkeleton className="h-10 w-10 rounded-full" variant="rounded" />
              <div className="space-y-1.5">
                <AnimatedSkeleton className="h-3.5 w-32 rounded" variant="rounded" />
                <AnimatedSkeleton className="h-3 w-20 rounded" variant="rounded" />
              </div>
            </div>
            {/* Title + meta */}
            <div className="space-y-2">
              <AnimatedSkeleton className="h-8 w-3/4 rounded" variant="rounded" />
              <AnimatedSkeleton className="h-4 w-40 rounded" variant="rounded" />
            </div>
            {/* Gallery */}
            <AnimatedSkeleton className="aspect-[4/3] w-full rounded-2xl" variant="rounded" />
            {/* Engagement bar */}
            <div className="flex gap-6 border-y border-border py-3">
              {[...Array(4)].map((_, i) => (
                <AnimatedSkeleton key={i} className="h-5 w-12 rounded" variant="rounded" />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/20 bg-destructive/10">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-destructive font-medium text-lg">Unable to Load Album</p>
                    <p className="text-destructive text-sm mt-1">{error}</p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <Button
                      onClick={() => refetchAlbum()}
                      disabled={loading || albumRefetching}
                      className="min-w-[120px]"
                    >
                      {loading || albumRefetching ? 'Retrying...' : 'Try Again'}
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
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton fallbackRoute="/feed" />
          <Card className="mt-6">
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
      </div>
    )
  }

  // Show private/login message
  if (isPrivateContent && album) {
    if (!user) {
      return (
        <div className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <BackButton fallbackRoute="/feed" />
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div>
                    <p className="font-heading text-lg font-semibold text-foreground">Login Required</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This album is {album.visibility}. Please log in to view it.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <Link href={`/login?redirectTo=${encodeURIComponent(`/albums/${album.id}`)}`}>
                      <Button>Log In</Button>
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
        <div className="min-h-screen bg-background py-8 px-4">
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

  const albumUser = album.user

  // Format date for mobile header
  const formatDate = () => {
    return formatTravelDateForViewer(
      album.date_start,
      isOwner,
      album.latitude ?? undefined,
    ) || null
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {photos.length > 0 ? (
          <>
            {/* Quality nudges — owner-only, dismissible */}
            <AlbumQualityNudges album={album} photos={photos} isOwner={isOwner} />

            {/* ── Share Prompt (after album creation) ── */}
            {showSharePrompt && (
              <motion.div
                className="mb-5 rounded-2xl border border-primary/20 bg-primary/10 p-4 flex items-center justify-between gap-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Share2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Album created!</p>
                    <p className="text-xs text-muted-foreground">Your globe just got a new pin</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* The core wow — the globe lighting up — is the PRIMARY
                      action of this moment; sharing is secondary. */}
                  {album?.latitude && album?.longitude && (
                    <Button
                      size="sm"
                      className="rounded-lg h-8 px-3 text-xs gap-1.5"
                      onClick={handleGlobeClick}
                    >
                      <Globe className="h-3 w-3" />
                      See it on your globe
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg h-8 px-3 text-xs gap-1.5"
                    onClick={async () => {
                      // Public viewer + referral handle — the auth-walled
                      // /albums/{id} route bounced recipients to /login.
                      const url = withRef(
                        `${getWebOrigin()}/albums/${album.id}/public`,
                        profile?.username
                      )
                      trackGrowthEvent('share_link_created', { meta: { surface: 'album_share_prompt' } })
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
                  <button type="button" aria-label="Dismiss share prompt" onClick={() => setShowSharePrompt(false)} className="text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200 active:scale-[0.97] p-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Album Header ── */}
            <motion.div
              className="mb-4 sm:mb-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* User row */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {albumUser && (
                    <Link href={`/profile/${albumUser.username}`} className="shrink-0 cursor-pointer">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center ring-2 ring-background overflow-hidden relative">
                        {albumUser.avatar_url ? (
                          <Image src={albumUser.avatar_url} alt={`${albumUser.display_name || albumUser.username || 'User'} avatar`} fill className="object-cover" sizes="40px" />
                        ) : (
                          <span className="text-primary-foreground text-sm font-semibold">
                            {albumUser.display_name?.[0] || albumUser.username?.[0] || 'U'}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                  <div className="min-w-0">
                    {albumUser && (
                      <p className="text-sm font-semibold text-foreground truncate">
                        {albumUser.display_name || albumUser.username}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {albumUser && <span>@{albumUser.username}</span>}
                      {formatDate() && (
                        <>
                          <span className="text-muted-foreground/60">&middot;</span>
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
                          ? "bg-muted text-foreground hover:bg-muted/80 border border-border"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
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
              <h1 className="al-display text-2xl sm:text-3xl md:text-4xl leading-tight mb-2 break-words">
                {album.title}
              </h1>

              {user?.id && album.user_id && (
                <div className="mb-3">
                  <YouWereHereBadge
                    albumId={album.id}
                    ownerUserId={album.user_id}
                    currentUserId={user.id}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {album.location_name && (() => {
                  const slug = placeSlug(album.location_name)
                  const content = (
                    <>
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {album.location_name}
                    </>
                  )
                  return slug ? (
                    <Link
                      href={`/places/${slug}`}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      {content}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">{content}</span>
                  )
                })()}
                {album.date_start && album.date_end && album.date_start !== album.date_end && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {formatTravelDateRangeForViewer(
                      album.date_start,
                      album.date_end,
                      isOwner,
                      album.latitude ?? undefined,
                    )}
                  </span>
                )}
                {/* photo count intentionally omitted here — the gallery below
                    already carries an "N photos" pill */}
                {isOwner && album.visibility && (
                  <span className="al-badge">
                    {album.visibility === 'private' ? (
                      <><Lock className="h-2.5 w-2.5" /> Private</>
                    ) : album.visibility === 'friends' ? (
                      <><Users className="h-2.5 w-2.5" /> Friends</>
                    ) : (
                      <><Globe className="h-2.5 w-2.5" /> Public</>
                    )}
                  </span>
                )}
              </div>

              {album.description && (
                <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-foreground max-w-2xl">
                  {album.description}
                </p>
              )}

              {/* Collaborators */}
              {activeCollaborators.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">with</span>
                  <div className="flex -space-x-1.5">
                    {activeCollaborators.slice(0, 6).map((c) => (
                      <Avatar key={c.id} className="h-6 w-6 ring-2 ring-background">
                        <AvatarImage src={getAvatarUrl(c.user?.avatar_url, c.user?.username)} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {getDisplayInitial(c.user?.display_name, c.user?.username)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeCollaborators.map(c => getDisplayName(c.user?.display_name, c.user?.username, '')).filter(Boolean).join(', ')}
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
                isLiked={isLiked}
                onToggleLike={toggleLike}
              />
            </motion.div>

            {/* ── Engagement Bar ── */}
            <motion.div
              className="flex items-center justify-between py-3 mt-3 border-y border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-4">
                {/* Like */}
                <button
                  type="button"
                  aria-label={isLiked ? 'Unlike album' : 'Like album'}
                  onClick={handleLikeClick}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1 -m-1",
                    isLiked ? "text-accent" : "text-muted-foreground hover:text-accent"
                  )}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                  <span>{likes.length}</span>
                </button>

                {/* Comment */}
                <button
                  type="button"
                  aria-label="View comments"
                  onClick={handleCommentClick}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1 -m-1"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{albumComments.length}</span>
                </button>

                {/* Share */}
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
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
                    type="button"
                    aria-label="View on globe"
                    onClick={handleGlobeClick}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1 -m-1"
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
                    type="button"
                    aria-label={isSaved ? 'Remove from saved' : 'Save album'}
                    onClick={handleSaveClick}
                    className={cn(
                      "transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1",
                      isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Bookmark className={cn("h-5 w-5", isSaved && "fill-current")} />
                  </button>
                )}

                {/* Report */}
                {!isOwner && user && (
                  <button
                    type="button"
                    aria-label="Report album"
                    onClick={() => setReportOpen(true)}
                    className="text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md p-1"
                    title="Report album"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}

                {/* Owner actions */}
                {isOwner && (
                  <>
                    <FavoriteAlbumToggle
                      albumId={album.id}
                      initialFavorite={album.is_favorite}
                      onChange={(next) =>
                        patchAlbumDetail((prev) =>
                          prev.album ? { ...prev, album: { ...prev.album, is_favorite: next } } : prev
                        )
                      }
                    />
                    <Link href={`/albums/${album.id}/edit`} className="cursor-pointer">
                      <Button variant="ghost" size="sm" className="text-xs cursor-pointer">
                        Edit
                      </Button>
                    </Link>
                  </>
                )}
              </div>
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
              <Comments albumId={album.id} api={commentsApi} />
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Camera className="h-6 w-6" />
            </div>
            <p className="al-eyebrow mb-2">{isOwner ? 'New album' : 'Album'}</p>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {isOwner ? 'Start your album' : 'No photos yet'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
              {isOwner
                ? 'Upload your first photo to bring this album to life.'
                : "This album doesn't have any photos yet."}
            </p>
            {isOwner && (
              <div className="mt-5">
                <Link href={`/albums/${album.id}/upload`}>
                  <Button size="lg" variant="coral" className="px-6">
                    Upload Photos
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Bar — hidden in the installed PWA / native app,
          where a fixed bar overlaps page content on scroll (the inline action
          bar above still provides like / comment / share / favourite). */}
      {!isStandalone && (
      <div className="sm:hidden fixed left-4 right-4 z-40 fab-position">
        <motion.div
          className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-lg border border-border px-4 py-2.5"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div
            className="grid gap-1"
            style={{
              // Size columns to the actual number of visible actions. Like,
              // Comment and Share always show; the 4th slot is Save for
              // non-owners and the Favourite toggle for the owner.
              gridTemplateColumns: `repeat(4, minmax(0, 1fr))`,
            }}
          >
            <motion.button
              onClick={handleLikeClick}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
                isLiked ? "text-accent" : "text-muted-foreground"
              )}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
              <span className="text-[10px] font-medium">{likes.length}</span>
            </motion.button>

            <motion.button
              onClick={handleCommentClick}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-muted-foreground transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]"
              whileTap={{ scale: 0.9 }}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="text-[10px] font-medium">Comment</span>
            </motion.button>

            <div className="flex flex-col items-center gap-1 py-2 rounded-xl text-muted-foreground">
              <ShareButton albumId={album.id} albumTitle={album.title} variant="icon" className="!p-0" />
              <span className="text-[10px] font-medium">Share</span>
            </div>

            {!isOwner ? (
              <motion.button
                onClick={handleSaveClick}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
                  isSaved ? "text-primary" : "text-muted-foreground"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <Bookmark className={cn("h-6 w-6", isSaved && "fill-current")} />
                <span className="text-[10px] font-medium">Save</span>
              </motion.button>
            ) : (
              <div className="flex flex-col items-center gap-1 py-2 rounded-xl min-w-[44px] min-h-[44px]">
                <FavoriteAlbumToggle
                  albumId={album.id}
                  initialFavorite={album.is_favorite}
                  onChange={(next) =>
                    patchAlbumDetail((prev) =>
                      prev.album ? { ...prev, album: { ...prev.album, is_favorite: next } } : prev
                    )
                  }
                  className="!p-0"
                />
                <span className="text-[10px] font-medium text-muted-foreground">Highlight</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      )}

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
