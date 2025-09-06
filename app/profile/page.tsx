"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Globe,
  Camera,
  Trophy,
  Users,
  MapPin,
  Calendar,
  Settings,
  Edit,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useEffect } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  image?: string;
  bio?: string;
  location?: string;
  website?: string;
  isPublic: boolean;
  createdAt: string;
  // Stats from our API
  totalCountriesVisited: number;
  totalAlbumsCount: number;
  totalPhotosCount: number;
  totalBadgesEarned: number;
  followersCount: number;
  followingCount: number;
  // Recent activity
  recentAlbums: Array<{
    id: string;
    title: string;
    country: string;
    city?: string;
    photosCount: number;
    coverPhotoUrl?: string;
    createdAt: string;
  }>;
  completedBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    unlockedAt: string;
  }>;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [loading, user, router]);

  // Fetch user profile data
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const [statsResponse, userResponse] = await Promise.all([
        fetch("/api/user/stats"),
        fetch("/api/user/profile"),
      ]);

      if (!statsResponse.ok || !userResponse.ok) {
        throw new Error("Failed to fetch profile data");
      }

      const stats = await statsResponse.json();
      const user = await userResponse.json();

      return { ...user, ...stats };
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      toast.error("Failed to load profile data");
    }
  }, [error]);

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Skeleton */}
          <div className="grid md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const joinedDate = format(new Date(profile.createdAt), "MMMM yyyy");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.image || ""} />
                <AvatarFallback className="text-2xl">
                  {profile.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
                    {profile.username && (
                      <p className="text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/profile/edit">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}

                {/* Additional Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-4 w-4" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {joinedDate}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">
                {profile.totalCountriesVisited}
              </div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">
                {profile.totalAlbumsCount}
              </div>
              <div className="text-sm text-muted-foreground">Albums</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{profile.followersCount}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">
                {profile.totalBadgesEarned}
              </div>
              <div className="text-sm text-muted-foreground">Badges</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Albums */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Albums
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/albums">View All</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.recentAlbums.length > 0 ? (
                <div className="space-y-4">
                  {profile.recentAlbums.slice(0, 3).map((album) => (
                    <div key={album.id} className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-muted rounded-lg overflow-hidden relative">
                        {album.coverPhotoUrl ? (
                          <Image
                            src={album.coverPhotoUrl}
                            alt={album.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{album.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {album.city && `${album.city}, `}
                          {album.country}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {album.photosCount} photos
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No albums yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Badges</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.completedBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {profile.completedBadges.slice(0, 4).map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="text-lg">{badge.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {badge.name}
                        </p>
                        <Badge
                          variant={
                            badge.rarity === "LEGENDARY"
                              ? "default"
                              : badge.rarity === "EPIC"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {badge.rarity.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No badges earned yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
