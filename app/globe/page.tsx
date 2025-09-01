"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  MapPin,
  Calendar,
  Camera,
  Search,
  Eye,
  Users,
  Lock,
  Focus,
  List,
  Edit3,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import GlobeControls from "@/components/globe/globe-controls";
import GlobeStats from "@/components/globe/globe-stats";
import SimpleGlobe3D from "@/components/globe/simple-globe-3d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlbumData, AlbumDataWithDate, ensureAlbumDate } from "@/types/album";

export default function GlobePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumDataWithDate | null>(
    null
  );
  const [showPinList, setShowPinList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoutes, setShowRoutes] = useState(false);
  const [filters, setFilters] = useState({
    year: null as string | null,
    privacy: "all" as string,
    search: "",
  });

  // Fetch albums using real API
  const {
    data: albumsData,
    isLoading: albumsLoading,
    error,
  } = useQuery({
    queryKey: ["albums-globe"],
    queryFn: async () => {
      const response = await fetch("/api/albums?limit=1000");
      if (!response.ok) {
        throw new Error("Failed to fetch albums");
      }
      return response.json();
    },
    enabled: !!session?.user?.id,
  });

  const albums: AlbumData[] = albumsData?.albums || [];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load album data for globe");
    }
  }, [error]);

  if (status === "loading" || albumsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-8 mx-auto mb-2" />
                  <Skeleton className="h-6 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="w-full h-[600px] rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Filter albums based on filters and search
  const filteredAlbums = albums.filter((album) => {
    // Year filter
    if (
      filters.year &&
      new Date(album.date || album.createdAt).getFullYear().toString() !==
        filters.year
    )
      return false;

    // Privacy filter
    if (filters.privacy !== "all" && album.privacy !== filters.privacy)
      return false;

    // Search filter (search both filters.search and searchQuery)
    const searchTerm = (filters.search || searchQuery).toLowerCase();
    if (
      searchTerm &&
      !album.title.toLowerCase().includes(searchTerm) &&
      !album.country?.toLowerCase().includes(searchTerm) &&
      !album.city?.toLowerCase().includes(searchTerm)
    )
      return false;

    // Only show albums with coordinates
    if (!album.latitude || !album.longitude) return false;

    return true;
  });

  // Albums with valid coordinates for pins - ensure date is present for globe
  const albumsWithCoords = filteredAlbums
    .filter(
      (album) =>
        album.latitude !== null &&
        album.latitude !== undefined &&
        album.longitude !== null &&
        album.longitude !== undefined &&
        album.latitude !== 0 &&
        album.longitude !== 0 // Exclude default 0,0 coordinates
    )
    .map(ensureAlbumDate);

  // Calculate stats from albums
  const stats = {
    totalAlbums: albums.length,
    countries: [...new Set(albums.map((a) => a.country).filter(Boolean))]
      .length,
    cities: [...new Set(albums.map((a) => a.city).filter(Boolean))].length,
    totalPhotos: albums.reduce(
      (sum, album) => sum + (album._count?.photos || 0),
      0
    ),
    publicAlbums: albums.filter((a) => a.privacy === "PUBLIC").length,
    privateAlbums: albums.filter((a) => a.privacy === "PRIVATE").length,
  };

  const handlePinClick = (album: AlbumDataWithDate) => {
    setSelectedAlbum(album);
  };

  const handlePinListItemClick = (album: AlbumData) => {
    setSelectedAlbum(ensureAlbumDate(album));
    // Optionally focus the globe on this pin
  };

  const isOwner = (album: AlbumData) => {
    return session?.user?.id && albums.some((a) => a.id === album.id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Globe className="h-8 w-8 mr-3 text-primary" />
              Travel Globe
            </h1>
            <p className="text-muted-foreground">
              Visualize your photo albums from around the world
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/albums/new")}
          >
            <Camera className="h-4 w-4 mr-2" />
            New Album
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <GlobeStats stats={stats} />

      {/* Controls */}
      <GlobeControls
        filters={filters}
        onFiltersChange={setFilters}
        albums={albums || []}
        showRoutes={showRoutes}
        onShowRoutesChange={setShowRoutes}
      />

      {/* Globe Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Interactive Globe
              <Badge variant="secondary">{albumsWithCoords.length} pins</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPinList(!showPinList)}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                {showPinList ? "Hide" : "Show"} Pins
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-cyan-500/10">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full mr-1" />
                  Public
                </Badge>
                <Badge variant="outline" className="bg-amber-500/10">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-1" />
                  Friends
                </Badge>
                <Badge variant="outline" className="bg-red-500/10">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
                  Private
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SimpleGlobe3D
              albums={albumsWithCoords}
              onAlbumClick={handlePinClick}
              selectedAlbum={selectedAlbum}
              showRoutes={showRoutes}
            />

            {albumsWithCoords.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  No Travel Pins Yet
                </h3>
                <p className="mb-4">
                  Your albums need location coordinates to appear on the globe.
                </p>
                <Button onClick={() => router.push("/albums/new")}>
                  Create Your First Album
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Selected Album Details */}
      {selectedAlbum && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                {selectedAlbum.title}
                <Badge
                  variant={
                    selectedAlbum.privacy === "PUBLIC"
                      ? "default"
                      : selectedAlbum.privacy === "FRIENDS_ONLY"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-xs"
                >
                  {selectedAlbum.privacy === "PUBLIC" && (
                    <Eye className="h-3 w-3 mr-1" />
                  )}
                  {selectedAlbum.privacy === "FRIENDS_ONLY" && (
                    <Users className="h-3 w-3 mr-1" />
                  )}
                  {selectedAlbum.privacy === "PRIVATE" && (
                    <Lock className="h-3 w-3 mr-1" />
                  )}
                  {selectedAlbum.privacy}
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlbum(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="font-medium">
                  {selectedAlbum.city && `${selectedAlbum.city}, `}
                  {selectedAlbum.country}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date</p>
                <p className="font-medium">
                  {new Date(
                    selectedAlbum.date || selectedAlbum.createdAt
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Photos</p>
                <p className="font-medium">
                  {selectedAlbum._count?.photos || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Album ID</p>
                <p className="font-mono text-xs text-muted-foreground truncate">
                  {selectedAlbum.id}
                </p>
              </div>
            </div>

            {selectedAlbum.description && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm leading-relaxed">
                  {selectedAlbum.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/albums/${selectedAlbum.id}`)}
                variant="default"
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                View Details
              </Button>

              {isOwner(selectedAlbum) && (
                <Button
                  onClick={() =>
                    router.push(`/albums/${selectedAlbum.id}/edit`)
                  }
                  variant="outline"
                  className="flex-1"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Album
                </Button>
              )}

              <Button
                onClick={() => router.push(`/albums/${selectedAlbum.id}`)}
                variant="secondary"
                size="sm"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIN LIST PANEL at bottom - as requested */}
      {showPinList && albumsWithCoords.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Travel Pins ({albumsWithCoords.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlbums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => handlePinListItemClick(album)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedAlbum?.id === album.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Cover Photo */}
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {album.coverPhotoUrl ? (
                          <img
                            src={album.coverPhotoUrl}
                            alt={album.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Album Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {album.title}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {album.city && `${album.city}, `}
                            {album.country}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {/* Privacy Badge */}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              album.privacy === "PUBLIC"
                                ? "text-cyan-600 border-cyan-300"
                                : album.privacy === "FRIENDS_ONLY"
                                  ? "text-amber-600 border-amber-300"
                                  : "text-red-600 border-red-300"
                            }`}
                          >
                            {album.privacy === "PUBLIC" && (
                              <Eye className="h-3 w-3 mr-1" />
                            )}
                            {album.privacy === "FRIENDS_ONLY" && (
                              <Users className="h-3 w-3 mr-1" />
                            )}
                            {album.privacy === "PRIVATE" && (
                              <Lock className="h-3 w-3 mr-1" />
                            )}
                            {album.privacy}
                          </Badge>

                          {/* Photos Count */}
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            {album._count?.photos || 0}
                          </span>

                          {/* Date */}
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(
                              album.date || album.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        {album.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {album.description}
                          </p>
                        )}
                      </div>

                      {/* Focus Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinListItemClick(album);
                        }}
                      >
                        <Focus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAlbums.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No locations found matching &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </ScrollArea>

            {/* Pin List Stats */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredAlbums.length} of {albumsWithCoords.length}{" "}
                  travel locations
                </span>
                <div className="flex items-center gap-4">
                  <span>🌍 {stats.countries} countries</span>
                  <span>🏙️ {stats.cities} cities</span>
                  <span>📸 {stats.totalPhotos} photos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
