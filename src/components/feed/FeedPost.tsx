'use client'

import { useState, memo } from 'react'
import { MessageCircle, Globe, MapPin, Share2, Bookmark, BookmarkCheck, ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import Link from 'next/link'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { PhotoCarousel } from '@/components/feed/PhotoCarousel'
import { CompactGlobeLink } from '@/components/feed/MiniGlobe'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { GlassCard } from '@/components/ui/glass-card'
import { NumberTicker } from '@/components/animations/NumberTicker'
import { cn } from '@/lib/utils'

export interface FeedAlbum {
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
export function getFlag(code: string): string {
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
  activeColor = 'olive',
  children,
  className,
}: {
  onClick?: () => void
  isActive?: boolean
  activeColor?: 'olive' | 'pink' | 'amber'
  children: React.ReactNode
  className?: string
}) => {
  const colorStyles = {
    olive: 'text-olive-600 hover:bg-olive-50',
    pink: 'text-pink-500 hover:bg-pink-50',
    amber: 'text-olive-500 hover:bg-olive-50',
  }

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'rounded-full p-2 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-1 min-w-[44px] min-h-[44px] flex items-center justify-center',
        isActive ? colorStyles[activeColor] : 'text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800',
        className
      )}
      whileTap={{ scale: 0.93 }}
    >
      {children}
    </motion.button>
  )
})

ActionButton.displayName = 'ActionButton'

// Memoized feed item component for performance - Enhanced engaging design
export const FeedItem = memo(({
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
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatarLink user={album.user}>
            <OptimizedAvatar
              src={album.user.avatar_url}
              alt={album.user.display_name}
              fallback={album.user.display_name[0]?.toUpperCase() || 'U'}
              size="md"
              className="ring-1 ring-stone-200/60 dark:ring-white/10"
            />
          </UserAvatarLink>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <UserLink user={album.user} className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-olive-600 transition-colors">
                {album.user.display_name || album.user.username}
              </UserLink>
              {album.country_code && (
                <span className="text-sm" title={album.country || album.location}>
                  {getFlag(album.country_code)}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
              {album.location && (
                <>
                  {album.latitude && album.longitude ? (
                    <Link
                      href={`/globe?user=${album.user_id}&album=${album.id}&lat=${album.latitude}&lng=${album.longitude}`}
                      className="flex items-center gap-1 hover:text-olive-600 dark:hover:text-olive-400 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{album.location}</span>
                    </Link>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{album.location}</span>
                    </>
                  )}
                  <span className="mx-0.5">·</span>
                </>
              )}
              {dateFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Image - Full width photo with subtle rounded corners */}
      <div className="relative bg-gradient-to-br from-stone-100 to-stone-200">
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
        {/* Action Buttons Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <LikeButton albumId={album.id} showCount={false} size="md" />
            <Link
              href={`/albums/${album.id}#comments`}
              className="text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full p-2 transition-all duration-200 active:scale-95 inline-flex"
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
            </Link>
            <ActionButton onClick={handleShare}>
              <Share2 className="h-6 w-6" strokeWidth={1.5} />
            </ActionButton>
          </div>

          {/* Right side - Album, Globe, Bookmark */}
          <div className="flex items-center gap-1">
            <Link
              href={`/albums/${album.id}`}
              title="View Album"
              className="text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full p-2 transition-all duration-200 active:scale-95 inline-flex"
            >
              <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
            </Link>
            {album.latitude && album.longitude && (
              <Link
                href={`/globe?user=${album.user_id}&album=${album.id}&lat=${album.latitude}&lng=${album.longitude}`}
                title={`View ${album.user?.display_name || 'their'} Globe`}
                className="text-olive-600 hover:text-olive-700 hover:bg-olive-50 dark:hover:bg-olive-950/30 rounded-full p-2 transition-all duration-200 active:scale-95 inline-flex"
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
          <Link href={`/albums/${album.id}`} className="cursor-pointer">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 hover:text-olive-600 dark:hover:text-olive-400 transition-colors duration-200">
              {album.title}
            </h3>
          </Link>

          {/* Animated Like Count */}
          {album.likes_count > 0 && (
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-sm font-semibold text-stone-900">
                <NumberTicker
                  value={album.likes_count}
                  size="sm"
                />
              </span>
              <span className="text-sm font-semibold text-stone-900">
                {album.likes_count === 1 ? 'like' : 'likes'}
              </span>
            </motion.div>
          )}

          {/* Description */}
          {album.description && (
            <div className="text-sm text-stone-800 dark:text-stone-200">
              <Link href={`/u/${album.user.username}`} className="font-semibold hover:text-olive-600 mr-1">
                {album.user.username}
              </Link>
              <span className="whitespace-pre-wrap line-clamp-2">{album.description}</span>
            </div>
          )}

          {/* Comment Count with animated indicator */}
          {album.comments_count > 0 && (
            <Link
              href={`/albums/${album.id}#comments`}
              className="text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1 group cursor-pointer transition-colors duration-200"
            >
              <span>View all</span>
              <NumberTicker value={album.comments_count} size="sm" className="text-stone-500 group-hover:text-stone-700" />
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
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm px-4 py-2 rounded-full shadow-lg"
          >
            Link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
})

FeedItem.displayName = 'FeedItem'
