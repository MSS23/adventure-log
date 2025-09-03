"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Heart,
  MessageCircle,
  MapPin,
  Globe,
  Camera,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import FriendRequestsManager from "@/components/features/social/friend-requests-manager";

export default function SocialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch social feed data
  const { data: feedData, isLoading: isFeedLoading } = useQuery({
    queryKey: ["social-feed"],
    queryFn: async () => {
      const response = await fetch("/api/social/feed");
      if (!response.ok) {
        throw new Error("Failed to fetch social feed");
      }
      return response.json();
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });

  // Fetch suggested users
  const { data: suggestedUsers, isLoading: isUsersLoading } = useQuery({
    queryKey: ["social-users"],
    queryFn: async () => {
      const response = await fetch("/api/social/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });

  // Fetch top travelers (leaderboard)
  const { data: topTravelersData, isLoading: isTopTravelersLoading } = useQuery(
    {
      queryKey: ["top-travelers"],
      queryFn: async () => {
        const response = await fetch("/api/social/users?type=search&limit=5");
        if (!response.ok) {
          throw new Error("Failed to fetch top travelers");
        }
        return response.json();
      },
      enabled: !!session?.user?.id,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading social features...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Handle loading and error states
  if (isFeedLoading || isUsersLoading || isTopTravelersLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading social content...</p>
          </div>
        </div>
      </div>
    );
  }

  const recentActivity = feedData?.albums || [];
  const topTravelers = topTravelersData?.users || [];

  const handleFollow = async (
    userId: string,
    isCurrentlyFollowing: boolean
  ) => {
    try {
      const response = await fetch("/api/social/follow", {
        method: isCurrentlyFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update follow status");
      }

      // Refetch data to update UI
      // Note: In a real app, you'd want to use optimistic updates
      window.location.reload();
    } catch (error) {
      logger.error("Error updating follow status:", error);
    }
  };

  const handleLike = async (
    targetType: "Album" | "AlbumPhoto",
    targetId: string
  ) => {
    try {
      const response = await fetch("/api/social/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to like");
      }

      // Refetch data to update UI
      window.location.reload();
    } catch (error) {
      logger.error("Error liking:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Users className="h-8 w-8 mr-3 text-primary" />
          Social Hub
        </h1>
        <p className="text-muted-foreground">
          Connect with fellow travelers and discover new adventures
        </p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for travelers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button>Search</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feed">Activity Feed</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        {/* Activity Feed */}
        <TabsContent value="feed" className="space-y-6">
          <div className="space-y-6">
            {recentActivity.map((activity: any) => (
              <Card key={activity.id} className="overflow-hidden">
                {/* Header */}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.user.image || ""} />
                        <AvatarFallback>
                          {activity.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{activity.user.name}</p>
                          <Badge
                            variant={
                              activity.privacy === "PUBLIC"
                                ? "default"
                                : activity.privacy === "FRIENDS_ONLY"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {activity.privacy === "PUBLIC"
                              ? "🌍 Public"
                              : activity.privacy === "FRIENDS_ONLY"
                                ? "👥 Friends"
                                : "🔒 Private"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{activity.location}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm mb-4">
                    {activity.action}{" "}
                    <span className="font-semibold">
                      &ldquo;{activity.content}&rdquo;
                    </span>
                  </p>
                </CardContent>

                {/* Cover Photo */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <Image
                    src={activity.coverPhoto}
                    alt={activity.content}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                  />
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {activity.photosCount} photos
                  </div>
                </div>

                {/* Actions and Stats */}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(activity.id)}
                        className="flex items-center space-x-2 text-muted-foreground hover:text-red-500 transition-colors group"
                      >
                        <Heart className="h-5 w-5 group-hover:fill-current" />
                        <span className="text-sm font-medium">
                          {activity.likes}
                        </span>
                      </button>
                      <button className="flex items-center space-x-2 text-muted-foreground hover:text-blue-500 transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          {activity.comments}
                        </span>
                      </button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      View Album
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Discover People */}
        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suggested Travelers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestedUsers?.users?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{user.location}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span>{user.countriesVisited} countries</span>
                          </div>
                        </div>
                        {user.mutualFriends > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {user.mutualFriends} mutual friends
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={user.isFollowing ? "secondary" : "default"}
                      onClick={() => handleFollow(user.id)}
                    >
                      {user.isFollowing ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Content Creators This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTravelers.map((traveler: any, index: number) => (
                  <div
                    key={traveler.username}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {traveler.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{traveler.name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{traveler.username}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1 font-medium">
                            <Globe className="h-4 w-4 text-blue-500" />
                            <span>{traveler.countriesVisited}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            countries
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1 font-medium">
                            <Camera className="h-4 w-4 text-green-500" />
                            <span>{traveler.albumsCount}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            albums
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1 font-medium">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{traveler.followersCount}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            followers
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Network */}
        <TabsContent value="friends" className="space-y-6">
          <FriendRequestsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
