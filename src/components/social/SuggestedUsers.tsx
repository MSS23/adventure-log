'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FollowButton } from './FollowButton'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface SuggestedUser {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
}

interface SuggestedUsersProps {
  currentUserId?: string
  limit?: number
}

export function SuggestedUsers({ currentUserId, limit = 5 }: SuggestedUsersProps) {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      if (!currentUserId) {
        setLoading(false)
        return
      }

      try {
        // Fetch users the current user is NOT following yet
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .eq('status', 'accepted')

        const followingIds = followingData?.map(f => f.following_id) || []

        // Fetch suggested users (excluding current user and already following)
        const { data: users } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, bio')
          .eq('privacy_level', 'public')
          .neq('id', currentUserId)
          .not('id', 'in', `(${followingIds.join(',') || 'null'})`)
          .limit(limit)

        setSuggestedUsers(users || [])
      } catch (error) {
        console.error('Error fetching suggested users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestedUsers()
  }, [currentUserId, limit, supabase])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-2 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (suggestedUsers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500">No suggestions available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {suggestedUsers.map((suggestedUser) => (
        <div key={suggestedUser.id} className="flex items-center justify-between gap-2">
          <Link href={`/profile/${suggestedUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 ring-1 ring-gray-200">
              <AvatarImage src={getPhotoUrl(suggestedUser.avatar_url, 'avatars') || ''} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white font-semibold text-xs">
                {suggestedUser.display_name[0]?.toUpperCase() || suggestedUser.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{suggestedUser.username}</p>
              <p className="text-xs text-gray-500 truncate">{suggestedUser.display_name || 'Suggested for you'}</p>
            </div>
          </Link>
          <FollowButton
            userId={suggestedUser.id}
            size="sm"
            showText={true}
            variant="default"
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 h-auto flex-shrink-0"
          />
        </div>
      ))}
    </div>
  )
}
