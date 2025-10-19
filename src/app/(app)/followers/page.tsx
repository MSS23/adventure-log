'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Loader2, UserPlus, UserMinus, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Follower } from '@/types/database'

export default function FollowersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { followers, loading, stats, refreshFollowLists, acceptFollowRequest, rejectFollowRequest, followUser, unfollowUser } = useFollows()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      refreshFollowLists()
    }
  }, [user, refreshFollowLists])

  const handleAccept = async (followerUserId: string) => {
    setActionLoading(followerUserId)
    try {
      await acceptFollowRequest(followerUserId)
      await refreshFollowLists()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (followerUserId: string) => {
    setActionLoading(followerUserId)
    try {
      await rejectFollowRequest(followerUserId)
      await refreshFollowLists()
    } finally {
      setActionLoading(null)
    }
  }

  const handleFollowBack = async (followerId: string) => {
    setActionLoading(followerId)
    try {
      await followUser(followerId)
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
        <Button variant="ghost" onClick={() => router.back()} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Followers</h1>
          <p className="text-gray-600">People following you</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">{stats.followersCount}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <UserPlus className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">{stats.pendingRequestsCount}</div>
            <div className="text-sm text-gray-600">Pending Requests</div>
          </CardContent>
        </Card>
      </div>

      {/* Followers List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Followers</CardTitle>
        </CardHeader>
        <CardContent>
          {followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No followers yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Share your profile to gain followers!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {followers.map((follow) => {
                const followerUser = follow.follower
                if (!followerUser) return null

                const isPending = follow.status === 'pending'

                return (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <Link
                      href={`/profile/${followerUser.id}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={followerUser.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {(followerUser.display_name || followerUser.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {followerUser.display_name || followerUser.username}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          @{followerUser.username}
                        </p>
                        {followerUser.bio && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {followerUser.bio}
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <>
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Pending
                          </Badge>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAccept(followerUser.id)}
                            disabled={actionLoading === followerUser.id}
                          >
                            {actionLoading === followerUser.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(followerUser.id)}
                            disabled={actionLoading === followerUser.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFollowBack(followerUser.id)}
                          disabled={actionLoading === followerUser.id}
                        >
                          {actionLoading === followerUser.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Follow Back
                            </>
                          )}
                        </Button>
                      )}
                    </div>
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
