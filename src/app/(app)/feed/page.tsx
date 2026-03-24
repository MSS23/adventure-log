'use client'

import { useState, memo, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Globe, MapPin, Share2, Bookmark, BookmarkCheck, Users, Compass, Plus, Map as MapIcon, UserPlus, TrendingUp, Camera, ImageIcon } from 'lucide-react'
import { NoFeedEmptyState } from '@/components/ui/enhanced-empty-state'
import { motion, AnimatePresence } from 'framer-motion'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { useDiscoverFeed, DiscoverAlbum } from '@/lib/hooks/useDiscoverFeed'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { JumpToPresent } from '@/components/common/JumpToPresent'
import { PhotoCarousel } from '@/components/feed/PhotoCarousel'
import { TrendingDestinations } from '@/components/feed/TrendingDestinations'
import { CompactGlobeLink } from '@/components/feed/MiniGlobe'
import { FollowButton } from '@/components/social/FollowButton'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { GlassCard } from '@/components/ui/glass-card'
import { FeedSkeleton } from '@/components/feed/FeedSkeleton'
import { NumberTicker } from '@/components/animations/NumberTicker'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

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

interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  album_count: number
}

interface PopularDestination {
  location_name: string
  country_code: string | null
  latitude: number
  longitude: number
  album_count: number
  cover_photo_url: string | null
}

// Helper to get flag emoji from country code
function getFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

// Hook to fetch suggested users to follow
function useSuggestedUsers(userId: string | undefined, limit = 5) {
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // Get IDs the user already follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('status', ['accepted', 'pending'])

      const followedIds = following?.map(f => f.following_id) || []
      const excludeIds = [userId, ...followedIds]

      // Get users with public albums, ordered by album count
      const { data } = await supabase
        .from('users')
        .select(`
          id, username, display_name, avatar_url,
          albums!albums_user_id_fkey(id)
        `)
        .eq('privacy_level', 'public')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(limit + 10) // Fetch extra in case some have no albums

      if (data) {
        const mapped: SuggestedUser[] = data
          .map(u => ({
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            album_count: (u.albums as unknown as Array<{ id: string }>)?.length || 0,
          }))
          .filter(u => u.album_count > 0)
          .sort((a, b) => b.album_count - a.album_count)
          .slice(0, limit)

        setUsers(mapped)
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [userId, limit])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  return { users, loading, refetch: fetchSuggestions }
}

