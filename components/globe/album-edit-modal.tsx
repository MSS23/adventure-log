"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, X, Plus, Eye, Users, Lock } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const editAlbumSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  country: z.string().min(1, "Country is required"),
  city: z.string().optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]),
  date: z.string().min(1, "Date is required"), // Trip date in YYYY-MM-DD format
});

type EditAlbumFormData = z.infer<typeof editAlbumSchema>;

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
  date: string; // Trip date - when the visit actually occurred
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
    image?: string;
  };
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
  }>;
  photosCount: number;
  favoritesCount: number;
}

interface AlbumEditModalProps {
  album: AlbumDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedAlbum: AlbumDetails) => void;
}

const privacyOptions = [
  {
    value: "PUBLIC",
    label: "Public",
    description: "Anyone can see this album",
    icon: Eye,
    color: "text-cyan-600",
  },
  {
    value: "FRIENDS_ONLY" as const,
    label: "Friends Only",
    description: "Only people you follow can see this album",
    icon: Users,
    color: "text-amber-600",
  },
  {
    value: "PRIVATE" as const,
    label: "Private",
    description: "Only you can see this album",
    icon: Lock,
    color: "text-red-600",
  },
];

export function AlbumEditModal({
  album,
  isOpen,
  onClose,
  onSuccess,
}: AlbumEditModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditAlbumFormData>({
    resolver: zodResolver(editAlbumSchema),
  });

  // Reset form when album changes
  useEffect(() => {
    if (album) {
      // Convert the date to YYYY-MM-DD format for the date input
      const tripDate = album.date
        ? new Date(album.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      reset({
        title: album.title,
        description: album.description || "",
        country: album.country,
        city: album.city || "",
        privacy: album.privacy,
        date: tripDate,
      });
      setTags(album.tags || []);
    }
  }, [album, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditAlbumFormData & { tags: string[] }) => {
      if (!album) throw new Error("No album to update");

      const response = await fetch(`/api/albums/${album.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update album");
      }

      return response.json();
    },
    onSuccess: (updatedAlbum) => {
      toast.success("Album updated successfully");
      queryClient.invalidateQueries({ queryKey: ["albums-globe"] });
      queryClient.invalidateQueries({ queryKey: ["album-details", album?.id] });
      onSuccess?.(updatedAlbum);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update album: ${error.message}`);
    },
  });

  const onSubmit = (data: EditAlbumFormData) => {
    // Convert date from YYYY-MM-DD format to ISO datetime string for API
    const tripDate = new Date(data.date);
    const isoDateString = tripDate.toISOString();

    updateMutation.mutate({
      ...data,
      date: isoDateString,
      tags,
    });
  };

  const addTag = () => {
    if (newTag.trim() && tags.length < 10 && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  if (!album) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Album</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Album Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Enter album title..."
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe your travel experience..."
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...register("country")}
                  placeholder="e.g. Japan"
                />
                {errors.country && (
                  <p className="text-sm text-destructive">
                    {errors.country.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="e.g. Tokyo"
                />
              </div>
            </div>

            {/* Trip Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Trip Date</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                className="w-full"
              />
              {errors.date && (
                <p className="text-sm text-destructive">
                  {errors.date.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                When did you visit this place? This helps organize your travel
                timeline.
              </p>
            </div>

            {/* Privacy Setting */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select
                value={watch("privacy")}
                onValueChange={(value: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE") =>
                  setValue("privacy", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select privacy level" />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {React.createElement(option.icon, {
                          className: `h-4 w-4 ${option.color}`,
                        })}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={handleKeyPress}
                  maxLength={20}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={tags.length >= 10 || !newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      #{tag}
                      <button
                        type="button"
                        className="ml-2 hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {tags.length}/10 tags. Press Enter to add a tag.
              </p>
            </div>

            {/* Current Stats */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium">{album.photosCount}</p>
                  <p className="text-muted-foreground">Photos</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{album.favoritesCount}</p>
                  <p className="text-muted-foreground">Likes</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">
                    {new Date(album.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-muted-foreground">Created</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting || updateMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || updateMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
