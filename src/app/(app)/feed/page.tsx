'use client'

import { useState, memo, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Heart, MessageCircle, MapPin, Loader2, Globe, Users } from 'lucide-react'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { FollowButton } from '@/components/social/FollowButton'
import { CountryShowcase } from '@/components/feed/CountryShowcase'
import { JumpToPresent } from '@/components/common/JumpToPresent'
import { PhotoCarousel } from '@/components/feed/PhotoCarousel'
import { saveTabState, getTabState } from '@/lib/hooks/useSmartNavigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SuggestionsSidebar } from '@/components/layout/SuggestionsSidebar'

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

// Memoized feed item component for performance - Dark elegant style
const FeedItem = memo(({
  album,
  currentUserId
}: {
  album: FeedAlbum
  currentUserId?: string
}) => {
  const isOwnAlbum = currentUserId === album.user_id
  const albumDate = album.date_start || album.created_at
  const dateFormatted = new Date(albumDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
  <div className="bg-white rounded-2xl overflow-hidden mb-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
    {/* Header - User info with location and date */}
    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatarLink user={album.user}>
          <OptimizedAvatar
            src={album.user.avatar_url}
            alt={album.user.display_name}
            fallback={album.user.display_name[0]?.toUpperCase() || 'U'}
            size="md"
            className="ring-2 ring-gray-200"
          />
        </UserAvatarLink>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <UserLink user={album.user} className="text-sm font-semibold text-gray-900 hover:text-teal-600 transition-colors truncate">
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
            <p className="text-xs text-gray-600 truncate">
              {album.location} • {dateFormatted}
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Image Carousel - Full width photo */}
    <div className="relative block group">
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

    {/* Album Info & Engagement */}
    <div className="px-6 py-4">
      {/* Album Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3">{album.title}</h3>

      {/* Engagement Stats & Globe Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-gray-600">
          <button className="flex items-center gap-1.5 hover:text-teal-600 transition-colors">
            <LikeButton albumId={album.id} showCount={false} size="sm" />
            <span className="text-sm">{album.likes_count} Likes</span>
          </button>
          <Link href={`/albums/${album.id}#comments`} className="flex items-center gap-1.5 hover:text-teal-600 transition-colors">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">{album.comments_count} Comments</span>
          </Link>
        </div>
        {album.latitude && album.longitude && (
          <Link
            href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
            className="text-teal-600 text-sm hover:underline font-medium"
          >
            View on Globe
          </Link>
        )}
      </div>

      {/* Description */}
      {album.description && (
        <p className="text-sm text-gray-700 mt-3 line-clamp-2 break-words">{album.description}</p>
      )}
    </div>
  </div>
  )
})

FeedItem.displayName = 'FeedItem'

export default function FeedPage() {
  const { user } = useAuth()
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No posts yet
          </h3>
          <p className="text-gray-600">
            Start following others or create your first album to see content here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Three-column layout */}
      <div className="flex">
        {/* Left Sidebar - Navigation & Stories (hidden on mobile) */}
        <Sidebar />

        {/* Center Feed Column */}
        <main className="flex-1 w-full lg:ml-[240px] xl:ml-[280px] xl:mr-[320px] min-h-screen">
          <div className="max-w-3xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
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
              saveTabState(newTab)
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6 bg-white border-gray-200">
                <TabsTrigger value="feed" className="flex items-center gap-2 text-sm data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 text-gray-600">
                  <Heart className="h-4 w-4" />
                  <span>Feed</span>
                </TabsTrigger>
                <TabsTrigger value="countries" className="flex items-center gap-2 text-sm data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 text-gray-600">
                  <Globe className="h-4 w-4" />
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
        </main>

        {/* Right Sidebar - Suggestions */}
        <SuggestionsSidebar />
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
      <Card className="overflow-hidden border border-gray-200 shadow-sm mb-4 sm:mb-6 bg-white">
        <CardHeader className="pb-3 sm:pb-4 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 text-gray-900">
              {highlightsMode === 'all' ? (
                <>
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                  <span className="truncate">Community Highlights</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                  <span className="truncate">Friends Highlights</span>
                </>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHighlightsMode(highlightsMode === 'all' ? 'friends' : 'all')}
              className="h-7 sm:h-8 text-xs flex-shrink-0 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
        <CardContent className="p-3 sm:p-4 bg-white">
          {filteredAlbums.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1">
                {highlightsMode === 'friends' ? 'No posts from friends yet' : 'No posts yet'}
              </p>
              <p className="text-xs text-gray-600 mb-3 sm:mb-4 px-4">
                {highlightsMode === 'friends'
                  ? 'Follow more people to see their travel stories here'
                  : 'Create your first album or follow others to see content'
                }
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHighlightsMode('all')}
                className="h-8 sm:h-9 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm">View All Posts</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Trending Destination This Month */}
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-blue-700 truncate">Top Spot</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-blue-900 truncate">
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
              <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-200">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-purple-700 truncate">Albums</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-purple-900">
                  {filteredAlbums.length}
                </p>
              </div>

              {/* Countries Visited This Month */}
              <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-green-700 truncate">Countries</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-green-900">
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
              <div className="bg-orange-50 rounded-lg p-2 sm:p-3 border border-orange-200">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-orange-700 truncate">Top Explorer</p>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-orange-900 truncate">
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