// Hook to fetch popular destinations the user hasn't visited
function usePopularDestinations(userId: string | undefined) {
  const [destinations, setDestinations] = useState<PopularDestination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      if (!userId) {
        setLoading(false)
        return
      }

      const supabase = createClient()

      try {
        // Get locations the user has already visited
        const { data: userAlbums } = await supabase
          .from('albums')
          .select('location_name')
          .eq('user_id', userId)
          .not('location_name', 'is', null)

        const visitedLocations = new Set(
          userAlbums?.map(a => a.location_name?.toLowerCase()) || []
        )

        // Get popular public albums with locations
        const { data: popularAlbums } = await supabase
          .from('albums')
          .select('location_name, country_code, latitude, longitude, cover_photo_url')
          .eq('visibility', 'public')
          .not('location_name', 'is', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100)

        if (popularAlbums) {
          // Group by location
          const locationMap = new globalThis.Map<string, PopularDestination>()

          for (const album of popularAlbums) {
            const key = album.location_name?.toLowerCase() || ''
            if (visitedLocations.has(key)) continue

            if (locationMap.has(key)) {
              const existing = locationMap.get(key)!
              existing.album_count++
            } else {
              locationMap.set(key, {
                location_name: album.location_name!,
                country_code: album.country_code,
                latitude: album.latitude!,
                longitude: album.longitude!,
                album_count: 1,
                cover_photo_url: album.cover_photo_url,
              })
            }
          }

          const sorted: PopularDestination[] = Array.from(locationMap.values())
            .sort((a: PopularDestination, b: PopularDestination) => b.album_count - a.album_count)
            .slice(0, 6)

          setDestinations(sorted)
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [userId])

  return { destinations, loading }
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
        'rounded-full p-2 transition-all duration-200',
        isActive ? colorStyles[activeColor] : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
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

// Suggested user card (compact, for sidebar/row)
const SuggestedUserCard = memo(({ user, variant = 'vertical' }: { user: SuggestedUser; variant?: 'vertical' | 'horizontal' }) => {
  if (variant === 'horizontal') {
    return (
      <div className="flex items-center gap-3 py-2">
        <Link href={`/u/${user.username}`}>
          <OptimizedAvatar
            src={user.avatar_url || undefined}
            alt={user.display_name || user.username}
            fallback={(user.display_name || user.username)[0]?.toUpperCase() || 'U'}
            size="sm"
            className="ring-1 ring-stone-200"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/u/${user.username}`} className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-olive-600 transition-colors truncate block">
            {user.display_name || user.username}
          </Link>
          <p className="text-xs text-stone-500">{user.album_count} {user.album_count === 1 ? 'album' : 'albums'}</p>
        </div>
        <FollowButton userId={user.id} size="sm" showText={true} />
      </div>
    )
  }

  // Vertical card for mobile scrollable row
  return (
    <div className="flex-shrink-0 w-36 bg-white dark:bg-[#111111] rounded-xl border border-stone-200/50 dark:border-white/10 p-3 text-center">
      <Link href={`/u/${user.username}`} className="block">
        <OptimizedAvatar
          src={user.avatar_url || undefined}
          alt={user.display_name || user.username}
          fallback={(user.display_name || user.username)[0]?.toUpperCase() || 'U'}
          size="lg"
          className="mx-auto mb-2 ring-2 ring-olive-100 dark:ring-olive-900/30"
        />
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
          {user.display_name || user.username}
        </p>
        <p className="text-xs text-stone-500 mb-2">{user.album_count} {user.album_count === 1 ? 'album' : 'albums'}</p>
      </Link>
      <FollowButton userId={user.id} size="sm" showText={true} className="w-full" />
    </div>
  )
})

SuggestedUserCard.displayName = 'SuggestedUserCard'

// Suggested Users Section - Mobile horizontal row
const SuggestedUsersRow = memo(({ users }: { users: SuggestedUser[] }) => {
  if (users.length === 0) return null

  return (
    <div className="mb-4 xl:hidden">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Suggested Travelers</h3>
        <Link href="/explore" className="text-xs text-olive-600 hover:text-olive-700 font-medium">See All</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {users.map(user => (
          <SuggestedUserCard key={user.id} user={user} variant="vertical" />
        ))}
      </div>
    </div>
  )
})

SuggestedUsersRow.displayName = 'SuggestedUsersRow'

// Suggested Users Sidebar - Desktop
const SuggestedUsersSidebar = memo(({ users }: { users: SuggestedUser[] }) => {
  if (users.length === 0) return null

  return (
    <div className="hidden xl:block w-72 flex-shrink-0">
      <div className="sticky top-20">
        <GlassCard variant="elevated" padding="md" className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Suggested for You</h3>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-white/5">
            {users.map(user => (
              <SuggestedUserCard key={user.id} user={user} variant="horizontal" />
            ))}
          </div>
        </GlassCard>

        {/* Quick links */}
        <div className="px-2 space-y-2">
          <Link
            href="/globe"
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-olive-600 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Explore the Globe
          </Link>
          <Link
            href="/albums/new"
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-olive-600 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Create an Album
          </Link>
        </div>
      </div>
    </div>
  )
})

SuggestedUsersSidebar.displayName = 'SuggestedUsersSidebar'

// Popular Destinations Section
const PopularDestinationsSection = memo(({ destinations }: { destinations: PopularDestination[] }) => {
  if (destinations.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <TrendingUp className="w-4 h-4 text-olive-600" />
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Popular Destinations</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {destinations.map((dest, i) => (
          <Link
            key={dest.location_name}
            href={`/globe?lat=${dest.latitude}&lng=${dest.longitude}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative group rounded-xl overflow-hidden border border-stone-200/50 dark:border-white/10 bg-white dark:bg-[#111111] hover:shadow-md transition-all"
            >
              {/* Cover image or gradient placeholder */}
              <div className="h-20 bg-gradient-to-br from-olive-100 to-olive-50 dark:from-olive-950/30 dark:to-stone-900 relative overflow-hidden">
                {dest.cover_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getPhotoUrl(dest.cover_photo_url) || ''}
                    alt={dest.location_name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {dest.country_code && (
                  <span className="absolute top-2 right-2 text-lg">
                    {getFlag(dest.country_code)}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {dest.location_name}
                </p>
                <p className="text-[11px] text-stone-500">
                  {dest.album_count} {dest.album_count === 1 ? 'album' : 'albums'}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
})

PopularDestinationsSection.displayName = 'PopularDestinationsSection'

// Empty state with onboarding
const EmptyFeedOnboarding = memo(({ suggestedUsers }: { suggestedUsers: SuggestedUser[] }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8 text-olive-600 dark:text-olive-400" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Welcome to Your Feed
        </h2>
        <p className="text-stone-600 dark:text-stone-400 max-w-md mx-auto">
          Your feed will show adventures from people you follow. Get started by following some travelers or sharing your own journey.
        </p>
      </motion.div>

      {/* Suggested travelers */}
      {suggestedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <GlassCard variant="elevated" padding="md">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-olive-600" />
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Start Following Travelers</h3>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-white/5">
              {suggestedUsers.map(user => (
                <SuggestedUserCard key={user.id} user={user} variant="horizontal" />
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Action cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link href="/albums/new">
          <GlassCard
            variant="elevated"
            hover="lift"
            padding="md"
            className="text-center group cursor-pointer h-full"
          >
            <div className="w-12 h-12 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center mx-auto mb-3 group-hover:bg-olive-200 dark:group-hover:bg-olive-900/50 transition-colors">
              <Plus className="w-6 h-6 text-olive-600 dark:text-olive-400" />
            </div>
            <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Create Your First Album</h4>
            <p className="text-xs text-stone-500">Share photos from your travels and pin them to the globe.</p>
          </GlassCard>
        </Link>

        <Link href="/globe">
          <GlassCard
            variant="elevated"
            hover="lift"
            padding="md"
            className="text-center group cursor-pointer h-full"
          >
            <div className="w-12 h-12 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center mx-auto mb-3 group-hover:bg-olive-200 dark:group-hover:bg-olive-900/50 transition-colors">
              <MapIcon className="w-6 h-6 text-olive-600 dark:text-olive-400" />
            </div>
            <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Explore the Globe</h4>
            <p className="text-xs text-stone-500">Discover adventures from travelers around the world.</p>
          </GlassCard>
        </Link>
      </motion.div>
    </div>
  )
})

EmptyFeedOnboarding.displayName = 'EmptyFeedOnboarding'

// Discover empty state with explore sections
const DiscoverExploreSection = memo(({
  destinations,
  suggestedUsers,
}: {
  destinations: PopularDestination[]
  suggestedUsers: SuggestedUser[]
}) => {
  return (
    <div className="space-y-6">
      {/* Popular destinations */}
      <PopularDestinationsSection destinations={destinations} />

      {/* Suggested travelers */}
      {suggestedUsers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Users className="w-4 h-4 text-olive-600" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Suggested Travelers</h3>
          </div>
          <GlassCard variant="elevated" padding="md">
            <div className="divide-y divide-stone-100 dark:divide-white/5">
              {suggestedUsers.map(user => (
                <SuggestedUserCard key={user.id} user={user} variant="horizontal" />
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {destinations.length === 0 && suggestedUsers.length === 0 && (
        <div className="text-center py-16">
          <Compass className="h-12 w-12 mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 text-sm">No new adventures to discover right now</p>
          <p className="text-stone-400 text-xs mt-1">Check back later for fresh content</p>
        </div>
      )}
    </div>
  )
})

DiscoverExploreSection.displayName = 'DiscoverExploreSection'

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
          <Link href={`/albums/${album.id}`}>
            <motion.h3
              className="text-lg font-bold text-stone-900 dark:text-stone-100 hover:text-olive-600 transition-colors"
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
              className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 group"
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

// Discover feed item adapter - maps DiscoverAlbum to FeedAlbum shape
function discoverToFeedAlbum(d: DiscoverAlbum): FeedAlbum {
  return {
    id: d.id,
    title: d.title,
    description: d.description || undefined,
    location: d.location_name || undefined,
    country_code: d.country_code || undefined,
    latitude: d.latitude || undefined,
    longitude: d.longitude || undefined,
    created_at: d.created_at,
    date_start: d.date_start || undefined,
    cover_image_url: d.cover_photo_url || undefined,
    likes_count: Number(d.like_count) || 0,
    comments_count: Number(d.comment_count) || 0,
    user_id: d.user_id,
    user: {
      id: d.user_id,
      username: d.owner_username,
      display_name: d.owner_display_name || d.owner_username,
      avatar_url: d.owner_avatar_url || undefined,
    },
  }
}

type FeedMode = 'following' | 'discover'

// ---------------------------------------------------------------------------
// First-time user onboarding overlay
// ---------------------------------------------------------------------------
function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const steps = [
    {
      icon: '🌍',
      title: 'Welcome to Adventure Log',
      desc: 'Your travels, visualized on a 3D globe. Create albums, share journeys, and connect with fellow explorers.',
    },
    {
      icon: '📸',
      title: 'Create Your First Album',
      desc: 'Upload photos from a trip — we\'ll extract GPS data and pin them to your globe automatically.',
      cta: { label: 'Create Album', action: () => { onComplete(); router.push('/albums/new') } },
    },
    {
      icon: '🔭',
      title: 'Discover & Connect',
      desc: 'Follow other travelers, explore trending destinations, and get inspired for your next adventure.',
      cta: { label: 'Explore Now', action: () => { onComplete(); router.push('/explore') } },
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-md w-full text-center">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-8 bg-olive-600' : 'w-1.5 bg-stone-300 dark:bg-stone-700'
              )}
            />
          ))}
        </div>

        <div className="text-5xl mb-5">{current.icon}</div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-3">{current.title}</h2>
        <p className="text-stone-600 dark:text-stone-400 mb-8 leading-relaxed">{current.desc}</p>

        <div className="flex flex-col gap-2.5">
          {current.cta ? (
            <>
              <Button
                onClick={current.cta.action}
                className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20"
              >
                {current.cta.label}
              </Button>
              <button
                onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
                className="text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors py-2"
              >
                {isLast ? 'Skip to feed' : 'Next'}
              </button>
            </>
          ) : (
            <Button
              onClick={() => setStep(s => s + 1)}
              className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20"
            >
              Get Started
            </Button>
          )}
        </div>

        <button
          onClick={onComplete}
          className="mt-6 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
        >
          Skip tour
        </button>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { albums, loading, error, refreshFeed } = useFeedData()
  const discover = useDiscoverFeed(user?.id)
  const { users: suggestedUsers } = useSuggestedUsers(user?.id, 5)
  const { destinations: popularDestinations } = usePopularDestinations(user?.id)
  const [feedMode, setFeedMode] = useState<FeedMode>('following')
  const [showJumpToPresent, setShowJumpToPresent] = useState(false)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const firstAlbumIdRef = useRef<string | null>(null)
  const supabase = createClient()

  // Show onboarding for first-time users
  useEffect(() => {
    if (user?.id) {
      const key = `adventure_log_onboarded_${user.id}`
      if (!localStorage.getItem(key)) {
        setShowOnboarding(true)
      }
    }
  }, [user?.id])

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

  // Onboarding overlay for first-time users
  if (showOnboarding && user?.id) {
    return (
      <OnboardingOverlay
        onComplete={() => {
          localStorage.setItem(`adventure_log_onboarded_${user.id}`, 'true')
          setShowOnboarding(false)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-2xl px-4 py-6">
          <FeedSkeleton count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md border border-stone-200 shadow-sm">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshFeed} variant="outline" className="bg-white border-stone-300 text-stone-900 hover:bg-stone-50">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Empty feed - show onboarding
  if (albums.length === 0 && feedMode === 'following') {
    const currentMode = feedMode as FeedMode
    return (
      <div className="max-w-3xl mx-auto">
        {/* Feed Mode Tabs - still show tabs so user can switch to Discover */}
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="flex items-center gap-1 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm rounded-xl p-1 border border-stone-200/50 dark:border-white/10 sticky top-[56px] lg:top-0 z-30">
            <button
              onClick={() => setFeedMode('following')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                currentMode === 'following'
                  ? 'bg-olive-600 dark:bg-olive-700 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.04]'
              )}
            >
              <Users className="h-4 w-4" />
              Following
            </button>
            <button
              onClick={() => setFeedMode('discover')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                currentMode === 'discover'
                  ? 'bg-olive-600 dark:bg-olive-700 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.04]'
              )}
            >
              <Compass className="h-4 w-4" />
              Discover
            </button>
          </div>
        </div>

        <NoFeedEmptyState onExplore={() => router.push('/explore')} />
      </div>
    )
  }

  const discoverAlbums = discover.albums.map(discoverToFeedAlbum)
  const activeAlbums = feedMode === 'following' ? albums : discoverAlbums
  const isActiveLoading = feedMode === 'following' ? loading : discover.loading

  return (
    <>
      {/* Main Content with optional sidebar */}
      <div className="flex justify-center gap-4 xl:gap-6">
        <div className="w-full max-w-2xl min-w-0">
          {/* Feed Mode Tabs */}
          <div className="flex items-center gap-1 mb-4 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm rounded-xl p-1 border border-stone-200/50 dark:border-white/10 sticky top-[56px] lg:top-0 z-30">
            <button
              onClick={() => setFeedMode('following')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                feedMode === 'following'
                  ? 'bg-olive-600 dark:bg-olive-700 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.04]'
              )}
            >
              <Users className="h-4 w-4" />
              Following
            </button>
            <button
              onClick={() => setFeedMode('discover')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                feedMode === 'discover'
                  ? 'bg-olive-600 dark:bg-olive-700 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.04]'
              )}
            >
              <Compass className="h-4 w-4" />
              Discover
            </button>
          </div>

          {feedMode === 'following' && (
            <>
              {/* Suggested users - mobile only horizontal row */}
              <SuggestedUsersRow users={suggestedUsers} />

              {/* Jump to Present Button */}
              <JumpToPresent
                show={showJumpToPresent}
                onJump={handleJumpToPresent}
                newItemsCount={newItemsCount}
              />

              {/* Trending Destinations Section */}
              <TrendingDestinations />
            </>
          )}

          {feedMode === 'discover' && discover.albums.length === 0 && !discover.loading && (
            <DiscoverExploreSection
              destinations={popularDestinations}
              suggestedUsers={suggestedUsers}
            />
          )}

          {/* Feed Items */}
          {isActiveLoading && activeAlbums.length === 0 ? (
            <FeedSkeleton count={3} />
          ) : (
            <motion.div
              key={feedMode}
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
              {/* Show popular destinations above discover feed items */}
              {feedMode === 'discover' && discover.albums.length > 0 && popularDestinations.length > 0 && (
                <PopularDestinationsSection destinations={popularDestinations} />
              )}

              {activeAlbums.map((album) => (
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

              {/* Load more for discover */}
              {feedMode === 'discover' && discover.hasMore && discover.albums.length > 0 && (
                <div className="text-center py-4">
                  <Button
                    onClick={discover.loadMore}
                    variant="outline"
                    className="rounded-xl"
                    disabled={discover.loading}
                  >
                    {discover.loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Desktop Sidebar - suggested users */}
        <SuggestedUsersSidebar users={suggestedUsers} />
      </div>
    </>
  )
}
