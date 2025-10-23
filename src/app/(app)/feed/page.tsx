'use client'

import { useState, memo, useEffect, useMemo, useRef } from 'react'
import { Heart, MessageCircle, MapPin, Loader2, Globe, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { instagramStyles } from '@/lib/design-tokens'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { LikeButton } from '@/components/social/LikeButton'
import { CountryShowcase } from '@/components/feed/CountryShowcase'
import { JumpToPresent } from '@/components/common/JumpToPresent'

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

// Memoized feed item component for performance
const FeedItem = memo(({
  album
}: {
  album: FeedAlbum
}) => (
  <div className="overflow-hidden hover:shadow-lg transition-all duration-200 bg-white rounded-lg border border-gray-200">
    {/* Album Header - Clean Style */}
    <div className="bg-white p-4 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatarLink user={album.user}>
            <Avatar className="h-10 w-10 sm:h-11 sm:w-11">
              <AvatarImage src={album.user.avatar_url && album.user.avatar_url.startsWith('http') ? album.user.avatar_url : undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-medium text-sm">
                {album.user.display_name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </UserAvatarLink>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {album.user.display_name}
            </p>
            <UserLink user={album.user} className="text-xs text-gray-500 hover:text-blue-600 truncate block">
              @{album.user.username}
            </UserLink>
          </div>
        </div>
        <div className="text-right ml-2 flex-shrink-0">
          <p className="text-xs text-gray-500">
            {formatTimeAgo(album.created_at)}
          </p>
        </div>
      </div>

      {/* Location Badge */}
      {album.location && (
        <div className="mt-3 inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          <MapPin className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-700 truncate">{album.location}</span>
        </div>
      )}
    </div>

    {/* Album Image - Clean Style */}
    <div className="relative bg-gray-100">
      <Link href={`/albums/${album.id}`} className="relative block group">
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {album.cover_image_url && album.cover_image_url.startsWith('http') ? (
            <Image
              src={album.cover_image_url}
              alt={album.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              style={{
                objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%`
              }}
              sizes="(max-width: 768px) 100vw, 672px"
              loading="lazy"
              quality={85}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <MapPin className="h-12 w-12 text-gray-300" />
            </div>
          )}
        </div>
      </Link>

      {/* Globe Button - Simplified */}
      {album.latitude && album.longitude && (
        <Link
          href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
          className="absolute bottom-3 right-3 z-10 group/globe"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group-hover/globe:scale-110 active:scale-95">
            <Globe className="h-5 w-5 text-white" />
          </div>
        </Link>
      )}
    </div>

    {/* Album Details - Clean Footer */}
    <div className="p-4 space-y-3">
      {/* Title and Description */}
      <div className="space-y-1.5">
        <Link href={`/albums/${album.id}`} className="block group">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {album.title}
          </h3>
        </Link>
        {album.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {album.description}
          </p>
        )}
      </div>

      {/* Interaction Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <LikeButton albumId={album.id} showCount={true} size="sm" />
          <Link
            href={`/albums/${album.id}#comments`}
            className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {album.comments_count}
            </span>
          </Link>
        </div>
        <Link
          href={`/albums/${album.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Album →
        </Link>
      </div>
    </div>
  </div>
))

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
    <div className="max-w-3xl mx-auto pb-32 md:pb-8 px-2 sm:px-4">
      {/* Jump to Present Button */}
      <JumpToPresent
        show={showJumpToPresent}
        onJump={handleJumpToPresent}
        newItemsCount={newItemsCount}
      />

      {/* Feed Header - Clean */}
      <div className="py-4 sm:py-6 border-b border-gray-100 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          Feed
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Discover travel stories from the community
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feed" className="w-full">
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
          />
        </TabsContent>

        <TabsContent value="countries">
          <CountryShowcase />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Extract feed tab content to its own component
interface FeedTabContentProps {
  filteredAlbums: FeedAlbum[]
  highlightsMode: 'all' | 'friends'
  setHighlightsMode: (mode: 'all' | 'friends') => void
}

function FeedTabContent({ filteredAlbums, highlightsMode, setHighlightsMode }: FeedTabContentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Community Stats Widget - Always Show */}
      <Card className="overflow-hidden border-0 shadow-sm mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-4 bg-white border-b px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 text-gray-900">
              {highlightsMode === 'all' ? (
                <>
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
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
        <CardContent className="p-3 sm:p-4">
          {filteredAlbums.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-2 sm:mb-3" />
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
                className="h-8 sm:h-9"
              >
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm">View All Posts</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Trending Destination */}
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-100">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-blue-900 truncate">Trending</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-blue-900 truncate">
                  {(() => {
                    const locationCounts = new Map<string, number>()
                    filteredAlbums.forEach(album => {
                      if (album.location) {
                        locationCounts.set(album.location, (locationCounts.get(album.location) || 0) + 1)
                      }
                    })
                    const topLocation = Array.from(locationCounts.entries())
                      .sort((a, b) => b[1] - a[1])[0]
                    return topLocation ? topLocation[0].split(',')[0] : 'N/A'
                  })()}
                </p>
              </div>

              {/* New Adventures */}
              <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-100">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-purple-900 truncate">Adventures</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-purple-900">
                  {filteredAlbums.length}
                </p>
              </div>

              {/* Countries */}
              <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-100">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-green-900 truncate">Countries</p>
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

              {/* Top Explorer */}
              <div className="bg-orange-50 rounded-lg p-2 sm:p-3 border border-orange-100">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-orange-900 truncate">Top Explorer</p>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
