'use client'

import { useState, memo, useEffect, useMemo } from 'react'
import { Heart, MessageCircle, MapPin, Loader2, Globe, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { instagramStyles } from '@/lib/design-tokens'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'

interface FeedAlbum {
  id: string
  title: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  created_at: string
  cover_image_url?: string
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
  album,
  isLiked,
  onToggleLike
}: {
  album: FeedAlbum
  isLiked: boolean
  onToggleLike: (id: string) => void
}) => (
  <div className={cn(instagramStyles.card, "overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white rounded-xl border-2 border-gray-100")}>
    {/* Album Header - Travel Card Style */}
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b-2 border-gray-100">
      <div className="flex items-center justify-between">
        <Link
          href={`/profile/${album.user.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition flex-1"
        >
          <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
            <AvatarImage src={album.user.avatar_url && album.user.avatar_url.startsWith('http') ? album.user.avatar_url : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600 text-white font-semibold">
              {album.user.display_name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {album.user.display_name}
            </p>
            <p className="text-xs text-gray-600 truncate">
              @{album.user.username}
            </p>
          </div>
        </Link>
        <div className="text-right ml-2">
          <p className="text-xs font-medium text-gray-600">
            {formatTimeAgo(album.created_at)}
          </p>
        </div>
      </div>

      {/* Location Badge */}
      {album.location && (
        <div className="mt-3 inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
          <MapPin className="h-3.5 w-3.5 text-orange-600" />
          <span className="text-xs font-semibold text-gray-800">{album.location}</span>
        </div>
      )}
    </div>

    {/* Album Image - Travel Photo Style */}
    <div className="relative bg-gray-50">
      <Link href={`/albums/${album.id}`} className="relative block">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
          {album.cover_image_url && album.cover_image_url.startsWith('http') ? (
            <Image
              src={album.cover_image_url}
              alt={album.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              loading="lazy"
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <MapPin className="h-16 w-16" />
            </div>
          )}
        </div>
      </Link>

      {/* Mini Earth Button - Opens Globe at this location */}
      {album.latitude && album.longitude && (
        <Link
          href={`/globe?album=${album.id}&lat=${album.latitude}&lng=${album.longitude}&user=${album.user_id}`}
          className="absolute bottom-6 right-6 z-10 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            {/* Pulsing Ring Animation - Behind button */}
            <div className="absolute inset-0 rounded-full bg-blue-500 opacity-75 animate-ping"></div>

            {/* Button Background with Gradient */}
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center group-hover:scale-110 active:scale-95">
              <Globe className="h-6 w-6 text-white" />
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                View on Globe
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>

    {/* Album Details - Card Footer */}
    <div className="p-5 space-y-4">
      {/* Title and Description */}
      <div className="space-y-2">
        <Link href={`/albums/${album.id}`} className="block group">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
            {album.title}
          </h3>
        </Link>
        {album.description && (
          <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
            {album.description}
          </p>
        )}
      </div>

      {/* Interaction Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleLike(album.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 active:scale-95 transition-all group"
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isLiked ? "fill-red-500 text-red-500" : "text-gray-600 group-hover:text-red-500"
              )}
            />
            <span className={cn(
              "text-sm font-medium",
              isLiked ? "text-red-600" : "text-gray-600 group-hover:text-red-600"
            )}>
              {isLiked ? "Liked" : "Like"}
            </span>
          </button>
          <Link
            href={`/albums/${album.id}#comments`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 active:scale-95 transition-all group"
          >
            <MessageCircle className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
            <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Comment</span>
          </Link>
        </div>
        <Link
          href={`/albums/${album.id}`}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
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
  const [likedAlbums, setLikedAlbums] = useState<Set<string>>(new Set())
  const [highlightsMode, setHighlightsMode] = useState<'all' | 'friends'>('all')
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

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

  // Auto-refresh feed every 5 minutes (reduced for memory optimization)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFeed()
    }, 300000) // 5 minutes instead of 30 seconds to reduce memory usage

    return () => clearInterval(interval)
  }, [refreshFeed])

  const toggleLike = (albumId: string) => {
    setLikedAlbums(prev => {
      const newSet = new Set(prev)
      if (newSet.has(albumId)) {
        newSet.delete(albumId)
      } else {
        newSet.add(albumId)
      }
      return newSet
    })
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
    <div className="max-w-3xl mx-auto space-y-6 pb-32 md:pb-8 px-4">
      {/* Feed Header */}
      <div className="flex items-center justify-between mb-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Adventure Feed
          </h1>
          <p className="text-sm text-gray-600">
            Discover amazing travel stories from the community
          </p>
        </div>
      </div>

      {/* Community Stats Widget */}
      {albums.length > 0 && (
        <Card className="overflow-hidden border-gray-200 shadow-md hover:shadow-xl transition-shadow duration-300 mb-6 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                {highlightsMode === 'all' ? (
                  <>
                    <Globe className="h-5 w-5" />
                    Community Highlights This Week
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    Friends Highlights This Week
                  </>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHighlightsMode(highlightsMode === 'all' ? 'friends' : 'all')}
                className="text-white hover:bg-white/20 h-8 px-3"
              >
                {highlightsMode === 'all' ? (
                  <>
                    <Users className="h-4 w-4 mr-1" />
                    Friends
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-1" />
                    All Users
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Most Traveled Location */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-900">Trending Destination</p>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  {(() => {
                    const locationCounts = new Map<string, number>()
                    filteredAlbums.forEach(album => {
                      if (album.location) {
                        locationCounts.set(album.location, (locationCounts.get(album.location) || 0) + 1)
                      }
                    })
                    const topLocation = Array.from(locationCounts.entries())
                      .sort((a, b) => b[1] - a[1])[0]
                    return topLocation ? topLocation[0].split(',')[0] : 'No data'
                  })()}
                </p>
              </div>

              {/* Total Albums This Week */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-semibold text-purple-900">New Adventures</p>
                </div>
                <p className="text-lg font-bold text-purple-900">
                  {filteredAlbums.length} {filteredAlbums.length === 1 ? 'album' : 'albums'}
                </p>
              </div>

              {/* Most Active Traveler */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-orange-600" />
                  <p className="text-xs font-semibold text-orange-900">Top Explorer</p>
                </div>
                <p className="text-sm font-bold text-orange-900 truncate">
                  {(() => {
                    const userCounts = new Map<string, { name: string; count: number }>()
                    filteredAlbums.forEach(album => {
                      const name = album.user.display_name
                      const current = userCounts.get(album.user_id) || { name, count: 0 }
                      userCounts.set(album.user_id, { name, count: current.count + 1 })
                    })
                    const topUser = Array.from(userCounts.values())
                      .sort((a, b) => b.count - a.count)[0]
                    return topUser ? `${topUser.name} (${topUser.count})` : 'No data'
                  })()}
                </p>
              </div>

              {/* Countries Visited */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-semibold text-green-900">Countries Explored</p>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {(() => {
                    const countries = new Set<string>()
                    filteredAlbums.forEach(album => {
                      if (album.country) {
                        countries.add(album.country)
                      }
                    })
                    return countries.size || 'N/A'
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed Items */}
      <div className="space-y-8">
        {albums.map((album) => (
          <FeedItem
            key={album.id}
            album={album}
            isLiked={likedAlbums.has(album.id)}
            onToggleLike={toggleLike}
          />
        ))}
      </div>
    </div>
  )
}
