'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FollowButton } from './FollowButton'
import { Lock, User } from 'lucide-react'
import type { Profile } from '@/types/database'

interface PrivateAccountMessageProps {
  profile: Profile
  showFollowButton?: boolean
}

export function PrivateAccountMessage({
  profile,
  showFollowButton = true
}: PrivateAccountMessageProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="py-12 text-center">
        <div className="relative mb-6">
          <Avatar className="h-20 w-20 mx-auto">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-xl">
              {profile.display_name?.[0] || profile.username?.[0] || <User />}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 bg-gray-100 rounded-full p-2">
            <Lock className="h-4 w-4 text-gray-600" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {profile.display_name || profile.username}
        </h3>

        {profile.display_name && (
          <p className="text-gray-600 mb-4">@{profile.username}</p>
        )}

        <div className="space-y-3 text-sm text-gray-600">
          <p className="font-medium">This account is private</p>
          <p>
            Follow {profile.display_name || profile.username} to see their adventures and travel photos
          </p>
        </div>

        {showFollowButton && (
          <div className="mt-6">
            <FollowButton userId={profile.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}