'use client'

import { useState, memo, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Heart, MessageCircle, MapPin, Loader2, Globe, Users } from 'lucide-react'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { instagramStyles } from '@/lib/design-tokens'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { FollowButton } from '@/components/social/FollowButton'
import { CountryShowcase } from '@/components/feed/CountryShowcase'
import { JumpToPresent } from '@/components/common/JumpToPresent'
import { SuggestedUsers } from '@/components/social/SuggestedUsers'
import { PhotoCarousel } from '@/components/feed/PhotoCarousel'
import { saveTabState, getTabState } from '@/lib/hooks/useSmartNavigation'

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

function formatTimeAgo(timestamp: string) {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}

// Memoized feed item component for performance - Modern social media style
const FeedItem = memo(({
  album,
  currentUserId
}: {
  album: FeedAlbum
  currentUserId?: string
}) => {
  const isOwnAlbum = currentUserId === album.user_id

  return (
  <div className="bg-white dark:bg-[#1A2332] border-b border-gray-100 dark:border-gray-800/50 w-full max-w-[650px] mx-auto rounded-lg overflow-hidden mb-4">
    {/* Header - Minimalist with user and follow */}
    <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <UserAvatarLink user={album.user}>
          <OptimizedAvatar
            src={album.user.avatar_url}
            alt={album.user.display_name}
            fallback={album.user.display_name[0]?.toUpperCase() || 'U'}
            size="md"
          />
        </UserAvatarLink>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <UserLink user={album.user} className="text-sm font-semibold text-gray-900 dark:text-white hover:opacity-60 transition-opacity truncate">
              {album.user.username}
            </UserLink>
            {!isOwnAlbum && (
              <FollowButton
                userId={album.user_id}
                size="sm"
                showText={true}
                className="ml-auto"
              />
            )}
          </div>
          {album.location && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{album.location}</p>
          )}
        </div>
      </div>
    </div>

    {/* Image Carousel - Full width, portrait style */}
    <div className="relative block group overflow-hidden">
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

    {/* Actions Bar - Clean minimal icons with proper touch targets */}
    <div className="px-3 sm:px-4 py-2 sm:py-2.5">
      <div className="flex items-center gap-3 sm:gap-4">
        <LikeButton albumId={album.id} showCount={false} size="sm" />
        <Link href={`/albums/${album.id}#comments`}>
          <button className="min-w-[44px] min-h-[44px] p-2.5 sm:p-2 -m-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900 dark:text-white" strokeWidth={1.5} />
          </button>
        </Link>
        {album.latitude && album.longitude && (
          <Link
            href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
          >
            <button className="min-w-[44px] min-h-[44px] p-2.5 sm:p-2 -m-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900 dark:text-white" strokeWidth={1.5} />
            </button>
          </Link>
        )}
      </div>
    </div>

    {/* Caption - Minimalist style */}
    <div className="px-3 sm:px-4 pb-1">
      <div className="text-sm break-words">
        <span className="font-semibold text-gray-900 dark:text-white">{album.user.username}</span>
        {' '}
        <span className="text-gray-900 dark:text-gray-100 line-clamp-2">{album.title}</span>
      </div>
      {album.description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2 break-words">{album.description}</p>
      )}
    </div>

    {/* Comments section */}
    {album.comments_count > 0 && (
      <Link href={`/albums/${album.id}#comments`} className="px-3 sm:px-4 pb-1 block">
        <p className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          View all {album.comments_count} comment{album.comments_count !== 1 ? 's' : ''}
        </p>
      </Link>
    )}

    {/* Timestamp */}
    <div className="px-3 sm:px-4 pb-2.5 sm:pb-3">
      <Link href={`/albums/${album.id}`} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 uppercase font-medium">
        {formatTimeAgo(album.created_at)}
      </Link>
    </div>
  </div>
  )
})

FeedItem.displayName = 'FeedItem'

export default function FeedPage() {
  const { user, profile } = useAuth()
  const { albums, loading, error, refreshFeed } = useFeedData()
  const searchParams = useSearchParams()
  const [highlightsMode, setHighlightsMode] = useState<'all' | 'friends'>('all')
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [showJumpToPresent, setShowJumpToPresent] = useState(false)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'feed' | 'countries'>('feed')
  const firstAlbumIdRef = useRef<string | null>(null)
  const supabase = createClient()

  // Check URL parameter and saved state for tab selection
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'countries') {
      setActiveTab('countries')
      saveTabState('countries')
    } else {
      // Check saved tab state from navigation
      const savedTab = getTabState()
      if (savedTab === 'countries') {
        setActiveTab('countries')
      } else {
        setActiveTab('feed')
        saveTabState('feed')
      }
    }
  }, [searchParams])

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(instagramStyles.card, "text-center py-12")}>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refreshFeed} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className={cn(instagramStyles.card, "text-center py-16")}>
        <h3 className={cn(instagramStyles.text.heading, "text-lg mb-2")}>
          No posts yet
        </h3>
        <p className={instagramStyles.text.muted}>
          Start following others or create your first album to see content here.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A1628]">
      <div className="max-w-6xl mx-auto pt-4 sm:pt-6 lg:pt-8">
        {/* Modern two column layout */}
        <div className="flex gap-6 lg:gap-8 px-3 sm:px-4 lg:px-4">
          {/* Main Feed Column */}
          <div className="flex-1 w-full max-w-full lg:max-w-[630px]">
            {/* Jump to Present Button */}
            <JumpToPresent
              show={showJumpToPresent}
              onJump={handleJumpToPresent}
              newItemsCount={newItemsCount}
            />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        const newTab = value as 'feed' | 'countries'
        setActiveTab(newTab)
        saveTabState(newTab) // Save to session storage for navigation state
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4 sm:mb-6">
          <TabsTrigger value="feed" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Feed</span>
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Countries</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <FeedTabContent
            filteredAlbums={filteredAlbums}
            highlightsMode={highlightsMode}
            setHighlightsMode={setHighlightsMode}
            currentUserId={user?.id}
          />
        </TabsContent>

        <TabsContent value="countries">
          <CountryShowcase />
        </TabsContent>
      </Tabs>
          </div>

          {/* Suggestions Sidebar removed - now in SuggestionsSidebar component */}
        </div>
      </div>
    </div>
  )
}

