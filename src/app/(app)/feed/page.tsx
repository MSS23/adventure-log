'use client'

import { useState, memo, useEffect } from 'react'
import { Heart, MessageCircle, MapPin, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { useFeedData } from '@/lib/hooks/useFeedData'
import { instagramStyles } from '@/lib/design-tokens'

interface FeedAlbum {
  id: string
  title: string
  description?: string
  location?: string
  created_at: string
  cover_image_url?: string
  user: {
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
  <div className={cn(instagramStyles.card, "overflow-hidden")}>
    {/* Post Header */}
    <div className="flex items-center justify-between p-4">
      <Link
        href={`/profile/${album.user.username}`}
        className="flex items-center gap-3 hover:opacity-80 transition"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={album.user.avatar_url} />
          <AvatarFallback>
            {album.user.display_name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className={cn(instagramStyles.text.heading, "text-sm")}>
            {album.user.display_name}
          </p>
          {album.location && (
            <p className={cn(instagramStyles.text.caption, "text-xs flex items-center gap-1")}>
              <MapPin className="h-3 w-3" />
              {album.location}
            </p>
          )}
        </div>
      </Link>
      <p className={cn(instagramStyles.text.caption, "text-xs")}>
        {formatTimeAgo(album.created_at)}
      </p>
    </div>

    {/* Post Image */}
    <Link href={`/albums/${album.id}`}>
      <div className="relative w-full aspect-square bg-gray-100">
        {album.cover_image_url ? (
          <Image
            src={album.cover_image_url}
            alt={album.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <MapPin className="h-12 w-12" />
          </div>
        )}
      </div>
    </Link>

    {/* Post Actions */}
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onToggleLike(album.id)}
          className="hover:opacity-70 transition"
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <Heart
            className={cn(
              "h-6 w-6",
              isLiked ? "fill-red-500 text-red-500" : "text-gray-700"
            )}
          />
        </button>
        <Link href={`/albums/${album.id}#comments`}>
          <MessageCircle className="h-6 w-6 text-gray-700 hover:opacity-70 transition" />
        </Link>
      </div>

      {/* Post Content */}
      <div>
        <Link href={`/albums/${album.id}`}>
          <h3 className={cn(instagramStyles.text.heading, "text-base mb-1")}>
            {album.title}
          </h3>
        </Link>
        {album.description && (
          <p className={cn(instagramStyles.text.body, "text-sm line-clamp-2")}>
            <span className="font-semibold">{album.user.username}</span>{' '}
            {album.description}
          </p>
        )}
      </div>
    </div>
  </div>
))

FeedItem.displayName = 'FeedItem'

export default function FeedPage() {
  const { albums, loading, error, refreshFeed } = useFeedData()
  const [likedAlbums, setLikedAlbums] = useState<Set<string>>(new Set())

  // Auto-refresh feed every 30 seconds (like Instagram)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFeed()
    }, 30000) // 30 seconds

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
    <div className="max-w-2xl mx-auto space-y-4 pb-32 md:pb-8">
      {/* Feed Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={cn(instagramStyles.text.heading, "text-2xl")}>
          Feed
        </h1>
      </div>

      {/* Feed Items */}
      <div className="space-y-6">
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
