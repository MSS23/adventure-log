"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Globe,
  Camera,
  Users,
  Trophy,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  Heart,
  Eye,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface DashboardStats {
  totalAlbums: number;
  totalPhotos: number;
  countriesVisited: number;
  citiesVisited: number;
  followersCount: number;
  followingCount: number;
  badgesEarned: number;
  publicAlbums: number;
  privateAlbums: number;
  _databaseUnavailable?: boolean;
  _error?: boolean;
}

interface RecentAlbum {
  id: string;
  title: string;
  coverPhotoUrl?: string;
  country?: string;
  city?: string;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  _count: {
    photos: number;
  };
  createdAt: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      // Still loading, wait
      return;
    }

    if (!user) {
      // Redirect to sign in
      window.location.href = "/auth/signin";
    } else if (user && !user.id) {
      // Session exists but no user ID - possible session corruption
      logger.warn("⚠️ Dashboard: Session corruption detected", {
        hasUser: !!user,
        userId: user?.id,
      });
    } else if (user?.id) {
      // Everything looks good
      logger.debug("✅ Dashboard: User authenticated successfully", {
        userId: user.id,
        email: user.email,
      });
    }
  }, [loading, user, router]);

  // Fetch dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch recent albums
  const { data: recentAlbums } = useQuery<RecentAlbum[]>({
    queryKey: ["dashboard-recent-albums"],
    queryFn: async () => {
      const response = await fetch("/api/albums?limit=3");
      if (!response.ok) {
        throw new Error("Failed to fetch recent albums");
      }
      const data = await response.json();
      return data.albums || [];
    },
    enabled: !!user?.id,
  });

  if (loading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isNewUser = stats && stats.totalAlbums === 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isNewUser ? "Welcome to Adventure Log!" : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isNewUser
              ? "Ready to start documenting your adventures? Create your first album to get started!"
              : `Welcome back, ${user?.user_metadata?.name}! Here is your travel summary.`}
          </p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button asChild>
            <Link href="/albums/new">
              <Camera className="h-4 w-4 mr-2" />
              {isNewUser ? "Create First Album" : "New Album"}
            </Link>
          </Button>
        </div>
      </div>

      {/* New User Onboarding */}
      {isNewUser && (
        <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  Get Started with Your Adventure Log
                </h3>
                <p className="text-muted-foreground mb-4">
                  Adventure Log helps you document, organize, and share your
                  travel experiences. Here is how to get started:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Create Albums</p>
                      <p className="text-sm text-muted-foreground">
                        Upload photos and document your trips
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Explore Globe</p>
                      <p className="text-sm text-muted-foreground">
                        See your travels on a 3D interactive globe
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Share & Connect</p>
                      <p className="text-sm text-muted-foreground">
                        Follow friends and share adventures
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Status Warning */}
      {stats && (stats._databaseUnavailable || stats._error) && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-orange-900">
                  {stats._databaseUnavailable
                    ? "Database Unavailable"
                    : "Dashboard Issue"}
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  {stats._databaseUnavailable
                    ? "Unable to connect to database. Some features may not work properly."
                    : "There was an issue loading your dashboard data. Showing default values."}
                </p>
                {process.env.NODE_ENV === "development" && (
                  <p className="text-xs text-orange-600 mt-2">
                    💡 Check /api/health/db for diagnosis and run database
                    migrations/seeding if needed.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          className={
            stats && (stats._databaseUnavailable || stats._error)
              ? "opacity-75"
              : ""
          }
        >
          <CardContent className="flex items-center p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {statsError ? "—" : (stats?.countriesVisited ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Countries Visited
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            stats && (stats._databaseUnavailable || stats._error)
              ? "opacity-75"
              : ""
          }
        >
          <CardContent className="flex items-center p-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {statsError ? "—" : (stats?.totalAlbums ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Albums Created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            stats && (stats._databaseUnavailable || stats._error)
              ? "opacity-75"
              : ""
          }
        >
          <CardContent className="flex items-center p-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {statsError ? "—" : (stats?.badgesEarned ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Badges Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            stats && (stats._databaseUnavailable || stats._error)
              ? "opacity-75"
              : ""
          }
        >
          <CardContent className="flex items-center p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {statsError ? "—" : (stats?.followersCount ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Albums / Quick Actions */}
      {!isNewUser && recentAlbums && recentAlbums.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Albums</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/albums">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentAlbums.map((album) => (
              <Card
                key={album.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardContent className="p-0">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    {album.coverPhotoUrl ? (
                      <Image
                        src={album.coverPhotoUrl}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Camera className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 truncate">
                      {album.title}
                    </h3>
                    {(album.city || album.country) && (
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">
                          {album.city && `${album.city}, `}
                          {album.country}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Camera className="h-3 w-3" />
                        <span>{album._count.photos} photos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {album.privacy === "PUBLIC" && (
                          <Eye className="h-3 w-3 text-cyan-500" />
                        )}
                        {album.privacy === "FRIENDS_ONLY" && (
                          <Users className="h-3 w-3 text-amber-500" />
                        )}
                        {album.privacy === "PRIVATE" && (
                          <Heart className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {album.privacy.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <Button asChild className="w-full mt-3" size="sm">
                      <Link href={`/albums/${album.id}`}>View Album</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Albums
              </CardTitle>
              <CardDescription>
                Create and manage your travel photo albums
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/albums">
                  <Plus className="h-4 w-4 mr-2" />
                  {isNewUser ? "Create First Album" : "View Albums"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Globe
              </CardTitle>
              <CardDescription>
                Explore your travels on an interactive globe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/globe">View Globe</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Achievements
              </CardTitle>
              <CardDescription>
                Track your travel achievements and badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/badges">View Badges</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats for Existing Users */}
      {!isNewUser && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Travel Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cities</span>
                  <span className="font-medium">{stats.citiesVisited}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Photos</span>
                  <span className="font-medium">{stats.totalPhotos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Public Albums
                  </span>
                  <span className="font-medium">{stats.publicAlbums}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Social</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Following
                  </span>
                  <span className="font-medium">{stats.followingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Followers
                  </span>
                  <span className="font-medium">{stats.followersCount}</span>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/social">Explore Social</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/albums/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Album
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/globe">
                    <Globe className="h-4 w-4 mr-2" />
                    View Globe
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/settings">
                    <Calendar className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
