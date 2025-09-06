"use client";

import { useAuth } from "@/app/providers";
import { useState, useEffect, useCallback } from "react";

import { AlbumData, AlbumPhoto } from "@/types/album";

interface UseAlbumsDataReturn {
  albums: AlbumData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  stats: {
    totalAlbums: number;
    countriesVisited: number;
    totalDistance: number;
    continentsVisited: number;
    totalPhotos: number;
  };
}

// Helper function to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to determine continent from coordinates
function getContinent(lat: number, lng: number): string {
  // Simplified continent detection based on coordinates
  if (lat >= 35 && lng >= -10 && lng <= 70) return "Europe";
  if (lat >= -35 && lat <= 35 && lng >= -20 && lng <= 55) return "Africa";
  if (lat >= 5 && lng >= 70 && lng <= 180) return "Asia";
  if (lat <= 5 && lng >= 95 && lng <= 155) return "Oceania";
  if (lng >= -180 && lng <= -30) return "Americas";
  if (lat <= -35 && lng >= -80 && lng <= 180) return "Antarctica";
  return "Unknown";
}

export function useAlbumsData(): UseAlbumsDataReturn {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbums = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/albums?limit=1000&includePhotos=true"); // Get all albums with photos

      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }

      const data = await response.json();
      const albumsData: AlbumData[] = data.albums.map((album: any) => ({
        id: album.id,
        title: album.title,
        description: album.description || "",
        country: album.country,
        city: album.city || "",
        latitude: album.latitude || 0,
        longitude: album.longitude || 0,
        date: album.date || album.createdAt,
        privacy: album.privacy || "PUBLIC",
        tags: Array.isArray(album.tags) ? album.tags : [],
        photosCount: album.photosCount || 0,
        viewCount: album.viewCount || 0,
        shareCount: album.shareCount || 0,
        visitDuration: album.visitDuration || "",
        weather: album.weather || "",
        companions: album.companions || "",
        photos: album.photos
          ? album.photos
              .map((photo: any) => ({
                id: photo.id,
                url: photo.url,
                caption: photo.caption || "",
                metadata: photo.metadata || "",
                createdAt: photo.createdAt,
              }))
              .sort(
                (a: AlbumPhoto, b: AlbumPhoto) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .slice(0, 3)
          : [], // Get top 3 most recent photos
        coverPhotoUrl: album.coverPhotoUrl || album.photos?.[0]?.url,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
      }));

      setAlbums(albumsData);
    } catch (err) {
      console.error("Error fetching albums:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch albums");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Calculate travel statistics
  const stats = {
    totalAlbums: albums.length,
    countriesVisited: new Set(albums.map((album) => album.country)).size,
    totalDistance:
      albums.length > 1
        ? albums.slice(1).reduce((total, album, index) => {
            const prevAlbum = albums[index];
            if (
              prevAlbum.latitude &&
              prevAlbum.longitude &&
              album.latitude &&
              album.longitude
            ) {
              return (
                total +
                calculateDistance(
                  prevAlbum.latitude,
                  prevAlbum.longitude,
                  album.latitude,
                  album.longitude
                )
              );
            }
            return total;
          }, 0)
        : 0,
    continentsVisited: new Set(
      albums
        .filter((album) => album.latitude && album.longitude)
        .map((album) => getContinent(album.latitude!, album.longitude!))
        .filter((continent) => continent !== "Unknown")
    ).size,
    totalPhotos: albums.reduce(
      (total, album) => total + (album.photosCount || 0),
      0
    ),
  };

  useEffect(() => {
    fetchAlbums();
  }, [user?.id, fetchAlbums]);

  return {
    albums,
    loading,
    error,
    refetch: fetchAlbums,
    stats,
  };
}
