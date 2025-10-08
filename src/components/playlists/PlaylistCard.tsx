/**
 * Playlist Card Component
 * Displays a playlist with preview and actions
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MapPin, 
  Users, 
  Heart, 
  Eye, 
  Globe, 
  Lock, 
  UserPlus,
  Share2,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import type { PlaylistWithDetails } from '@/types/database'

interface PlaylistCardProps {
  playlist: PlaylistWithDetails
  onSubscribe?: (playlistId: string) => void
  onUnsubscribe?: (playlistId: string) => void
  onEdit?: (playlistId: string) => void
  onDelete?: (playlistId: string) => void
  onShare?: (playlistId: string) => void
}

export function PlaylistCard({
  playlist,
  onSubscribe,
  onUnsubscribe,
  onEdit,
  onDelete,
  onShare
}: PlaylistCardProps) {
  const [isSubscribed, setIsSubscribed] = useState(playlist.is_subscribed)
  const [subscriberCount, setSubscriberCount] = useState(playlist.subscriber_count)

  const handleSubscribeClick = async () => {
    if (isSubscribed && onUnsubscribe) {
      await onUnsubscribe(playlist.id)
      setIsSubscribed(false)
      setSubscriberCount(prev => Math.max(0, prev - 1))
    } else if (!isSubscribed && onSubscribe) {
      await onSubscribe(playlist.id)
      setIsSubscribed(true)
      setSubscriberCount(prev => prev + 1)
    }
  }

  const getPlaylistTypeIcon = () => {
    switch (playlist.playlist_type) {
      case 'curated':
        return '🎨'
      case 'travel_route':
        return '🗺️'
      case 'theme':
        return '🎭'
      case 'smart':
        return '✨'
      default:
        return '📍'
    }
  }

  const getVisibilityIcon = () => {
    switch (playlist.visibility) {
      case 'public':
        return <Globe className="h-3 w-3" />
      case 'private':
        return <Lock className="h-3 w-3" />
      case 'friends':
        return <Users className="h-3 w-3" />
      default:
        return <Globe className="h-3 w-3" />
    }
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{getPlaylistTypeIcon()}</span>
              {playlist.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {playlist.description || 'No description'}
            </CardDescription>
          </div>
          
          {playlist.is_owner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(playlist.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onShare && (
                  <DropdownMenuItem onClick={() => onShare(playlist.id)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(playlist.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {playlist.category && (
            <Badge variant="secondary" className="text-xs">
              {playlist.category}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {getVisibilityIcon()}
            <span className="ml-1 capitalize">{playlist.visibility}</span>
          </Badge>
          {playlist.is_collaborative && (
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Collaborative
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{playlist.item_count} {playlist.item_count === 1 ? 'place' : 'places'}</span>
          </div>
          <div className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            <span>{subscriberCount} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}</span>
          </div>
          {playlist.view_count > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{playlist.view_count}</span>
            </div>
          )}
        </div>

        {playlist.tags && playlist.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {playlist.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {playlist.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{playlist.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3 border-t">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/playlists/${playlist.id}`}>
            <MapPin className="h-4 w-4 mr-2" />
            View on Globe
          </Link>
        </Button>
        
        {!playlist.is_owner && playlist.allow_subscriptions && (
          <Button
            variant={isSubscribed ? 'secondary' : 'default'}
            onClick={handleSubscribeClick}
            className="flex-1"
          >
            {isSubscribed ? (
              <>
                <Heart className="h-4 w-4 mr-2 fill-current" />
                Subscribed
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Subscribe
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

