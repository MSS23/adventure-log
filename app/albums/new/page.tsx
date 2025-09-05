"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Camera,
  Upload,
  Plus,
  X,
  MapPin,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadPhotosToAlbum,
  createPhotoPreviewUrl,
  validateImageFiles,
} from "@/lib/upload";

export const dynamic = "force-dynamic";

const albumFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  country: z.string().min(1, "Country is required"),
  city: z.string().optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]),
  tags: z.array(z.string()).max(10, "Too many tags"),
});

type AlbumFormData = z.infer<typeof albumFormSchema>;

export default function NewAlbumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const form = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      title: "",
      description: "",
      country: "",
      city: "",
      privacy: "PUBLIC",
      tags: [],
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    form.setValue("tags", tags);
  }, [tags, form]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const { validFiles, errors } = validateImageFiles(files);

    setFileErrors(errors);

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles].slice(0, 50); // Limit to 50 photos
      setSelectedFiles(newFiles);

      // Create preview URLs for new files
      const newPreviewUrls = validFiles.map((file) =>
        createPhotoPreviewUrl(file)
      );
      setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls].slice(0, 50));
    }

    if (errors.length > 0) {
      toast.error(`${errors.length} file(s) could not be added`);
    }

    // Reset input
    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => {
      // Revoke the object URL to free memory
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Geocode location when country/city changes
  const geocodeLocation = async (country: string, city?: string) => {
    if (!country) return;

    setIsGeocodingLocation(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ country, city }),
      });

      if (response.ok) {
        const data = await response.json();
        setCoordinates({ lat: data.latitude, lng: data.longitude });
        logger.debug(`Geocoded ${city || ""} ${country}:`, {
          latitude: data.latitude,
          longitude: data.longitude
        });
      } else {
        logger.warn("Could not geocode location");
        setCoordinates(null);
      }
    } catch (error) {
      logger.error("Geocoding error:", { error });
      setCoordinates(null);
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  // Watch for country/city changes
  const country = form.watch("country");
  const city = form.watch("city");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (country) {
        geocodeLocation(country, city);
      }
    }, 500); // Debounce geocoding

    return () => clearTimeout(timer);
  }, [country, city]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const onSubmit = async (data: AlbumFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      // First create the album
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tags,
          latitude: coordinates?.lat,
          longitude: coordinates?.lng,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create album");
      }

      const album = await response.json();
      logger.debug("Album created successfully:", { album });

      // Upload photos if any are selected
      if (selectedFiles.length > 0) {
        setIsUploadingPhotos(true);
        try {
          const uploadResult = await uploadPhotosToAlbum(
            album.id,
            selectedFiles
          );

          if (uploadResult.errors.length > 0) {
            toast.warning(uploadResult.message);
          } else {
            toast.success(uploadResult.message);
          }
        } catch (uploadError) {
          logger.error("Photo upload error:", { error: uploadError });
          toast.error("Album created but photo upload failed");
        } finally {
          setIsUploadingPhotos(false);
        }
      }

      router.push("/albums");
    } catch (error) {
      logger.error("Error creating album:", { error });
      toast.error(
        error instanceof Error ? error.message : "Failed to create album"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/albums">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Albums
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Camera className="h-8 w-8 mr-3 text-primary" />
            Create New Album
          </h1>
          <p className="text-muted-foreground">
            Organize your travel photos into a beautiful collection
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Album Details */}
        <Card>
          <CardHeader>
            <CardTitle>Album Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Album Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Paris Street Photography"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your photo collection..."
                rows={3}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    placeholder="e.g., France"
                    {...form.register("country")}
                  />
                  {form.formState.errors.country && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.country.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Paris"
                    {...form.register("city")}
                  />
                </div>
              </div>

              {/* Location Status */}
              {(isGeocodingLocation || coordinates) && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    {isGeocodingLocation ? (
                      <span className="text-muted-foreground">
                        Finding location coordinates...
                      </span>
                    ) : coordinates ? (
                      <span className="text-foreground">
                        📍 Location found: {coordinates.lat.toFixed(4)}°,{" "}
                        {coordinates.lng.toFixed(4)}°
                      </span>
                    ) : (
                      <span className="text-destructive">
                        Could not find location coordinates
                      </span>
                    )}
                  </div>
                  {coordinates && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This location will appear as a pin on the globe map
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <Label>Privacy Setting</Label>
              <Select
                value={form.getValues("privacy")}
                onValueChange={(value: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE") =>
                  form.setValue("privacy", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">
                    Public - Anyone can see
                  </SelectItem>
                  <SelectItem value="FRIENDS_ONLY">Friends Only</SelectItem>
                  <SelectItem value="PRIVATE">Private - Only you</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add up to 10 tags to categorize your album
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-6">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Upload your photos</p>
                  <p className="text-xs text-muted-foreground">
                    Select multiple images (up to 50 photos)
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("photo-upload")?.click()
                  }
                >
                  Choose Photos
                </Button>
              </div>
            </div>

            {/* File Errors */}
            {fileErrors.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">
                    File Upload Errors
                  </p>
                </div>
                <ul className="text-xs text-destructive space-y-1">
                  {fileErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Selected Photos */}
            {selectedFiles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">
                  Selected Photos ({selectedFiles.length})
                </p>
                <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        {photoPreviewUrls[index] ? (
                          <Image
                            src={photoPreviewUrls[index]}
                            alt={file.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 25vw, 15vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/albums")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploadingPhotos}
            className="flex-1"
          >
            {isSubmitting
              ? "Creating Album..."
              : isUploadingPhotos
                ? "Uploading Photos..."
                : "Create Album"}
          </Button>
        </div>
      </form>
    </div>
  );
}
