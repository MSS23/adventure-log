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
import { useFavorites } from '@/lib/hooks/useFavorites'
import { useAuth } from '@/components/auth/AuthProvider'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import { formatTravelDate } from '@/lib/utils/travel-date'
import { formatLocationLabel, getFlagEmoji } from '@/lib/utils/country'
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
  /**
   * Whether the current viewer has liked this album, resolved by the feed
   * page in ONE batched likes query per page. Threaded into useLikes as
   * initialLiked so each post skips its own existence query (the feed N+1).
   */
  is_liked?: boolean
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
  // WHY: the bookmark used to be pure local useState — it was never persisted
  // and silently reset on unmount. Wire it to the existing favorites system
  // (same store the /saved page reads via target_type='album'), so a bookmark
  // from the feed actually shows up under Saved. The hook is optimistic with
  // rollback, so the icon still flips instantly.
  const { profile } = useAuth()
  const { isFavorited, toggleFavorite } = useFavorites({
    targetType: 'album',
    targetId: album.id,
  })
  const isBookmarked = isFavorited(album.id, 'album')
  const [showShareToast, setShowShareToast] = useState(false)
  // Local, optimistic like count: the footer shows a server-provided count, so
  // it must move the instant the user taps the heart (the LikeButton reports
  // the toggle), not wait for a refetch.
  const [likesCount, setLikesCount] = useState(album.likes_count)

  // Album dates read as seasons (e.g. "Summer 2025"), hemisphere-aware.
  const albumDate = album.date_start || album.created_at
  const dateFormatted = formatTravelDate(albumDate, {
    view: 'fuzzy',
    latitude: album.latitude,
  })

  // Clean, de-duplicated location label ("New York, USA, US" -> "New York, USA").
  const locationLabel = album.location
    ? formatLocationLabel(album.location, album.country_code)
    : ''

  const hasGeo = !!(album.latitude && album.longitude)
  // Location chip routes to that user's globe view (filtered globe page).
  const userGlobeHref = hasGeo
    ? `/globe?user=${album.user_id}&album=${album.id}&lat=${album.latitude}&lng=${album.longitude}`
    : `/globe?user=${album.user_id}`

  const handleShare = async () => {
    triggerLight()
    // Public album viewer on the web origin — window.location.origin is
    // capacitor://localhost in the APK (dead link) and /albums/{id} is
    // auth-walled. ?ref= makes signups from this share auto-follow the sharer.
    const shareUrl = withRef(
      `${getWebOrigin()}/albums/${album.id}/public`,
      profile?.username
    )
    trackGrowthEvent('share_link_created', { meta: { surface: 'feed_post' } })
    if (navigator.share) {
      try {
        await navigator.share({
          title: album.title,
          text: `Check out ${user.display_name}'s journey: ${album.title}`,
          url: shareUrl,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }
  }

  const handleBookmark = () => {
    triggerDoubleTap()
    // The hook applies the change optimistically and rolls back + logs on
    // failure; swallow the rethrow to avoid an unhandled rejection.
    toggleFavorite(album.id, 'album', {
      title: album.title,
      photo_url: album.cover_image_url,
    }).catch(() => {})
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-resting)] transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-hover)]">
      {/* Byline — avatar, name + flag, then a secondary location · date meta line.
          Tightened to a single balanced row: identity on the left, the globe
          affordance pinned right. */}
      <header className="flex items-center gap-3 px-4 sm:px-5 pt-3.5 pb-3">
        <UserAvatarLink user={user} className="shrink-0">
          <OptimizedAvatar
            src={user.avatar_url}
            alt={user.display_name}
            fallback={user.display_name[0]?.toUpperCase() || 'U'}
            size="md"
          />
        </UserAvatarLink>

        <div className="min-w-0 flex-1">
          {/* Line 1 — display name + country flag, on one baseline */}
          <div className="flex items-center gap-1.5">
            <UserLink
              user={user}
              className="min-w-0 truncate text-[15px] font-semibold leading-tight text-foreground hover:text-primary transition-colors"
            >
              {user.display_name || user.username}
            </UserLink>
            {album.country_code && (
              // leading-none collapses the line-box to glyph height so the flag's
              // optical centre lines up with the name's cap-height; the nudge
              // corrects the emoji's naturally-high baseline.
              <span
                className="shrink-0 text-[13px] leading-none translate-y-[0.5px]"
                title={album.country || locationLabel}
                aria-hidden
              >
                {getFlagEmoji(album.country_code)}
              </span>
            )}
          </div>

          {/* Line 2 — location · date, as quiet secondary meta */}
          <div className="mt-1 flex items-center gap-1.5 text-xs leading-none text-muted-foreground">
            {locationLabel && (
              <>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
                  <span className="truncate font-medium text-foreground/80">{locationLabel}</span>
                </span>
                <span className="text-muted-foreground/50" aria-hidden>·</span>
              </>
            )}
            <span className="shrink-0 font-mono uppercase tracking-wide text-[11px]">
              {dateFormatted}
            </span>
          </div>
        </div>

        {/* Globe affordance — compact, icon-led pill that opens this user's globe.
            shrink-0 keeps its shape; the location text now lives in the meta line
            so the pill stays small and never crowds the name. */}
        <Link
          href={userGlobeHref}
          className="group inline-flex shrink-0 items-center justify-center h-8 w-8 rounded-full border border-border/70 bg-muted/40 text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          title={`Open ${user.display_name || user.username}'s globe`}
          aria-label={`Open ${user.display_name || user.username}'s globe`}
        >
          <GlobeIcon className="h-4 w-4" strokeWidth={1.9} aria-hidden />
        </Link>
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
            initialLiked={album.is_liked}
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
          <LikeButton
            albumId={album.id}
            initialLiked={album.is_liked}
            showCount={false}
            size="md"
            onToggle={(liked) => setLikesCount((c) => Math.max(0, c + (liked ? 1 : -1)))}
          />
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
      {(likesCount > 0 || album.comments_count > 0) && (
        <div className="px-5 pb-4 -mt-1 flex items-center gap-3 font-mono text-[11px] tracking-wide uppercase text-muted-foreground">
          {likesCount > 0 && (
            <span>
              {likesCount} {likesCount === 1 ? 'like' : 'likes'}
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
