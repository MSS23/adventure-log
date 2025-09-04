"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Grid,
  List,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  ZoomIn,
  Share2,
  Calendar,
  FileImage,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
<<<<<<< HEAD
import {
  listAlbumPhotos,
  deletePhoto,
  getUserStorageUsage,
  type PhotoListItem,
} from "@/lib/storage-simple";
=======

// Types for the new server-side API
interface PhotoListItem {
  path: string;
  publicUrl: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

interface AlbumPhotosResponse {
  success: boolean;
  photos: PhotoListItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    total: number;
    nextOffset: number | null;
  };
  usage?: {
    totalSizeBytes: number;
    totalFiles: number;
    formattedSize: string;
  };
  summary: {
    photosInStorage: number;
    photosReturned: number;
    totalSizeBytes: number;
  };
}
>>>>>>> oauth-upload-fixes

interface AlbumPhotoGalleryProps {
  albumId: string;
  albumTitle?: string;
  onPhotoDeleted?: (photoPath: string) => void;
  onPhotosRefresh?: () => void;
  className?: string;
  viewMode?: "grid" | "list";
  showUploadButton?: boolean;
  maxPhotosToShow?: number;
}

interface GalleryPhoto extends PhotoListItem {
  isSelected: boolean;
  isLoading: boolean;
}

type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "name" | "size";

