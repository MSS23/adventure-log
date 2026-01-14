'use client'

/**
 * ActivityFeedItem Component
 *
 * Display individual activity feed items with user-friendly formatting
 */

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  MapPin,
  Camera
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ActivityFeedItemWithDetails } from '@/lib/hooks/useActivityFeed'

interface ActivityFeedItemProps {
  activity: ActivityFeedItemWithDetails
  onMarkAsRead?: (activityId: string) => void
}

export function ActivityFeedItem({ activity, onMarkAsRead }: ActivityFeedItemProps) {
  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'album_created':
        return <Camera className="w-4 h-4 text-teal-600" />
      case 'album_liked':
        return <Heart className="w-4 h-4 text-red-500" />
      case 'album_commented':
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'user_followed':
        return <UserPlus className="w-4 h-4 text-purple-500" />
      case 'user_mentioned':
        return <AtSign className="w-4 h-4 text-teal-600" />
      case 'country_visited':
        return <MapPin className="w-4 h-4 text-green-600" />
      default:
        return null
    }
  }

  const getActivityText = () => {
    const userName = activity.user?.display_name || activity.user?.username || 'Someone'
    const targetUserName = activity.target_user?.display_name || activity.target_user?.username
    const albumTitle = activity.target_album?.title

    switch (activity.activity_type) {
      case 'album_created':
        return (
          <>
            <Link
              href={`/profile/${activity.user?.username}`}
              className="font-semibold text-gray-900 hover:text-teal-600"
            >
              {userName}
            </Link>
            {' created a new album '}
            {albumTitle && (
              <Link
                href={`/albums/${activity.target_album_id}`}
                className="font-semibold text-gray-900 hover:text-teal-600"
              >
                &quot;{albumTitle}&quot;
              </Link>
            )}
          </>
        )

      case 'album_liked':
        return (
          <>
            <Link
              href={`/profile/${activity.user?.username}`}
              className="font-semibold text-gray-900 hover:text-teal-600"
            >
              {userName}
            </Link>
            {' liked '}
            {albumTitle && (
              <Link
                href={`/albums/${activity.target_album_id}`}
                className="font-semibold text-gray-900 hover:text-teal-600"
              >
                &quot;{albumTitle}&quot;
              </Link>
            )}
          </>
        )

      case 'album_commented':
        return (
          <>
            <Link
              href={`/profile/${activity.user?.username}`}
              className="font-semibold text-gray-900 hover:text-teal-600"
            >
              {userName}
            </Link>
            {' commented on '}
            {albumTitle && (
              <Link
                href={`/albums/${activity.target_album_id}`}
                className="font-semibold text-gray-900 hover:text-teal-600"
              >
                &quot;{albumTitle}&quot;
              </Link>
            )}
          </>
        )

      case 'user_followed':
        return (
          <>
            <Link
              href={`/profile/${activity.user?.username}`}
              className="font-semibold text-gray-900 hover:text-teal-600"
            >
              {userName}
            </Link>
            {' started following '}
            {targetUserName && (
              <Link
                href={`/profile/${activity.target_user?.username}`}
                className="font-semibold text-gray-900 hover:text-teal-600"
              >
                {targetUserName}
              </Link>
            )}
          </>
        )

      case 'user_mentioned':
        return (
          <>
            <Link
              href={`/profile/${activity.user?.username}`}
              className="font-semibold text-gray-900 hover:text-teal-600"
            >
              {userName}
            </Link>
            {' mentioned you in a comment'}
          </>
        )

      case 'country_visited':
        const countryName = (activity.metadata as Record<string, unknown>)?.country_name as string || 'a new country'
        return (
          <>
            <Link
              href={`/profile/${activity.user?.username}`}
              className="font-semibold text-gray-900 hover:text-teal-600"
            >
              {userName}
            </Link>
            {` visited ${countryName}`}
          </>
        )

      default:
        return null
    }
  }

  const handleClick = () => {
    if (!activity.is_read && onMarkAsRead) {
      onMarkAsRead(activity.id)
    }
  }

  return (
    <div
      className={`
        flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer
        ${!activity.is_read ? 'bg-teal-50/30' : ''}
      `}
      onClick={handleClick}
    >
      {/* Activity Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-white">
            <AvatarImage src={activity.user?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-sm font-semibold">
              {activity.user?.display_name?.[0] || activity.user?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
            {getActivityIcon()}
          </div>
        </div>
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-relaxed">
          {getActivityText()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>

        {/* Show comment preview if available */}
        {activity.activity_type === 'album_commented' && activity.target_comment?.content && (
          <p className="text-sm text-gray-600 mt-2 italic line-clamp-2">
            &quot;{activity.target_comment.content}&quot;
          </p>
        )}
      </div>

      {/* Album Cover (if applicable) */}
      {activity.target_album?.cover_photo_url && (
        <div className="flex-shrink-0">
          <Link href={`/albums/${activity.target_album_id}`}>
            <img
              src={activity.target_album.cover_photo_url}
              alt={activity.target_album.title || 'Album'}
              className="w-16 h-16 object-cover rounded-lg"
            />
          </Link>
        </div>
      )}

      {/* Unread Indicator */}
      {!activity.is_read && (
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-teal-600 rounded-full mt-2" />
        </div>
      )}
    </div>
  )
}
