'use client'

import { Album, User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Globe, Calendar, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { cn } from '@/lib/utils'

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
  // Get user data from album relations
  const albumUser = album.user || (album as unknown as { users?: User }).users

  return (
    <div className={cn("bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden", className)}>
      <div className="p-6 space-y-6">
        {/* User Header */}
        {albumUser && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatarLink user={albumUser}>
                <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                  <AvatarImage src={albumUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-gray-900 font-semibold">
                    {albumUser.display_name?.[0] || albumUser.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </UserAvatarLink>
              <div className="flex-1 min-w-0">
                <UserLink
                  user={albumUser}
                  className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                />
                {album.created_at && (
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(album.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            {!isOwnAlbum && onFollowClick && (
              <Button
                size="sm"
                variant={followStatus === 'following' ? 'outline' : 'default'}
                onClick={onFollowClick}
                disabled={followLoading}
                className={cn(
                  "rounded-full min-w-[90px]",
                  followStatus === 'following'
                    ? "border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                )}
              >
                {followLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : followStatus === 'following' ? (
                  'Following'
                ) : followStatus === 'pending' ? (
                  'Pending'
                ) : (
                  'Follow'
                )}
              </Button>
            )}
          </div>
        )}

        {/* Album Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{album.title}</h1>
          {album.description && (
            <p className="text-base text-gray-700 leading-relaxed">{album.description}</p>
          )}
        </div>

        {/* Album Metadata */}
        <div className="space-y-3">
          {album.date_start && (
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm">
                {album.date_end
                  ? `${new Date(album.date_start).toLocaleDateString()} - ${new Date(album.date_end).toLocaleDateString()}`
                  : new Date(album.date_start).toLocaleDateString()}
              </span>
            </div>
          )}
          {album.location_name && (
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span className="text-sm">{album.location_name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <Button
            variant="outline"
            size="default"
            className={cn(
              "w-full justify-start gap-3 rounded-lg hover:bg-gray-50",
              isLiked && "text-red-600 hover:text-red-700"
            )}
            onClick={onLikeClick}
          >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            <span className="font-medium">
              {isLiked ? 'Liked' : 'Like'}
              {likeCount > 0 && ` (${likeCount})`}
            </span>
          </Button>

          <Button
            variant="outline"
            size="default"
            className="w-full justify-start gap-3 rounded-lg hover:bg-gray-50"
            onClick={onCommentClick}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">
              Comment
              {commentCount > 0 && ` (${commentCount})`}
            </span>
          </Button>

          {album.latitude && album.longitude && (
            <Button
              variant="outline"
              size="default"
              className="w-full justify-start gap-3 rounded-lg hover:bg-blue-50 hover:border-blue-300"
              onClick={onGlobeClick}
            >
              <Globe className="h-5 w-5 text-blue-600" />
              <span className="font-medium">View on Globe</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
