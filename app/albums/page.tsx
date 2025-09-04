"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Plus, MapPin, Calendar, Heart, Eye, Edit } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlbumData } from "@/types/album";

export const dynamic = "force-dynamic";

interface AlbumsResponse {
  albums: AlbumData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AlbumsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      // Still loading, wait
      return;
    }

    if (status === "unauthenticated") {
      // Redirect to sign in
      router.push("/auth/signin");
    } else if (status === "authenticated" && !session?.user?.id) {
      // Session exists but no user ID - possible session corruption
      logger.warn("⚠️ Albums: Session corruption detected", {
        status,
        hasSession: !!session,
        hasUserId: !!session?.user?.id,
      });
      router.push("/auth/signin");
    }
  }, [status, session, router]);

  // Fetch albums using React Query with proper session guard
  const {
    data: albumsResponse,
    isLoading,
    error: albumsError,
    refetch,
  } = useQuery<AlbumsResponse>({
    queryKey: ["albums"],
    queryFn: async () => {
      const response = await fetch("/api/albums?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }
      return response.json();
    },
    enabled: !!session?.user?.id, // Only run when session is fully established
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const albums = albumsResponse?.albums || [];

  if (status === "loading" || isLoading) {
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

  if (!session) {
    return null;
  }

  // Handle album fetch errors
  if (albumsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">
                Failed to Load Albums
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                There was an issue loading your albums. This might be a
                temporary network issue.
              </p>
              <div className="space-x-2">
                <Button onClick={() => refetch()} variant="default">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Albums</h1>
          <p className="text-muted-foreground">
            Organize and share your travel photography
          </p>
        </div>
        <Button asChild>
          <Link href="/albums/new" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Album</span>
          </Link>
        </Button>
      </div>

      {/* Stats */}
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
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {albums.reduce(
                    (total, album) => total + (album.photosCount || 0),
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Total Photos</p>
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
                    (total, album) => total + (album.favoritesCount || 0),
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Total Favorites</p>
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
              className="hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Cover Image */}
              <div className="relative h-48 bg-muted">
                {album.coverPhotoUrl ? (
                  <Image
                    src={album.coverPhotoUrl}
                    alt={album.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <Camera className="h-12 w-12" />
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg line-clamp-1">
                      {album.title}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {album.city
                        ? `${album.city}, ${album.country}`
                        : album.country}
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
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {album.description}
                </p>

                <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Camera className="h-3 w-3 mr-1" />
                    {album.photosCount} photos
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {album.tripsCount || 0} trips
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-3 w-3 mr-1" />
                      {album.favoritesCount || 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {album.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {album.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{album.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(
                      album.date || album.createdAt
                    ).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No albums yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Start organizing your travel photos! Create your first album to
                showcase your adventures.
              </p>
              <Button asChild>
                <Link href="/albums/new">Create Your First Album</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
