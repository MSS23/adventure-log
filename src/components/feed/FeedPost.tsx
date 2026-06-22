'use client'

import { useState, memo } from 'react'
import { MessageCircle, MapPin, Share2, Bookmark, BookmarkCheck, Globe as GlobeIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import Link from 'next/link'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { PhotoCarousel } from '@/components/feed/PhotoCarousel'
import { useHaptics } from '@/lib/hooks/useHaptics'
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

export function getFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

const ActionButton = memo(
  ({
    onClick,
    isActive = false,
    children,
    label,
    className,
  }: {
    onClick?: () => void
    isActive?: boolean
    children: React.ReactNode
    label: string
    className?: string
  }) => (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full transition-colors duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'text-accent'
          : 'text-muted-foreground hover:text-primary hover:bg-muted',
        className,
      )}
    >
      {children}
    </motion.button>
  ),
)
ActionButton.displayName = 'ActionButton'

export const FeedItem = memo(({ album, priority = false }: { album: FeedAlbum; currentUserId?: string; priority?: boolean }) => {
  // Defensive fallback: the `user` relation can be missing at runtime even though
  // the type marks it required (Supabase join may return null). Guard against
  // accessing properties of undefined (e.g. display_name[0]).
  const user = album.user ?? {
    id: album.user_id,
    username: 'unknown',
    display_name: 'Unknown',
    avatar_url: undefined,
  }
  const { triggerLight, triggerDoubleTap } = useHaptics()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)

  const albumDate = album.date_start || album.created_at
  const dateFormatted = new Date(albumDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const hasGeo = !!(album.latitude && album.longitude)
  // Location chip routes to that user's globe view (filtered globe page).
  const userGlobeHref = hasGeo
    ? `/globe?user=${album.user_id}&album=${album.id}&lat=${album.latitude}&lng=${album.longitude}`
    : `/globe?user=${album.user_id}`

  const handleShare = async () => {
    triggerLight()
    if (navigator.share) {
      try {
        await navigator.share({
          title: album.title,
          text: `Check out ${user.display_name}'s journey: ${album.title}`,
          url: `${window.location.origin}/albums/${album.id}`,
        })
      } catch {
        /* user cancelled */
      }
    } else {
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
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-resting)] transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-hover)]">
      {/* Byline — avatar, name, location chip, date */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <UserAvatarLink user={user}>
          <OptimizedAvatar
            src={user.avatar_url}
            alt={user.display_name}
            fallback={user.display_name[0]?.toUpperCase() || 'U'}
            size="md"
          />
        </UserAvatarLink>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <UserLink
              user={user}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {user.display_name || user.username}
            </UserLink>
            {album.country_code && (
              <span className="inline-flex shrink-0 items-center text-sm leading-none" title={album.country || album.location} aria-hidden>
                {getFlag(album.country_code)}
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] tracking-wide uppercase text-muted-foreground mt-0.5">
            {dateFormatted}
          </p>
        </div>

        {/* Location chip — primary "view their globe" affordance */}
        {album.location && (
          <Link
            href={userGlobeHref}
            className="group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors duration-200 hover:bg-primary/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            title={`Open ${user.display_name || user.username}'s globe`}
          >
            <MapPin className="w-3 h-3" strokeWidth={2.2} aria-hidden />
            <span className="truncate max-w-[140px]">{album.location}</span>
            <GlobeIcon
              className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
              strokeWidth={2.2}
              aria-hidden
            />
          </Link>
        )}
      </header>

      {/* Photo — full-bleed, no decorative bg */}
      <Link href={`/albums/${album.id}`} aria-label={album.title} className="block">
        <div className="relative">
          <PhotoCarousel
            photos={album.photos || []}
            albumTitle={album.title}
            albumId={album.id}
            coverPhotoOffset={{
              x: album.cover_photo_x_offset,
              y: album.cover_photo_y_offset,
            }}
            priority={priority}
            onDoubleTap={() => {}}
          />
        </div>
      </Link>

      {/* Title + description — editorial, photo-anchored */}
      <div className="px-5 pt-4 pb-3">
        <Link href={`/albums/${album.id}`}>
          <h3 className="font-heading text-lg md:text-xl font-semibold leading-tight text-foreground hover:text-primary transition-colors">
            {album.title}
          </h3>
        </Link>

        {album.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {album.description}
          </p>
        )}
      </div>

      {/* Action row — minimal, typographic */}
      <div className="px-5 py-2.5 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-1">
          <LikeButton albumId={album.id} showCount={false} size="md" />
          <Link
            href={`/albums/${album.id}#comments`}
            aria-label="View comments"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.7} />
          </Link>
          <ActionButton onClick={handleShare} label="Share">
            <Share2 className="h-5 w-5" strokeWidth={1.7} />
          </ActionButton>
        </div>

        <ActionButton onClick={handleBookmark} isActive={isBookmarked} label="Bookmark">
          <AnimatePresence mode="wait" initial={false}>
            {isBookmarked ? (
              <motion.span
                key="on"
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="inline-flex"
              >
                <BookmarkCheck className="h-5 w-5 fill-current" strokeWidth={1.7} />
              </motion.span>
            ) : (
              <motion.span
                key="off"
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.6 }}
                className="inline-flex"
              >
                <Bookmark className="h-5 w-5" strokeWidth={1.7} />
              </motion.span>
            )}
          </AnimatePresence>
        </ActionButton>
      </div>

      {/* Stats footer — tight typographic row */}
      {(album.likes_count > 0 || album.comments_count > 0) && (
        <div className="px-5 pb-4 -mt-1 flex items-center gap-3 font-mono text-[11px] tracking-wide uppercase text-muted-foreground">
          {album.likes_count > 0 && (
            <span>
              {album.likes_count} {album.likes_count === 1 ? 'like' : 'likes'}
            </span>
          )}
          {album.comments_count > 0 && (
            <Link
              href={`/albums/${album.id}#comments`}
              className="hover:text-primary transition-colors"
            >
              {album.comments_count} {album.comments_count === 1 ? 'comment' : 'comments'}
            </Link>
          )}
        </div>
      )}

      {/* Share toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-medium px-4 py-2 rounded-full shadow-lg z-10"
          >
            Link copied
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
})
FeedItem.displayName = 'FeedItem'
