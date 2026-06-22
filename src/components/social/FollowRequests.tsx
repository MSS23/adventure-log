'use client'

import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'

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
            Follow requests
          </CardTitle>
          <CardDescription>
            Manage who can follow you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <User className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">No pending follow requests</p>
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
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarImage src={getAvatarUrl(request.follower?.avatar_url, request.follower?.username)} />
                <AvatarFallback>
                  {getDisplayInitial(request.follower?.display_name, request.follower?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getDisplayName(request.follower?.display_name, request.follower?.username)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {request.follower?.username ? `@${request.follower.username} · ` : ''}wants to follow you
                </p>
              </div>
            </div>

            {/* Instagram-style Confirm / Delete actions */}
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => acceptFollowRequest(request.follower_id)}
                disabled={loading}
                className="h-9 px-4 font-semibold"
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => rejectFollowRequest(request.follower_id)}
                disabled={loading}
                className="h-9 px-4 font-semibold"
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}