"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Calendar,
  Camera,
  Eye,
  Users,
  Lock,
  Edit3,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface AlbumPhoto {
  id: string;
  url: string;
  caption?: string;
  metadata?: string;
  createdAt: string;
}

interface AlbumDetails {
  id: string;
  title: string;
  description?: string;
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
    image?: string;
  };
  photos: AlbumPhoto[];
  photosCount: number;
  favoritesCount: number;
  coverPhotoUrl?: string;
}

interface AlbumDetailModalProps {
  albumId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (album: AlbumDetails) => void;
  onDelete?: (albumId: string) => void;
}

export function AlbumDetailModal({
  albumId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: AlbumDetailModalProps) {
  const { data: session } = useSession();
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);
  const queryClient = useQueryClient();

  // Fetch album details
  const {
    data: album,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["album-details", albumId],
    queryFn: async () => {
      if (!albumId) throw new Error("No album ID provided");
      const response = await fetch(`/api/albums/${albumId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch album details");
      }
      return response.json() as Promise<AlbumDetails>;
    },
    enabled: !!albumId && isOpen,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/albums/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete album");
      }
    },
    onSuccess: () => {
      toast.success("Album deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["albums-globe"] });
      onDelete?.(albumId!);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to delete album: ${error.message}`);
    },
  });

  const isOwner = album && session?.user?.id === album.user.id;

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this album? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate(albumId!);
    }
  };

  const privacyConfig = {
    PUBLIC: { icon: Eye, variant: "default" as const, color: "text-cyan-600" },
    FRIENDS_ONLY: {
      icon: Users,
      variant: "secondary" as const,
      color: "text-amber-600",
    },
    PRIVATE: { icon: Lock, variant: "outline" as const, color: "text-red-600" },
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive">Failed to load album details</p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          ) : album ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <DialogHeader className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl font-bold truncate">
                      {album.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative w-5 h-5 rounded-full overflow-hidden">
                        <Image
                          src={album.user.image || "/default-avatar.png"}
                          alt={album.user.name}
                          fill
                          className="object-cover"
                          sizes="20px"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        by {album.user.name}
                      </span>
                      <Badge
                        variant={privacyConfig[album.privacy].variant}
                        className={`${privacyConfig[album.privacy].color} ml-2`}
                      >
                        {React.createElement(
                          privacyConfig[album.privacy].icon,
                          {
                            className: "h-3 w-3 mr-1",
                          }
                        )}
                        {album.privacy}
                      </Badge>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit?.(album)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDelete}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(`/albums/${album.id}`, "_blank")
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-6">
                  {/* Album Info */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        Location
                      </div>
                      <p className="font-medium">
                        {album.city && `${album.city}, `}
                        {album.country}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        Created
                      </div>
                      <p className="font-medium">
                        {new Date(album.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Camera className="h-4 w-4" />
                        Photos
                      </div>
                      <p className="font-medium">{album.photosCount}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {album.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Description
                      </p>
                      <p className="text-sm leading-relaxed">
                        {album.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {album.tags && album.tags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {album.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo Gallery */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Photos ({album.photos.length})
                      </p>
                    </div>

                    {album.photos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {album.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative group aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <Image
                              src={photo.url}
                              alt={photo.caption || "Album photo"}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {photo.caption && (
                                <p className="text-white text-xs bg-black/50 rounded px-2 py-1 truncate">
                                  {photo.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>No photos in this album yet</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Created on{" "}
                        {new Date(album.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {album.updatedAt !== album.createdAt && (
                        <span>
                          Updated{" "}
                          {new Date(album.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || "Photo"}
                width={0}
                height={0}
                className="w-full max-h-[80vh] object-contain bg-black"
                sizes="100vw"
                style={{ width: "auto", height: "auto", maxHeight: "80vh" }}
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setSelectedPhoto(null)}
              >
                ✕
              </Button>
              {selectedPhoto.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <p className="text-white text-sm">{selectedPhoto.caption}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
