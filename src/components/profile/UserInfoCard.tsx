'use client'

import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, UserMinus, UserPlus } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getDisplayInitial } from '@/lib/utils/display-name'
import Link from 'next/link'

interface UserInfoCardProps {
  profile: User
  isOwnProfile: boolean
  followStatus: 'not_following' | 'following' | 'pending' | 'blocked'
  followersCount: number
  followingCount: number
  onFollowClick: () => void
  followLoading: boolean
}

export function UserInfoCard({
  profile,
  isOwnProfile,
  followStatus,
  followersCount,
  followingCount,
  onFollowClick,
  followLoading
}: UserInfoCardProps) {
  return (
    <Card className="border border-stone-200 dark:border-white/[0.10] shadow-sm rounded-2xl">
      <CardContent className="p-6 space-y-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar className="h-40 w-40 ring-4 ring-white dark:ring-white/[0.08] shadow-xl">
            <AvatarImage
              src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
              alt={profile.display_name || profile.username || 'User'}
            />
            <AvatarFallback className="text-5xl bg-gradient-to-br from-olive-500 to-olive-500 text-white">
              {getDisplayInitial(profile.display_name, profile.username)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-stone-700 dark:text-stone-300 text-center leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Action Button */}
        {isOwnProfile ? (
          <Link href="/settings" className="block">
            <Button className="w-full bg-olive-500 hover:bg-olive-600 text-white rounded-lg font-medium">
              Edit Profile
            </Button>
          </Link>
        ) : (
          <Button
            onClick={onFollowClick}
            disabled={followLoading}
            className={
              followStatus === 'following'
                ? "w-full bg-white dark:bg-[#1B170E] hover:bg-stone-50 dark:hover:bg-white/[0.06] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/[0.14] rounded-lg font-medium"
                : "w-full bg-olive-500 hover:bg-olive-600 text-white rounded-lg font-medium"
            }
          >
            {followLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : followStatus === 'following' ? (
              <UserMinus className="h-4 w-4 mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            {followStatus === 'following'
              ? 'Unfollow'
              : followStatus === 'pending'
              ? 'Requested'
              : 'Follow'}
          </Button>
        )}

        {/* Follower/Following Stats - Inline */}
        <div className="flex items-center justify-center gap-6 text-sm text-stone-600 dark:text-stone-400">
          <span><span className="font-semibold text-stone-900 dark:text-stone-100">{followingCount}</span> Following</span>
          <span><span className="font-semibold text-stone-900 dark:text-stone-100">{followersCount}</span> Followers</span>
        </div>
      </CardContent>
    </Card>
  )
}
