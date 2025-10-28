'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Loader2, UserPlus, Check, X } from 'lucide-react'
import Link from 'next/link'
export default function FollowersPage() {
  const { user } = useAuth()
  const { followers, pendingRequests, loading, stats, refreshFollowLists, acceptFollowRequest, rejectFollowRequest, followUser } = useFollows()
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
        <Button variant="ghost" onClick={() => window.history.back()} size="sm">
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

      {/* Follow Requests Section */}
      {pendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-600" />
                Follow Requests
                <Badge className="bg-orange-600 text-white">{pendingRequests.length}</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Approve or decline follow requests
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const requester = request.follower
                if (!requester) return null

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white border border-orange-200 hover:shadow-md transition-all"
                  >
                    <Link
                      href={`/globe?user=${requester.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-orange-200">
                        <AvatarImage src={requester.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold">
                          {(requester.display_name || requester.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {requester.display_name || requester.username}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          @{requester.username}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="icon"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 h-8 w-8 rounded-full"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAccept(requester.id)
                        }}
                        disabled={actionLoading === requester.id}
                        title="Accept"
                      >
                        {actionLoading === requester.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleReject(requester.id)
                        }}
                        disabled={actionLoading === requester.id}
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Followers List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Followers ({followers.length})</CardTitle>
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
            <div className="space-y-3">
              {followers.map((follow) => {
                const followerUser = follow.follower
                if (!followerUser) return null

                return (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <Link
                      href={`/globe?user=${followerUser.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={followerUser.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                          {(followerUser.display_name || followerUser.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {followerUser.display_name || followerUser.username}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          @{followerUser.username}
                        </p>
                      </div>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-4"
                      onClick={(e) => {
                        e.preventDefault()
                        handleFollowBack(followerUser.id)
                      }}
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
