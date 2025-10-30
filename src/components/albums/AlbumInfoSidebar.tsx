'use client'

import { useState } from 'react'
import { Album, User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Globe, ChevronDown } from 'lucide-react'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface AlbumInfoSidebarProps {
  album: Album
  user?: User | null
  isOwnAlbum: boolean
  onFollowClick?: () => void
  followStatus?: string
  followLoading?: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
  onLikeClick: () => void
  onCommentClick: () => void
  onGlobeClick: () => void
  className?: string
}

export function AlbumInfoSidebar({
  album,
  user,
  isOwnAlbum,
  onFollowClick,
  followStatus,
  followLoading,
  likeCount,
  commentCount,
  isLiked,
  onLikeClick,
  onCommentClick,
  onGlobeClick,
  className
}: AlbumInfoSidebarProps) {
  const [showPhotoDetails, setShowPhotoDetails] = useState(false)

  // Get user data from album relations
  const albumUser = user || album.user || (album as unknown as { users?: User }).users

  // Format date range
  const formatDateRange = () => {
    if (!album.date_start) return null
    const startDate = album.date_start
    const endDate = album.date_end

    if (endDate && startDate !== endDate) {
      return `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
    }
    return format(new Date(startDate), 'MMM d, yyyy')
  }

  return (
    <div className={cn("bg-white rounded-xl p-6 space-y-5", className)}>
      {/* User Header */}
      {albumUser && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatarLink user={albumUser}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={albumUser.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                  {albumUser.display_name?.[0] || albumUser.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </UserAvatarLink>
            <div className="flex-1 min-w-0">
              <UserLink
                user={albumUser}
                className="font-semibold text-gray-900 hover:underline text-sm"
              />
              <p className="text-xs text-gray-500">
                @{albumUser.username}
              </p>
            </div>
          </div>
          {!isOwnAlbum && onFollowClick && (
            <Button
              size="sm"
              onClick={onFollowClick}
              disabled={followLoading}
              className={cn(
                "rounded-md px-6 h-8 text-sm font-medium",
                followStatus === 'following'
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-teal-500 hover:bg-teal-600 text-white"
              )}
            >
              {followLoading ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : followStatus === 'following' ? (
                'Following'
              ) : followStatus === 'pending' ? (
                'Requested'
              ) : (
                'Follow'
              )}
            </Button>
          )}
        </div>
      )}

      {/* Album Title and Date */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{album.title}</h1>
        {formatDateRange() && (
          <p className="text-sm text-gray-500">{formatDateRange()}</p>
        )}
      </div>

      {/* Description */}
      {album.description && (
        <p className="text-gray-700 text-sm leading-relaxed">
          {album.description}
        </p>
      )}

      {/* Show Photo Details Toggle */}
      <button
        onClick={() => setShowPhotoDetails(!showPhotoDetails)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full"
      >
        <span>Show Photo Details</span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          showPhotoDetails && "rotate-180"
        )} />
      </button>

      {showPhotoDetails && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Location</span>
            <span className="text-gray-900">{album.location_name || 'Not specified'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Visibility</span>
            <span className="text-gray-900 capitalize">{album.visibility || 'public'}</span>
          </div>
          {album.country_code && (
            <div className="flex justify-between">
              <span className="text-gray-500">Country</span>
              <span className="text-gray-900">{album.country_code}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3">
        <button
          onClick={onLikeClick}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Heart className={cn(
            "h-5 w-5",
            isLiked ? "fill-red-500 text-red-500" : "text-gray-600"
          )} />
          <span className="text-xs text-gray-600">Like</span>
        </button>

        <button
          onClick={onCommentClick}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="h-5 w-5 text-gray-600" />
          <span className="text-xs text-gray-600">Comment</span>
        </button>

        {album.latitude && album.longitude && (
          <button
            onClick={onGlobeClick}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-600 whitespace-nowrap">View on Globe</span>
          </button>
        )}
      </div>
    </div>
  )
}
