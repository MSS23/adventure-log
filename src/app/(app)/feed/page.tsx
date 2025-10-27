'use client'

import { useState, memo, useEffect, useMemo, useRef } from 'react'
import { Heart, MessageCircle, MapPin, Loader2, Globe, Users, Camera } from 'lucide-react'
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
import { FollowButton } from '@/components/social/FollowButton'
import { CountryShowcase } from '@/components/feed/CountryShowcase'
import { JumpToPresent } from '@/components/common/JumpToPresent'
import { SuggestedUsers } from '@/components/social/SuggestedUsers'
import { getPhotoUrl } from '@/lib/utils/photo-url'

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
  <div className="bg-white border-b border-gray-100 max-w-[650px] mx-auto">
    {/* Header - Minimalist with user and follow */}
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatarLink user={album.user}>
          <div className="relative">
            <Avatar className="h-10 w-10 ring-1 ring-gray-200">
              <AvatarImage src={getPhotoUrl(album.user.avatar_url, 'avatars') || ''} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-xs">
                {album.user.display_name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </UserAvatarLink>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <UserLink user={album.user} className="text-sm font-semibold text-gray-900 hover:opacity-60 transition-opacity truncate">
              {album.user.username}
            </UserLink>
            {!isOwnAlbum && (
              <>
                <span className="text-gray-300">•</span>
                <FollowButton
                  userId={album.user_id}
                  size="sm"
                  showText={true}
                  variant="default"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-xs bg-transparent hover:bg-transparent p-0 h-auto shadow-none"
                />
              </>
            )}
          </div>
          {album.location && (
            <p className="text-xs text-gray-500 truncate">{album.location}</p>
          )}
        </div>
      </div>
    </div>

    {/* Image - Full width, portrait style like second screenshot */}
    <Link href={`/albums/${album.id}`} className="relative block group overflow-hidden">
      <div className="relative aspect-[4/5] bg-gradient-to-br from-gray-900 to-gray-800">
        {album.cover_image_url && album.cover_image_url.startsWith('http') ? (
          <Image
            src={album.cover_image_url}
            alt={album.title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            style={{
              objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%`
            }}
            sizes="(max-width: 768px) 100vw, 600px"
            loading="lazy"
            quality={90}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <Camera className="h-20 w-20 text-gray-300 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No image</p>
          </div>
        )}

        {/* Globe Button - Floating bottom right */}
        {album.latitude && album.longitude && (
          <div
            className="absolute bottom-4 right-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
              className="block"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 ring-2 ring-white">
                <Globe className="h-5 w-5 text-white" />
              </div>
            </Link>
          </div>
        )}
      </div>
    </Link>

    {/* Actions Bar - Clean minimal icons */}
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-6">
        <LikeButton albumId={album.id} showCount={false} size="sm" />
        <Link href={`/albums/${album.id}#comments`} className="group">
          <MessageCircle className="h-6 w-6 text-gray-900 group-hover:opacity-50 transition-opacity" strokeWidth={1.5} />
        </Link>
        {album.latitude && album.longitude && (
          <Link
            href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
            className="ml-auto"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}
      </div>
    </div>

    {/* Caption - Minimalist style */}
    <div className="px-4 pb-1">
      <div className="text-sm">
        <span className="font-semibold text-gray-900">{album.user.username}</span>
        {' '}
        <span className="text-gray-900">{album.title}</span>
      </div>
      {album.description && (
        <p className="text-sm text-gray-700 mt-1 line-clamp-2">{album.description}</p>
      )}
    </div>

    {/* Comments section */}
    {album.comments_count > 0 && (
      <Link href={`/albums/${album.id}#comments`} className="px-4 pb-1 block">
        <p className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          View all {album.comments_count} comment{album.comments_count !== 1 ? 's' : ''}
        </p>
      </Link>
    )}

    {/* Timestamp */}
    <div className="px-4 pb-3">
      <Link href={`/albums/${album.id}`} className="text-xs text-gray-400 hover:text-gray-600 uppercase font-medium">
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
  const [highlightsMode, setHighlightsMode] = useState<'all' | 'friends'>('all')
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [showJumpToPresent, setShowJumpToPresent] = useState(false)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'feed' | 'countries'>('feed')
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
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Modern two column layout */}
        <div className="flex gap-8 px-4">
          {/* Main Feed Column */}
          <div className="flex-1 max-w-[630px]">
            {/* Jump to Present Button */}
            <JumpToPresent
              show={showJumpToPresent}
              onJump={handleJumpToPresent}
              newItemsCount={newItemsCount}
            />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'feed' | 'countries')} className="w-full">
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

          {/* Suggestions Sidebar - Modern social style (hidden on mobile) */}
          <div className="hidden xl:block w-[320px] flex-shrink-0">
            <div className="sticky top-8">
              {/* User Profile Card */}
              {profile && (
                <div className="mb-6">
                  <Link href="/profile" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <Avatar className="h-14 w-14 ring-2 ring-gray-200">
                      <AvatarImage src={getPhotoUrl(profile.avatar_url, 'avatars') || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white font-semibold">
                        {profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.username}</p>
                      <p className="text-xs text-gray-500 truncate">{profile.display_name}</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Suggested for You */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500">Suggested for you</h3>
                  <Link href="/search" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    See All
                  </Link>
                </div>

                <SuggestedUsers currentUserId={user?.id} />
              </div>

              {/* Footer links */}
              <div className="mt-6 px-4">
                <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-4">
                  <Link href="/privacy" className="hover:underline">Privacy</Link>
                  <span>·</span>
                  <Link href="/terms" className="hover:underline">Terms</Link>
                  <span>·</span>
                  <Link href="/settings" className="hover:underline">Settings</Link>
                </div>
                <p className="text-xs text-gray-400">© 2025 ADVENTURE LOG</p>
              </div>
            </div>
          </div>
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
              {/* Trending Destination This Month */}
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-100">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-blue-900 truncate">Top Spot</p>
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

              {/* Albums Posted This Month */}
              <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-100">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                  <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium text-purple-900 truncate">Albums</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-purple-900">
                  {filteredAlbums.length}
                </p>
              </div>

              {/* Countries Visited This Month */}
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

              {/* Most Active Explorer This Month */}
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
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
