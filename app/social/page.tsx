"use client";

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
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SocialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

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

  // Mock data - will be replaced with real data from API
  const suggestedUsers = [
    {
      id: "1",
      name: "Sarah Johnson",
      username: "sarahtravel",
      image: null,
      location: "San Francisco, CA",
      countriesVisited: 23,
      mutualFriends: 3,
      isFollowing: false,
    },
    {
      id: "2",
      name: "Alex Chen",
      username: "alexwanderlust",
      image: null,
      location: "Toronto, Canada",
      countriesVisited: 18,
      mutualFriends: 1,
      isFollowing: false,
    },
    {
      id: "3",
      name: "Maria Garcia",
      username: "mariaexplores",
      image: null,
      location: "Barcelona, Spain",
      countriesVisited: 31,
      mutualFriends: 5,
      isFollowing: true,
    },
  ];

  const recentActivity = [
    {
      id: "1",
      user: { name: "Emma Wilson", username: "emmawilson", image: null },
      type: "album",
      action: "shared a new album",
      content: "Cherry Blossoms in Tokyo",
      location: "Tokyo, Japan",
      photosCount: 15,
      privacy: "PUBLIC",
      coverPhoto:
        "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=300&fit=crop",
      time: "2 hours ago",
      likes: 42,
      comments: 8,
    },
    {
      id: "2",
      user: { name: "David Park", username: "davidpark", image: null },
      type: "album",
      action: "created a new album",
      content: "Swiss Alps Winter Adventure",
      location: "Interlaken, Switzerland",
      photosCount: 23,
      privacy: "FRIENDS_ONLY",
      coverPhoto:
        "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=400&h=300&fit=crop",
      time: "4 hours ago",
      likes: 67,
      comments: 12,
    },
    {
      id: "3",
      user: { name: "Lisa Thompson", username: "lisathompson", image: null },
      type: "album",
      action: "updated album",
      content: "Sunset in Santorini",
      location: "Santorini, Greece",
      photosCount: 18,
      privacy: "PUBLIC",
      coverPhoto:
        "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
      time: "6 hours ago",
      likes: 89,
      comments: 15,
    },
    {
      id: "4",
      user: { name: "Carlos Rodriguez", username: "carlosrod", image: null },
      type: "album",
      action: "shared an album",
      content: "Ancient Wonders of Peru",
      location: "Machu Picchu, Peru",
      photosCount: 31,
      privacy: "PUBLIC",
      coverPhoto:
        "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=400&h=300&fit=crop",
      time: "1 day ago",
      likes: 134,
      comments: 27,
    },
    {
      id: "5",
      user: { name: "Sophia Chen", username: "sophiachen", image: null },
      type: "album",
      action: "created a private album",
      content: "Family Vacation Memories",
      location: "Bali, Indonesia",
      photosCount: 42,
      privacy: "PRIVATE",
      coverPhoto:
        "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=300&fit=crop",
      time: "2 days ago",
      likes: 78,
      comments: 9,
    },
  ];

  const topTravelers = [
    {
      name: "Adventure Anna",
      username: "anna_adventures",
      countries: 47,
      albums: 132,
      photos: 2847,
    },
    {
      name: "Nomad Nick",
      username: "nomad_nick",
      countries: 42,
      albums: 189,
      photos: 3542,
    },
    {
      name: "Explorer Eva",
      username: "eva_explorer",
      countries: 38,
      albums: 98,
      photos: 1923,
    },
    {
      name: "Journey Jake",
      username: "journey_jake",
      countries: 35,
      albums: 156,
      photos: 2678,
    },
    {
      name: "Wanderer Will",
      username: "wanderer_will",
      countries: 33,
      albums: 87,
      photos: 1456,
    },
  ];

  const handleFollow = (userId: string) => {
    // TODO: Implement follow/unfollow API call
    console.log("Following user:", userId);
  };

  const handleLike = (activityId: string) => {
    // TODO: Implement like API call
    console.log("Liking activity:", activityId);
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
          <TabsTrigger value="friends">My Network</TabsTrigger>
        </TabsList>

        {/* Activity Feed */}
        <TabsContent value="feed" className="space-y-6">
          <div className="space-y-6">
            {recentActivity.map((activity) => (
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
                    <span className="font-semibold">&ldquo;{activity.content}&rdquo;</span>
                  </p>
                </CardContent>

                {/* Cover Photo */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img
                    src={activity.coverPhoto}
                    alt={activity.content}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
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
                {suggestedUsers.map((user) => (
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
                {topTravelers.map((traveler, index) => (
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
                            <span>{traveler.countries}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            countries
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1 font-medium">
                            <Camera className="h-4 w-4 text-green-500" />
                            <span>{traveler.albums}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            albums
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1 font-medium">
                            <Camera className="h-4 w-4 text-purple-500" />
                            <span>{traveler.photos.toLocaleString()}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            photos
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
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Following</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    You&apos;re not following anyone yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Discover and follow fellow travelers to see their adventures
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Followers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No followers yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Share your adventures to attract fellow travelers
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
