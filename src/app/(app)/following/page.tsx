'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Loader2, UserMinus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/common/BackButton'

export default function FollowingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { following, loading, stats, refreshFollowLists, unfollowUser } = useFollows()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      refreshFollowLists()
    }
  }, [user, refreshFollowLists])

  const handleUnfollow = async (userId: string) => {
    setActionLoading(userId)
    try {
      await unfollowUser(userId)
      await refreshFollowLists()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton fallbackRoute="/feed" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Following</h1>
          <p className="text-gray-600">People you&apos;re following</p>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6 text-center">
          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-900">{stats.followingCount}</div>
          <div className="text-sm text-gray-600">Following</div>
        </CardContent>
      </Card>

      {/* Following List */}
      <Card>
        <CardHeader>
          <CardTitle>People You Follow</CardTitle>
        </CardHeader>
        <CardContent>
          {following.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">Not following anyone yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Discover and follow travelers to see their adventures!
              </p>
              <Button className="mt-4" onClick={() => router.push('/search')}>
                Discover People
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {following.map((follow) => {
                const followingUser = follow.following
                if (!followingUser) return null

                return (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <Link
                      href={`/profile/${followingUser.id}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={followingUser.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {(followingUser.display_name || followingUser.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {followingUser.display_name || followingUser.username}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          @{followingUser.username}
                        </p>
                        {followingUser.bio && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {followingUser.bio}
                          </p>
                        )}
                      </div>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnfollow(followingUser.id)}
                      disabled={actionLoading === followingUser.id}
                    >
                      {actionLoading === followingUser.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unfollow
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
