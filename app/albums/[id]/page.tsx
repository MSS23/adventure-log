"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Edit,
  Globe,
  Heart,
  MapPin,
  Users,
  Lock,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlbumData } from "@/types/album";

export default function AlbumDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const albumId = params?.id as string;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [loading, user, router]);

  // Fetch album data
  const {
    data: album,
    isLoading,
    error,
  } = useQuery<AlbumData>({
    queryKey: ["album", albumId],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${albumId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch album");
      }
      return response.json();
    },
    enabled: !!user?.id && !!albumId,
    refetchOnWindowFocus: false,
  });

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Album Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This adventure destination doesn&apos;t exist on our map yet.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if album has location for globe viewing
  const hasLocation = album.latitude !== null && album.longitude !== null;
  const isDraft = !hasLocation || !album.latitude || !album.longitude;

  const privacyIcons = {
    PUBLIC: Globe,
    FRIENDS_ONLY: Users,
    PRIVATE: Lock,
  };

  const PrivacyIcon = privacyIcons[album.privacy];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/albums/${album.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Album
            </Link>
          </Button>
        </div>
      </div>

      {/* Draft Status Alert */}
      {isDraft && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>This album doesn&apos;t have a location</strong> so
            it&apos;s currently in drafts. Add a location to make it visible on
            your travel map.{" "}
            <Link
              href={`/albums/${album.id}/edit`}
              className="underline font-medium hover:no-underline"
            >
              Edit album to add location
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Album Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{album.title}</CardTitle>
              {album.description && (
                <CardDescription className="text-base">
                  {album.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <PrivacyIcon className="h-3 w-3" />
                {album.privacy.toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {hasLocation && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {album.city ? `${album.city}, ${album.country}` : album.country}
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(album.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Camera className="h-4 w-4 mr-1" />
              {album.photos?.length || 0} photos
            </div>
            {(album.favoritesCount || 0) > 0 && (
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                {album.favoritesCount || 0} favorites
              </div>
            )}
          </div>

          {/* Tags */}
          {album.tags && album.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {album.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      {album.photos && album.photos.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Camera className="h-6 w-6 mr-2" />
            Photo Gallery
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {album.photos.map((photo, index) => (
              <Card key={photo.id} className="overflow-hidden group">
                <div className="relative aspect-video">
                  <Image
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {album.coverPhotoId === photo.id && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default" className="text-xs">
                        Cover Photo
                      </Badge>
                    </div>
                  )}
                </div>
                {photo.caption && (
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground">
                      {photo.caption}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Photos Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start adding photos to bring your adventure to life!
            </p>
            <Button asChild>
              <Link href={`/albums/${album.id}/edit`}>Add Photos</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
