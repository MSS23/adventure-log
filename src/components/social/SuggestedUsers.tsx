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
        // 1. Get users currently following
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .eq('status', 'accepted')

        const followingIds = followingData?.map(f => f.following_id) || []

        // 2. Get current user's visited countries
        const { data: myAlbums } = await supabase
          .from('albums')
          .select('country_code')
          .eq('user_id', currentUserId)
          .not('country_code', 'is', null)

        const myCountries = [...new Set(myAlbums?.map(a => a.country_code).filter(Boolean))] || []

        let suggestions: SuggestedUser[] = []

        // 3. Find users who visited similar countries
        if (myCountries.length > 0) {
          const { data: locationMatches } = await supabase
            .from('albums')
            .select(`
              user_id,
              users!albums_user_id_fkey(id, username, display_name, avatar_url, bio, privacy_level)
            `)
            .in('country_code', myCountries)
            .neq('user_id', currentUserId)
            .limit(20)

          const userMap = new Map<string, SuggestedUser>()
          locationMatches?.forEach(album => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user = (album as any).users
            if (user && user.privacy_level === 'public' && !followingIds.includes(user.id)) {
              userMap.set(user.id, {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                bio: user.bio
              })
            }
          })
          suggestions = Array.from(userMap.values()).slice(0, 3)
        }

        // 4. Add friends of friends if we need more
        if (suggestions.length < limit && followingIds.length > 0) {
          const { data: fofData } = await supabase
            .from('follows')
            .select(`
              following_id,
              users!follows_following_id_fkey(id, username, display_name, avatar_url, bio, privacy_level)
            `)
            .in('follower_id', followingIds)
            .eq('status', 'accepted')
            .neq('following_id', currentUserId)
            .limit(10)

          fofData?.forEach(follow => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user = (follow as any).users
            if (user && user.privacy_level === 'public' && !followingIds.includes(user.id)) {
              // Check if not already in suggestions
              if (!suggestions.find(s => s.id === user.id)) {
                suggestions.push({
                  id: user.id,
                  username: user.username,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url,
                  bio: user.bio
                })
              }
            }
          })
        }

        setSuggestedUsers(suggestions.slice(0, limit))
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
