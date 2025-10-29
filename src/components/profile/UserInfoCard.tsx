'use client'

import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, UserMinus, UserPlus } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils/photo-url'
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
    <Card className="border border-gray-200 shadow-sm rounded-2xl">
      <CardContent className="p-6 space-y-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar className="h-40 w-40 ring-4 ring-white shadow-xl">
            <AvatarImage
              src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
              alt={profile.display_name || profile.username || 'User'}
            />
            <AvatarFallback className="text-5xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
              {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-gray-700 text-center leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Action Button */}
        {isOwnProfile ? (
          <Link href="/settings" className="block">
            <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium">
              Edit Profile
            </Button>
          </Link>
        ) : (
          <Button
            onClick={onFollowClick}
            disabled={followLoading}
            className={
              followStatus === 'following'
                ? "w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-lg font-medium"
                : "w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
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
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <span><span className="font-semibold text-gray-900">{followingCount}</span> Following</span>
          <span><span className="font-semibold text-gray-900">{followersCount}</span> Followers</span>
        </div>
      </CardContent>
    </Card>
  )
}