// Extract feed tab content to its own component
interface FeedTabContentProps {
  filteredAlbums: FeedAlbum[]
  highlightsMode: 'all' | 'friends'
  setHighlightsMode: (mode: 'all' | 'friends') => void
  currentUserId?: string
}

function FeedTabContent({ filteredAlbums, highlightsMode, setHighlightsMode, currentUserId }: FeedTabContentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Community Stats Widget - Always Show */}
      <Card className="overflow-hidden border-0 shadow-sm mb-4 sm:mb-6 dark:bg-[#1A2332] dark:border-gray-700/30">
        <CardHeader className="pb-3 sm:pb-4 bg-white dark:bg-[#1E293B] border-b dark:border-gray-700/30 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 text-gray-900 dark:text-white">
              {highlightsMode === 'all' ? (
                <>
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  <span className="truncate">Community Highlights</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="truncate">Friends Highlights</span>
                </>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHighlightsMode(highlightsMode === 'all' ? 'friends' : 'all')}
              className="h-7 sm:h-8 text-xs flex-shrink-0"
            >
              {highlightsMode === 'all' ? (
                <>
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Friends</span>
                </>
              ) : (
                <>
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">All</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 dark:bg-[#1A2332]">
          {filteredAlbums.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-1">
                {highlightsMode === 'friends' ? 'No posts from friends yet' : 'No posts yet'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 px-4">
                {highlightsMode === 'friends'
                  ? 'Follow more people to see their travel stories here'
                  : 'Create your first album or follow others to see content'
                }
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHighlightsMode('all')}
                className="h-8 sm:h-9"
              >
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm">View All Posts</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Trending Destination This Month */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-blue-900 dark:text-blue-300 truncate">Top Spot</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200 truncate">
                  {(() => {
                    // Calculate location popularity by total likes
                    const locationStats = new Map<string, { count: number; likes: number }>()
                    filteredAlbums.forEach(album => {
                      if (album.location) {
                        const current = locationStats.get(album.location) || { count: 0, likes: 0 }
                        locationStats.set(album.location, {
                          count: current.count + 1,
                          likes: current.likes + (album.likes_count || 0)
                        })
                      }
                    })

                    // Sort by total likes first, then by count as tiebreaker
                    const topLocation = Array.from(locationStats.entries())
                      .sort((a, b) => {
                        // First sort by likes
                        if (b[1].likes !== a[1].likes) {
                          return b[1].likes - a[1].likes
                        }
                        // Then by count if likes are equal
                        return b[1].count - a[1].count
                      })[0]

                    // If no likes exist anywhere, fall back to most recent location
                    if (topLocation && topLocation[1].likes > 0) {
                      return topLocation[0].split(',')[0]
                    } else if (filteredAlbums.length > 0 && filteredAlbums[0].location) {
                      // Show most recent location if no likes exist
                      return filteredAlbums[0].location.split(',')[0]
                    }
                    return 'N/A'
                  })()}
                </p>
              </div>

              {/* Albums Posted This Month */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 sm:p-3 border border-purple-100 dark:border-purple-800/30">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-purple-900 dark:text-purple-300 truncate">Albums</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-200">
                  {filteredAlbums.length}
                </p>
              </div>

              {/* Countries Visited This Month */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3 border border-green-100 dark:border-green-800/30">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-green-900 dark:text-green-300 truncate">Countries</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-200">
                  {(() => {
                    const countries = new Set<string>()
                    filteredAlbums.forEach(album => {
                      if (album.country) {
                        countries.add(album.country)
                      }
                    })
                    return countries.size || 0
                  })()}
                </p>
              </div>

              {/* Most Active Explorer This Month */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 sm:p-3 border border-orange-100 dark:border-orange-800/30">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-orange-900 dark:text-orange-300 truncate">Top Explorer</p>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-orange-900 dark:text-orange-200 truncate">
                  {(() => {
                    const userCounts = new Map<string, { name: string; count: number }>()
                    filteredAlbums.forEach(album => {
                      const name = album.user.display_name
                      const current = userCounts.get(album.user_id) || { name, count: 0 }
                      userCounts.set(album.user_id, { name, count: current.count + 1 })
                    })
                    const topUser = Array.from(userCounts.values())
                      .sort((a, b) => b.count - a.count)[0]
                    return topUser ? `${topUser.name}` : 'N/A'
                  })()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feed Items */}
      {filteredAlbums.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {filteredAlbums.map((album) => (
            <FeedItem
              key={album.id}
              album={album}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
