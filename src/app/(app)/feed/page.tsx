'use client'

import { useState, memo, useEffect, useRef } from 'react'
import { MessageCircle, Globe, MapPin, Share2, Bookmark, BookmarkCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { CompactGlobeLink } from '@/components/feed/MiniGlobe'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { GlassCard } from '@/components/ui/glass-card'
import { FeedSkeleton, StoriesRowSkeleton } from '@/components/feed/FeedSkeleton'
import { NumberTicker } from '@/components/animations/NumberTicker'
import { cn } from '@/lib/utils'

interface FeedAlbum {
  id: string
  title: string
  description?: string
  location?: string
  country?: string
  country_code?: string
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

// Helper to get flag emoji from country code
function getFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

// Animated action button component
const ActionButton = memo(({
  onClick,
  isActive = false,
  activeColor = 'teal',
  children,
  className,
}: {
  onClick?: () => void
  isActive?: boolean
  activeColor?: 'teal' | 'pink' | 'amber'
  children: React.ReactNode
  className?: string
}) => {
  const colorStyles = {
    teal: 'text-teal-600 hover:bg-teal-50',
    pink: 'text-pink-500 hover:bg-pink-50',
    amber: 'text-amber-500 hover:bg-amber-50',
  }

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'rounded-full p-2 transition-all duration-200',
        isActive ? colorStyles[activeColor] : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.button>
  )
})

ActionButton.displayName = 'ActionButton'

// Memoized feed item component for performance - Enhanced engaging design
const FeedItem = memo(({
  album
}: {
  album: FeedAlbum
  currentUserId?: string
}) => {
  const { triggerLight, triggerDoubleTap } = useHaptics()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)
  const albumDate = album.date_start || album.created_at
  const dateFormatted = new Date(albumDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const handleShare = async () => {
    triggerLight()
    if (navigator.share) {
      try {
        await navigator.share({
          title: album.title,
          text: `Check out ${album.user.display_name}'s journey: ${album.title}`,
          url: `${window.location.origin}/albums/${album.id}`,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${window.location.origin}/albums/${album.id}`)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }
  }

  const handleBookmark = () => {
    triggerDoubleTap()
    setIsBookmarked(!isBookmarked)
  }

  return (
    <GlassCard
      variant="elevated"
      hover="lift"
      padding="none"
      className="overflow-hidden"
    >
      {/* Header - User info with location and date */}
      <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-white via-white to-gray-50/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatarLink user={album.user}>
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <OptimizedAvatar
                src={album.user.avatar_url}
                alt={album.user.display_name}
                fallback={album.user.display_name[0]?.toUpperCase() || 'U'}
                size="md"
                className="ring-2 ring-gradient-to-r ring-teal-200/50 ring-offset-2"
              />
              {/* Animated gradient ring */}
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.3), rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.3))',
                  backgroundSize: '200% 200%',
                }}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              {/* Online indicator with pulse */}
              <motion.span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </UserAvatarLink>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <UserLink user={album.user} className="text-sm font-bold text-gray-900 hover:text-teal-600 transition-colors">
                {album.user.username}
              </UserLink>
              {album.country_code && (
                <motion.span
                  className="text-sm"
                  title={album.country || album.location}
                  whileHover={{ scale: 1.2 }}
                >
                  {getFlag(album.country_code)}
                </motion.span>
              )}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {album.location && (
                <>
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{album.location}</span>
                  <span className="mx-1">•</span>
                </>
              )}
              {dateFormatted}
            </p>
          </div>
        </div>
        <ActionButton onClick={() => triggerLight()}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </ActionButton>
      </div>

      {/* Image - Full width photo with subtle rounded corners */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200">
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
      <div className="px-4 py-3 bg-gradient-to-b from-white to-gray-50/30">
        {/* Action Buttons Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <LikeButton albumId={album.id} showCount={false} size="md" />
            <Link
              href={`/albums/${album.id}#comments`}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 active:scale-95 inline-flex"
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
            </Link>
            <ActionButton onClick={handleShare}>
              <Share2 className="h-6 w-6" strokeWidth={1.5} />
            </ActionButton>
          </div>

          {/* Right side - Bookmark and Globe */}
          <div className="flex items-center gap-1">
            {album.latitude && album.longitude && (
              <Link
                href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
                title="View on Globe"
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full p-2 transition-all duration-200 active:scale-95 inline-flex"
              >
                <Globe className="h-6 w-6" strokeWidth={1.5} />
              </Link>
            )}
            <ActionButton
              onClick={handleBookmark}
              isActive={isBookmarked}
              activeColor="amber"
            >
              <AnimatePresence mode="wait">
                {isBookmarked ? (
                  <motion.div
                    key="bookmarked"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 30 }}
                  >
                    <BookmarkCheck className="h-6 w-6 fill-current" strokeWidth={1.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="not-bookmarked"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Bookmark className="h-6 w-6" strokeWidth={1.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </ActionButton>
          </div>
        </div>

        {/* Album Title and Stats */}
        <div className="space-y-2">
          {/* Title with link */}
          <Link href={`/albums/${album.id}`}>
            <motion.h3
              className="text-lg font-bold text-gray-900 hover:text-teal-600 transition-colors"
              whileHover={{ x: 2 }}
            >
              {album.title}
            </motion.h3>
          </Link>

          {/* Animated Like Count */}
          {album.likes_count > 0 && (
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-sm font-semibold text-gray-900">
                <NumberTicker
                  value={album.likes_count}
                  size="sm"
                />
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {album.likes_count === 1 ? 'like' : 'likes'}
              </span>
            </motion.div>
          )}

          {/* Description */}
          {album.description && (
            <div className="text-sm text-gray-800">
              <Link href={`/u/${album.user.username}`} className="font-semibold hover:text-teal-600 mr-1">
                {album.user.username}
              </Link>
              <span className="whitespace-pre-wrap line-clamp-2">{album.description}</span>
            </div>
          )}

          {/* Comment Count with animated indicator */}
          {album.comments_count > 0 && (
            <Link
              href={`/albums/${album.id}#comments`}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 group"
            >
              <span>View all</span>
              <NumberTicker value={album.comments_count} size="sm" className="text-gray-500 group-hover:text-gray-700" />
              <span>comments</span>
            </Link>
          )}

          {/* Globe Link Badge - Prominent location feature */}
          {album.latitude && album.longitude && album.location && (
            <motion.div
              className="pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CompactGlobeLink
                lat={album.latitude}
                lng={album.longitude}
                albumId={album.id}
                userId={album.user_id}
                location={album.location}
                countryCode={album.country_code}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Share toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg"
          >
            Link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
})

FeedItem.displayName = 'FeedItem'

export default function FeedPage() {
  const { user } = useAuth()
  const { albums, loading, error, refreshFeed } = useFeedData()
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
      <div className="flex justify-center lg:pl-[240px] xl:pl-[260px]">
        <div className="w-full max-w-[630px] px-4 py-6">
          {/* Stories skeleton */}
          <StoriesRowSkeleton count={5} />

          {/* Divider */}
          <div className="h-px bg-gray-100 my-4" />

          {/* Feed skeleton */}
          <FeedSkeleton count={3} />
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
      {/* Main Content - centered with left sidebar only */}
      <div className="flex justify-center lg:pl-[240px] xl:pl-[260px]">
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
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.1
                }
              }
            }}
          >
            {albums.map((album) => (
              <motion.div
                key={album.id}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: 'spring',
                      stiffness: 300,
                      damping: 24
                    }
                  }
                }}
              >
                <FeedItem
                  album={album}
                  currentUserId={user?.id}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </>
  )
}
