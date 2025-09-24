'use client'

import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Check, X, User } from 'lucide-react'

export function FollowRequests() {
  const {
    pendingRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    loading,
    stats
  } = useFollows()

  if (stats.pendingRequestsCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Follow Requests
          </CardTitle>
          <CardDescription>
            Manage who can follow you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-gray-700 mb-4" />
            <p className="text-gray-800">No pending follow requests</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Follow Requests
          <Badge variant="secondary">
            {stats.pendingRequestsCount}
          </Badge>
        </CardTitle>
        <CardDescription>
          Approve or decline follow requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={request.follower?.avatar_url} />
                <AvatarFallback>
                  {request.follower?.display_name?.[0] ||
                   request.follower?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {request.follower?.display_name || request.follower?.username}
                </p>
                {request.follower?.display_name && (
                  <p className="text-sm text-gray-800">
                    @{request.follower.username}
                  </p>
                )}
                <p className="text-sm text-gray-800">
                  {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptFollowRequest(request.follower_id)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectFollowRequest(request.follower_id)}
                disabled={loading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}