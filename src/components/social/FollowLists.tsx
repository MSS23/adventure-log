'use client'

import React from 'react'
import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserCheck, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'

export function FollowLists() {
  const { followers, following, stats } = useFollows()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social connections
        </CardTitle>
        <CardDescription>
          View your followers and people you follow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="followers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Followers
              <Badge variant="secondary" className="ml-1">
                {stats.followersCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Following
              <Badge variant="secondary" className="ml-1">
                {stats.followingCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="space-y-4 mt-4">
            {stats.followersCount === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
                  <UserCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">No followers yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your adventure albums to gain followers!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={getAvatarUrl(follow.follower?.avatar_url, follow.follower?.username)} />
                        <AvatarFallback>
                          {getDisplayInitial(follow.follower?.display_name, follow.follower?.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getDisplayName(follow.follower?.display_name, follow.follower?.username)}
                        </p>
                        {follow.follower?.display_name && (
                          <p className="text-xs text-muted-foreground">
                            @{follow.follower.username}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Following since {new Date(follow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Link href={`/profile/${follow.follower?.username && follow.follower.username !== 'user' ? follow.follower.username : follow.follower?.id}`}>
                      <Button variant="outline" size="sm" className="min-h-[44px]">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4 mt-4">
            {stats.followingCount === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
                  <UserPlus className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">Not following anyone yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Discover and follow other travelers!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {following.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={getAvatarUrl(follow.following?.avatar_url, follow.following?.username)} />
                        <AvatarFallback>
                          {getDisplayInitial(follow.following?.display_name, follow.following?.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getDisplayName(follow.following?.display_name, follow.following?.username)}
                        </p>
                        {follow.following?.display_name && (
                          <p className="text-xs text-muted-foreground">
                            @{follow.following.username}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Following since {new Date(follow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/profile/${follow.following?.username && follow.following.username !== 'user' ? follow.following.username : follow.following?.id}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}