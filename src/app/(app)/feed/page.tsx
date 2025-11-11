'use client'

import { useState, memo, useEffect, useMemo, useRef } from 'react'
import { MessageCircle, Loader2, Globe } from 'lucide-react'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { JumpToPresent } from '@/components/common/JumpToPresent'
import { PhotoCarousel } from '@/components/feed/PhotoCarousel'
import { TrendingDestinations } from '@/components/feed/TrendingDestinations'
import { FeedSidebar } from '@/components/feed/FeedSidebar'

interface FeedAlbum {
  id: string
  title: string
  description?: string
  location?: string
  country?: string
  latitude?: number
  longitude?: number
  created_at: string
  date_start?: string
  cover_image_url?: string
  cover_photo_x_offset?: number
  cover_photo_y_offset?: number
  likes_count: number
  comments_count: number
  user_id: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  photos?: Array<{
    id: string
    file_path: string
    caption?: string
    taken_at?: string
  }>
}

// Memoized feed item component for performance - Clean Instagram-style
const FeedItem = memo(({
  album,
  currentUserId
}: {
  album: FeedAlbum
  currentUserId?: string
}) => {
  const albumDate = album.date_start || album.created_at
  const dateFormatted = new Date(albumDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
  <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
    {/* Header - User info with location and date */}
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatarLink user={album.user}>
          <OptimizedAvatar
            src={album.user.avatar_url}
            alt={album.user.display_name}
            fallback={album.user.display_name[0]?.toUpperCase() || 'U'}
            size="md"
            className=""
          />
        </UserAvatarLink>
        <div className="flex-1 min-w-0">
          <UserLink user={album.user} className="text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors block">
            {album.user.username}
          </UserLink>
          <p className="text-xs text-gray-500">
            {album.location ? `${album.location} • ` : ''}{dateFormatted}
          </p>
        </div>
      </div>
      <button className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 active:scale-95">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
      </button>
    </div>

    {/* Image - Full width photo */}
    <div className="relative bg-gray-100">
      <PhotoCarousel
        photos={album.photos || []}
        albumTitle={album.title}
        albumId={album.id}
        coverPhotoOffset={{
          x: album.cover_photo_x_offset,
          y: album.cover_photo_y_offset
        }}
        onDoubleTap={() => {
          // Double tap handled internally by PhotoCarousel
        }}
      />
    </div>

    {/* Actions and Content */}
    <div className="px-4 py-3">
      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <LikeButton albumId={album.id} showCount={false} size="md" />
          <Link href={`/albums/${album.id}#comments`} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 active:scale-95">
            <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
          </Link>
          {album.latitude && album.longitude && (
            <Link
              href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full p-2 transition-all duration-200 active:scale-95"
              title="View on Globe"
            >
              <Globe className="h-6 w-6" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>

      {/* Album Title and Stats */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">{album.title}</h3>

        {/* Like Count */}
        {album.likes_count > 0 && (
          <button className="text-sm font-semibold text-gray-900 hover:underline">
            {album.likes_count} {album.likes_count === 1 ? 'Like' : 'Likes'}
          </button>
        )}

        {/* Description */}
        {album.description && (
          <div className="text-sm text-gray-900">
            <span className="font-semibold mr-1">{album.user.username}</span>
            <span className="whitespace-pre-wrap line-clamp-3">{album.description}</span>
          </div>
        )}

        {/* Comment Count */}
        {album.comments_count > 0 && (
          <Link
            href={`/albums/${album.id}#comments`}
            className="text-sm text-gray-500 hover:text-gray-700 block"
          >
            View all {album.comments_count} comments
          </Link>
        )}
      </div>
    </div>
  </div>
  )
})

FeedItem.displayName = 'FeedItem'

export default function FeedPage() {
  const { user } = useAuth()
  const { albums, loading, error, refreshFeed } = useFeedData()
  const [highlightsMode, setHighlightsMode] = useState<'all' | 'friends'>('all')
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [showJumpToPresent, setShowJumpToPresent] = useState(false)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const firstAlbumIdRef = useRef<string | null>(null)
  const supabase = createClient()

  // Track the first album ID when feed loads and reset on user change
  useEffect(() => {
    if (albums.length > 0 && !firstAlbumIdRef.current) {
      firstAlbumIdRef.current = albums[0].id
    }

    // Reset everything when user changes (login/logout)
    if (!user?.id) {
      firstAlbumIdRef.current = null
      setShowJumpToPresent(false)
      setNewItemsCount(0)
    }
  }, [albums, user?.id])

  // Refresh feed when page becomes visible (after editing an album)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        refreshFeed()
      }
    }

    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also refresh on window focus
    const handleFocus = () => {
      if (user?.id) {
        refreshFeed()
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshFeed, user?.id])

  // Fetch friends list
  useEffect(() => {
    async function fetchFriends() {
      if (!user?.id) return

      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')

      if (data) {
        setFriendIds(new Set(data.map(f => f.following_id)))
      }
    }

    fetchFriends()
  }, [user?.id, supabase])

  // Filter albums based on highlights mode
  const filteredAlbums = useMemo(() => {
    if (highlightsMode === 'all') {
      return albums
    }
    return albums.filter(album => friendIds.has(album.user_id))
  }, [albums, highlightsMode, friendIds])

  // Auto-refresh feed every 5 minutes and check for new content
  useEffect(() => {
    const interval = setInterval(async () => {
      // Fetch latest album to check for new content
      if (user?.id && firstAlbumIdRef.current) {
        const { data } = await supabase
          .from('albums')
          .select('id, created_at')
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(10)

        if (data && data.length > 0) {
          // Check if there are newer albums than what we have
          const newerAlbums = data.filter(album => album.id !== firstAlbumIdRef.current)
          if (newerAlbums.length > 0) {
            setNewItemsCount(newerAlbums.length)
            setShowJumpToPresent(true)
          }
        }
      }
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [refreshFeed, user?.id, supabase])

  // Handle jump to present
  const handleJumpToPresent = async () => {
    await refreshFeed()
    setShowJumpToPresent(false)
    setNewItemsCount(0)
    // Update the first album ID reference
    if (albums.length > 0) {
      firstAlbumIdRef.current = albums[0].id
    }
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium text-base">Loading your feed...</p>
          <p className="text-sm text-gray-600 mt-1.5">Discovering amazing journeys</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md border border-gray-200 shadow-sm">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshFeed} variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Trending Destinations Section - Show even with no posts */}
        <TrendingDestinations />

        <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600">
              Start following others or create your first album to see content here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Right Sidebar */}
      <FeedSidebar />

      {/* Main Content - centered with both sidebars */}
      <div className="flex justify-center lg:pl-[240px] xl:pl-[260px] lg:pr-[280px] xl:pr-[320px]">
        <div className="w-full max-w-[630px] px-4 pb-20 md:pb-0">
          {/* Jump to Present Button */}
          <JumpToPresent
            show={showJumpToPresent}
            onJump={handleJumpToPresent}
            newItemsCount={newItemsCount}
          />

          {/* Trending Destinations Section */}
          <TrendingDestinations />

          {/* Feed Items */}
          <div className="space-y-6">
            {filteredAlbums.map((album) => (
              <FeedItem
                key={album.id}
                album={album}
                currentUserId={user?.id}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
