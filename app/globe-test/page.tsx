"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlbumDataWithDate } from "@/types/album";

// Dynamically import the 3D globe to avoid SSR issues
const SimpleGlobe3D = dynamic(
  () => import("@/components/globe/simple-globe-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-black rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <p>Loading 3D Globe...</p>
        </div>
      </div>
    ),
  }
);

type TestAlbumData = AlbumDataWithDate;

// Test data with real world locations
const testAlbums: TestAlbumData[] = [
  {
    id: "0",
    title: "Amazing Tokyo Journey",
    country: "Japan",
    city: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    date: "2019-10-15", // Historical trip date
    createdAt: "2024-04-01",
    description:
      "Incredible adventures through Tokyo - from Shibuya to Harajuku",
    privacy: "PUBLIC" as const,
    tags: ["japan", "tokyo", "urban", "culture"],
    _count: { photos: 87 },
  },
  {
    id: "1",
    title: "Eiffel Tower Views",
    country: "France",
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    date: "2020-08-22", // Historical trip date
    createdAt: "2024-03-15",
    description: "Amazing views from the Eiffel Tower",
    privacy: "PUBLIC" as const,
    tags: ["travel", "photography"],
    _count: { photos: 25 },
  },
  {
    id: "2",
    title: "Times Square Energy",
    country: "USA",
    city: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    date: "2021-06-10", // Historical trip date
    createdAt: "2024-02-20",
    description: "The bustling heart of NYC",
    privacy: "PUBLIC" as const,
    tags: ["urban", "nightlife"],
    _count: { photos: 30 },
  },
  {
    id: "3",
    title: "Tokyo Street Photography",
    country: "Japan",
    city: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    date: "2018-03-25", // Historical trip date
    createdAt: "2024-01-10",
    description: "Neon lights and urban life",
    privacy: "FRIENDS_ONLY" as const,
    tags: ["street", "neon"],
    _count: { photos: 45 },
  },
  {
    id: "4",
    title: "Sydney Opera House",
    country: "Australia",
    city: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
    date: "2022-11-20", // Historical trip date
    createdAt: "2023-12-05",
    description: "Iconic architecture by the harbor",
    privacy: "PUBLIC" as const,
    tags: ["architecture", "harbor"],
    _count: { photos: 20 },
  },
  {
    id: "5",
    title: "Dubai Skyline",
    country: "UAE",
    city: "Dubai",
    latitude: 25.2048,
    longitude: 55.2708,
    date: "2022-09-15", // Historical trip date
    createdAt: "2023-11-15",
    description: "Modern marvels in the desert",
    privacy: "PRIVATE" as const,
    tags: ["skyline", "modern"],
    _count: { photos: 35 },
  },
  {
    id: "6",
    title: "London Bridge Walk",
    country: "UK",
    city: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    date: "2022-07-10", // Historical trip date
    createdAt: "2023-10-20",
    description: "Historic Thames crossing",
    privacy: "PUBLIC" as const,
    tags: ["history", "bridge"],
    _count: { photos: 28 },
  },
  {
    id: "7",
    title: "Santorini Sunset",
    country: "Greece",
    city: "Santorini",
    latitude: 36.3932,
    longitude: 25.4615,
    date: "2022-06-05", // Historical trip date
    createdAt: "2023-09-10",
    description: "Blue domes and white walls",
    privacy: "PUBLIC" as const,
    tags: ["sunset", "island"],
    _count: { photos: 40 },
  },
  {
    id: "8",
    title: "Rio Carnival",
    country: "Brazil",
    city: "Rio de Janeiro",
    latitude: -22.9068,
    longitude: -43.1729,
    date: "2022-02-25", // Historical trip date
    createdAt: "2023-08-15",
    description: "Vibrant celebrations",
    privacy: "PUBLIC" as const,
    tags: ["carnival", "festival"],
    _count: { photos: 50 },
  },
];

export default function GlobeTestPage() {
  const handleAlbumClick = (album: TestAlbumData) => {
    console.log("Album clicked:", album);
    alert(`Clicked on: ${album.title} in ${album.city}, ${album.country}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>🌍 Globe Test - Simplified React Three Fiber</CardTitle>
          <p className="text-muted-foreground">
            Testing the simplified 3D globe with {testAlbums.length} album pins
            at real world locations
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>📍 Pin Colors:</strong>{" "}
              <span className="text-cyan-500">● Public</span>{" "}
              <span className="text-amber-500">● Friends Only</span>{" "}
              <span className="text-red-500">● Private</span>
            </p>
            <p className="text-sm mt-2">
              <strong>🎮 Controls:</strong> Click and drag to rotate • Scroll to
              zoom • Hover/Click pins for details
            </p>
          </div>

          <Suspense
            fallback={(
              <div className="w-full h-[600px] bg-black rounded-lg flex items-center justify-center">
                <p className="text-white">Loading Globe...</p>
              </div>
            )}
          >
            <SimpleGlobe3D
              albums={testAlbums}
              onAlbumClick={handleAlbumClick}
              selectedAlbum={null}
            />
          </Suspense>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {testAlbums.map((album) => (
              <div key={album.id} className="p-3 bg-muted rounded-lg">
                <p className="font-semibold text-sm">{album.city}</p>
                <p className="text-xs text-muted-foreground">{album.country}</p>
                <p className="text-xs mt-1">
                  📍 {album.latitude!.toFixed(2)}°,{" "}
                  {album.longitude!.toFixed(2)}°
                </p>
                <Badge
                  variant={
                    album.privacy === "PUBLIC"
                      ? "default"
                      : album.privacy === "FRIENDS_ONLY"
                        ? "secondary"
                        : "outline"
                  }
                  className="mt-1 text-xs"
                >
                  {album.privacy}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
