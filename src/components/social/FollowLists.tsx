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

export function FollowLists() {
  const { followers, following, stats } = useFollows()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social Connections
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
                <UserCheck className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-800">No followers yet</p>
                <p className="text-sm text-gray-800 mt-1">
                  Share your adventure albums to gain followers!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={follow.follower?.avatar_url} />
                        <AvatarFallback>
                          {follow.follower?.display_name?.[0] ||
                           follow.follower?.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {follow.follower?.display_name || follow.follower?.username}
                        </p>
                        {follow.follower?.display_name && (
                          <p className="text-sm text-gray-800">
                            @{follow.follower.username}
                          </p>
                        )}
                        <p className="text-sm text-gray-800">
                          Following since {new Date(follow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Link href={`/profile/${follow.follower?.username && follow.follower.username !== 'user' ? follow.follower.username : follow.follower?.id}`}>
                      <Button variant="outline" size="sm">
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
                <UserPlus className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-800">Not following anyone yet</p>
                <p className="text-sm text-gray-800 mt-1">
                  Discover and follow other travelers!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {following.map((follow) => (
                  <div
                    key={follow.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={follow.following?.avatar_url} />
                        <AvatarFallback>
                          {follow.following?.display_name?.[0] ||
                           follow.following?.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {follow.following?.display_name || follow.following?.username}
                        </p>
                        {follow.following?.display_name && (
                          <p className="text-sm text-gray-800">
                            @{follow.following.username}
                          </p>
                        )}
                        <p className="text-sm text-gray-800">
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