export function AlbumPhotoGallery({
  albumId,
  albumTitle,
  onPhotoDeleted,
  onPhotosRefresh,
  className = "",
  viewMode: defaultViewMode = "grid",
  showUploadButton: _showUploadButton = true,
  maxPhotosToShow,
}: AlbumPhotoGalleryProps) {
  const { data: session } = useSession();

  // State
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{
    totalSizeBytes: number;
    totalFiles: number;
    formattedSize: string;
  } | null>(null);

<<<<<<< HEAD
  // Load photos
=======
  // Load photos using server-side API
>>>>>>> oauth-upload-fixes
  const loadPhotos = useCallback(
    async (append = false) => {
      if (!session?.user?.id) return;

      try {
        if (!append) {
          setIsLoading(true);
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

<<<<<<< HEAD
        const sortConfig = {
          newest: { sortBy: "created_at" as const, sortOrder: "desc" as const },
          oldest: { sortBy: "created_at" as const, sortOrder: "asc" as const },
          name: { sortBy: "name" as const, sortOrder: "asc" as const },
          size: { sortBy: "updated_at" as const, sortOrder: "desc" as const }, // Approximate
        };

        const { sortBy: sortField, sortOrder } = sortConfig[sortBy];
        const offset = append ? photos.length : 0;
        const limit = maxPhotosToShow || 50;

        const result = await listAlbumPhotos(session.user.id, albumId, {
          limit,
          offset,
          sortBy: sortField,
          sortOrder,
        });

=======
        const offset = append ? photos.length : 0;
        const limit = maxPhotosToShow || 50;

        // Build query parameters
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          sortBy:
            sortBy === "newest"
              ? "created_at"
              : sortBy === "oldest"
                ? "created_at"
                : sortBy === "name"
                  ? "name"
                  : "created_at",
          sortOrder: sortBy === "oldest" || sortBy === "name" ? "asc" : "desc",
          includeUsage: (!append && photos.length === 0).toString(), // Include usage on initial load
        });

        const response = await fetch(
          `/api/albums/${albumId}/photos?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to load photos" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result: AlbumPhotosResponse = await response.json();

>>>>>>> oauth-upload-fixes
        const newPhotos: GalleryPhoto[] = result.photos.map((photo) => ({
          ...photo,
          isSelected: false,
          isLoading: false,
        }));

        if (append) {
          setPhotos((prev) => [...prev, ...newPhotos]);
        } else {
          setPhotos(newPhotos);
<<<<<<< HEAD
        }

        setHasMore(result.hasMore);
=======
          // Update storage usage if provided
          if (result.usage) {
            setStorageUsage(result.usage);
          }
        }

        setHasMore(result.pagination.hasMore);
>>>>>>> oauth-upload-fixes
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load photos";
        setError(errorMessage);
        console.error("Failed to load photos:", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [session?.user?.id, albumId, sortBy, photos.length, maxPhotosToShow]
  );

<<<<<<< HEAD
  // Load storage usage
  const loadStorageUsage = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const usage = await getUserStorageUsage(session.user.id);
      setStorageUsage(usage);
    } catch (err) {
      console.error("Failed to load storage usage:", err);
    }
  }, [session?.user?.id]);

  // Effects
  useEffect(() => {
    loadPhotos();
    loadStorageUsage();
  }, [loadPhotos, loadStorageUsage]);
=======
  // Effects
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);
>>>>>>> oauth-upload-fixes

  // Refresh handler
  const handleRefresh = useCallback(() => {
    loadPhotos();
<<<<<<< HEAD
    loadStorageUsage();
    onPhotosRefresh?.();
  }, [loadPhotos, loadStorageUsage, onPhotosRefresh]);

  // Delete photo handler
=======
    onPhotosRefresh?.();
  }, [loadPhotos, onPhotosRefresh]);

  // Delete photo handler using server-side API
>>>>>>> oauth-upload-fixes
  const handleDeletePhoto = useCallback(
    async (photo: GalleryPhoto) => {
      if (!session?.user?.id || isDeleting) return;

      setIsDeleting(photo.path);

      try {
<<<<<<< HEAD
        await deletePhoto(session.user.id, photo.path);

        setPhotos((prev) => prev.filter((p) => p.path !== photo.path));
        onPhotoDeleted?.(photo.path);

        // Update storage usage
        loadStorageUsage();
=======
        const response = await fetch("/api/storage/file", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: photo.path,
            albumId: albumId,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to delete photo" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        // Remove photo from local state
        setPhotos((prev) => prev.filter((p) => p.path !== photo.path));
        onPhotoDeleted?.(photo.path);

        // Update storage usage by refreshing photos (which includes usage)
        setTimeout(() => {
          loadPhotos();
        }, 100);
>>>>>>> oauth-upload-fixes
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete photo";
        setError(errorMessage);
        console.error("Failed to delete photo:", err);
      } finally {
        setIsDeleting(null);
      }
    },
<<<<<<< HEAD
    [session?.user?.id, isDeleting, onPhotoDeleted, loadStorageUsage]
=======
    [session?.user?.id, isDeleting, albumId, onPhotoDeleted, loadPhotos]
>>>>>>> oauth-upload-fixes
  );

  // Download photo handler
  const handleDownloadPhoto = useCallback(async (photo: GalleryPhoto) => {
    try {
      const response = await fetch(photo.publicUrl);
      if (!response.ok) throw new Error("Failed to download photo");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = photo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download photo:", err);
      setError("Failed to download photo");
    }
  }, []);

  // Share photo handler
  const handleSharePhoto = useCallback(
    async (photo: GalleryPhoto) => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Photo from ${albumTitle || "Album"}`,
            url: photo.publicUrl,
          });
        } catch (err) {
          // User cancelled sharing
        }
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(photo.publicUrl);
          // You might want to show a toast notification here
        } catch (err) {
          console.error("Failed to copy URL:", err);
        }
      }
    },
    [albumTitle]
  );

  // Load more photos
  const loadMorePhotos = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadPhotos(true);
    }
  }, [isLoadingMore, hasMore, loadPhotos]);

  // Sorted and filtered photos
  const displayPhotos = useMemo(() => {
    return photos.slice(0, maxPhotosToShow);
  }, [photos, maxPhotosToShow]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  if (!session?.user?.id) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please sign in to view photos.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              {albumTitle ? `${albumTitle} Photos` : "Album Photos"}
            </h2>
            <Badge variant="secondary">
              {photos.length} photo{photos.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {storageUsage && (
            <p className="text-sm text-gray-500 mt-1">
              {storageUsage.formattedSize} used • {storageUsage.totalFiles}{" "}
              total files
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort:{" "}
                {sortBy === "newest"
                  ? "Newest"
                  : sortBy === "oldest"
                    ? "Oldest"
                    : sortBy === "name"
                      ? "Name"
                      : "Size"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")}>
                Name A-Z
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && photos.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No photos yet</h3>
            <p className="text-gray-500 mb-4">
              Start by uploading some photos to this album.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photo Gallery */}
      {!isLoading && displayPhotos.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayPhotos.map((photo) => (
                <Card key={photo.path} className="group overflow-hidden">
                  <CardContent className="p-0 relative aspect-square">
                    <Image
                      src={photo.publicUrl}
                      alt={`Photo: ${photo.name}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedPhoto(photo)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>{selectedPhoto?.name}</DialogTitle>
                            </DialogHeader>
                            {selectedPhoto && (
                              <div className="flex flex-col items-center">
                                <div className="relative max-w-full max-h-[70vh]">
                                  <Image
                                    src={selectedPhoto.publicUrl}
                                    alt={`Full view: ${selectedPhoto.name}`}
                                    width={800}
                                    height={600}
                                    className="max-w-full max-h-[70vh] object-contain"
                                    sizes="(max-width: 768px) 100vw, 800px"
                                  />
                                </div>
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      handleDownloadPhoto(selectedPhoto)
                                    }
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      handleSharePhoto(selectedPhoto)
                                    }
                                  >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleDownloadPhoto(photo)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSharePhoto(photo)}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <Separator />
                            <DropdownMenuItem
                              onClick={() => handleDeletePhoto(photo)}
                              className="text-red-600"
                              disabled={isDeleting === photo.path}
                            >
                              {isDeleting === photo.path ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Photo Info Badge */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(photo.sizeBytes)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {displayPhotos.map((photo, index) => (
                    <div key={photo.path}>
                      <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={photo.publicUrl}
                            alt={`Thumbnail: ${photo.name}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{photo.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(photo.createdAt)}
                            </span>
                            <span>{formatFileSize(photo.sizeBytes)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ZoomIn className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <div className="relative max-w-full max-h-[80vh] mx-auto">
                                <Image
                                  src={photo.publicUrl}
                                  alt={`Full view: ${photo.name}`}
                                  width={800}
                                  height={600}
                                  className="max-w-full max-h-[80vh] object-contain"
                                  sizes="(max-width: 768px) 100vw, 800px"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDownloadPhoto(photo)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSharePhoto(photo)}
                              >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <Separator />
                              <DropdownMenuItem
                                onClick={() => handleDeletePhoto(photo)}
                                className="text-red-600"
                                disabled={isDeleting === photo.path}
                              >
                                {isDeleting === photo.path ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {index < displayPhotos.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Load More Button */}
          {hasMore && !maxPhotosToShow && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={loadMorePhotos}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Load More Photos
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
