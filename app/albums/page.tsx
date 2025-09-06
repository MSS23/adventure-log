"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Plus,
  MapPin,
  Calendar,
  Heart,
  Edit,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

interface Album {
  id: string;
  title: string;
  description?: string;
  country: string;
  city?: string;
  latitude: number;
  longitude: number;
  date: string;
  createdAt: string;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  tags: string[];
  photosCount: number;
  favoritesCount: number;
  coverPhotoUrl?: string;
}

interface AlbumsResponse {
  albums: Album[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AlbumsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please sign in to view your albums");
      router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/albums"));
    }
  }, [loading, user, router]);

  // Fetch albums with improved error handling
  const {
    data: albumsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<AlbumsResponse>({
    queryKey: ["albums", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("No authenticated user");
      }

      const response = await fetch("/api/albums?limit=50", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required - please sign in again");
        }
        if (response.status === 403) {
          throw new Error("Access denied - insufficient permissions");
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
    enabled: !!user?.id && !loading,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const albums = albumsData?.albums || [];

  // Handle retry with better user feedback
  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1);
    toast.loading("Refreshing albums...", { id: "albums-retry" });

    try {
      await queryClient.invalidateQueries({ queryKey: ["albums"] });
      await refetch();
      toast.success("Albums refreshed successfully", { id: "albums-retry" });
    } catch (error) {
      toast.error("Failed to refresh albums", { id: "albums-retry" });
    }
  };

  // Show loading state
  if (loading || (isLoading && !error)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Grid Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (after loading check)
  if (!loading && !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Redirecting to sign in page...</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show error state with retry option
  if (error && !isFetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">Failed to load albums</p>
              <p className="text-sm">
                {error instanceof Error
                  ? error.message
                  : "Unknown error occurred"}
              </p>
              {retryCount > 0 && (
                <p className="text-xs mt-1 opacity-75">
                  Retry attempt {retryCount}/3
                </p>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/auth/signin")}
              >
                Sign In Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Adventures</h1>
          <p className="text-muted-foreground">
            {user?.user_metadata?.name &&
              `Welcome back, ${user.user_metadata.name}! `}
            Manage your travel albums and memories
          </p>
        </div>
        <Button asChild>
          <Link href="/albums/new" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Album</span>
          </Link>
        </Button>
      </div>

      {/* Loading indicator during refresh */}
      {isFetching && !isLoading && (
        <div className="mb-4">
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Refreshing albums...</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{albums.length}</p>
                <p className="text-xs text-muted-foreground">Total Albums</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(albums.map((album) => album.country)).size}
                </p>
                <p className="text-xs text-muted-foreground">
                  Countries Visited
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {albums.reduce(
                    (total, album) => total + album.photosCount,
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Total Photos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Albums Grid */}
      {albums.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <Card
              key={album.id}
              className="hover:shadow-lg transition-shadow duration-200 overflow-hidden group"
            >
              {/* Cover Image */}
              <div className="relative h-48 bg-muted overflow-hidden">
                {album.coverPhotoUrl ? (
                  <Image
                    src={album.coverPhotoUrl}
                    alt={album.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted">
                    <Camera className="h-12 w-12" />
                  </div>
                )}

                {/* Privacy Badge */}
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={
                      album.privacy === "PUBLIC"
                        ? "default"
                        : album.privacy === "FRIENDS_ONLY"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {album.privacy}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-1 mb-1">
                      {album.title}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {album.city
                          ? `${album.city}, ${album.country}`
                          : album.country}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/albums/${album.id}/edit`}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {album.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {album.description}
                  </p>
                )}

                <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <Camera className="h-3 w-3 mr-1" />
                      {album.photosCount} photos
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-3 w-3 mr-1" />
                      {album.favoritesCount}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(album.date).toLocaleDateString()}
                  </div>
                </div>

                {/* Tags */}
                {album.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {album.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {album.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{album.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <Button asChild className="w-full">
                  <Link href={`/albums/${album.id}`}>View Album</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Empty State
        <Card>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No albums yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Start your adventure! Create your first album to showcase your
                travels and memories.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/albums/new">Create Your First Album</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
