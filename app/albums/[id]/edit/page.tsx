"use client";

import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Camera,
  Upload,
  AlertCircle,
  Trash2,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { AlbumData } from "@/types/album";
import {
  uploadPhotosToAlbum,
  createPhotoPreviewUrl,
  validateImageFiles,
} from "@/lib/upload";

export default function EditAlbumPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [newTag, setNewTag] = useState("");

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    country: string;
    city: string;
    privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
    tags: string[];
  }>({
    title: "",
    description: "",
    country: "",
    city: "",
    privacy: "PUBLIC",
    tags: [],
  });

  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>(
    {}
  );

  // Photo upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  // Photo management state
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [settingCoverPhotoId, setSettingCoverPhotoId] = useState<string | null>(
    null
  );
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchAlbum = async () => {
      if (!params?.id) return;

      try {
        const response = await fetch(`/api/albums/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch album");
        }

        const albumData: AlbumData = await response.json();
        setAlbum(albumData);

        // Initialize form data
        setFormData({
          title: albumData.title,
          description: albumData.description || "",
          country: albumData.country,
          city: albumData.city || "",
          privacy: albumData.privacy,
          tags: albumData.tags,
        });

        // Initialize photo captions
        const captions: Record<string, string> = {};
        if (albumData.photos) {
          albumData.photos.forEach((photo) => {
            captions[photo.id] = photo.caption || "";
          });
        }
        setPhotoCaptions(captions);
      } catch (error) {
        logger.error("Error fetching album:", { error });
        toast.error("Failed to load album data");
        router.push("/albums");
      }
    };

    if (session?.user?.id) {
      fetchAlbum().finally(() => setLoading(false));
    }
  }, [params?.id, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album) return;

    setSaving(true);

    try {
      // Update album
      const albumResponse = await fetch(`/api/albums/${album.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!albumResponse.ok) {
        throw new Error("Failed to update album");
      }

      // Update photo captions
      if (album.photos) {
        for (const photo of album.photos) {
          if (photoCaptions[photo.id] !== photo.caption) {
            await fetch(`/api/photos/${photo.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                caption: photoCaptions[photo.id],
              }),
            });
          }
        }
      }

      // Upload new photos if any are selected
      if (selectedFiles.length > 0) {
        setIsUploadingPhotos(true);
        try {
          const uploadResult = await uploadPhotosToAlbum(
            album.id,
            selectedFiles
          );

          if (uploadResult.errors.length > 0) {
            toast.warning(`Album updated! ${uploadResult.message}`);
          } else {
            toast.success(`Album updated! ${uploadResult.message}`);
          }
        } catch (uploadError) {
          logger.error("Photo upload error:", { uploadError });
          toast.warning("Album updated but some photos failed to upload");
        } finally {
          setIsUploadingPhotos(false);
        }
      } else {
        toast.success("Album updated successfully!");
      }

      router.push(`/albums`);
    } catch (error) {
      logger.error("Error updating album:", { error });
      toast.error("Failed to update album");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (
      newTag.trim() &&
      !formData.tags.includes(newTag.trim()) &&
      formData.tags.length < 10
    ) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  // Photo upload handlers
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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  // Photo deletion handler
  const handleDeletePhoto = async (photoId: string) => {
    if (!album) return;

    setDeletingPhotoId(photoId);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete photo");
      }

      const result = await response.json();

      // Update album state to remove deleted photo
      setAlbum((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          photos: prev.photos?.filter((photo) => photo.id !== photoId),
          coverPhotoId: result.wasCoverPhoto ? undefined : prev.coverPhotoId,
          coverPhotoUrl: result.wasCoverPhoto ? undefined : prev.coverPhotoUrl,
        };
      });

      // Remove from captions state
      setPhotoCaptions((prev) => {
        const newCaptions = { ...prev };
        delete newCaptions[photoId];
        return newCaptions;
      });

      toast.success(
        result.wasCoverPhoto
          ? "Photo deleted successfully (was cover photo)"
          : "Photo deleted successfully"
      );
    } catch (error) {
      logger.error("Error deleting photo:", { error });
      toast.error("Failed to delete photo");
    } finally {
      setDeletingPhotoId(null);
      setConfirmDeletePhotoId(null);
    }
  };

  // Cover photo selection handler
  const handleSetCoverPhoto = async (photoId: string) => {
    if (!album) return;

    setSettingCoverPhotoId(photoId);
    try {
      const response = await fetch(`/api/albums/${album.id}/cover`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        throw new Error("Failed to set cover photo");
      }

      const updatedAlbum = await response.json();

      // Update album state
      setAlbum((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          coverPhotoId: updatedAlbum.coverPhotoId,
          coverPhotoUrl: updatedAlbum.coverPhotoUrl,
        };
      });

      toast.success("Cover photo updated successfully!");
    } catch (error) {
      logger.error("Error setting cover photo:", { error });
      toast.error("Failed to set cover photo");
    } finally {
      setSettingCoverPhotoId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading album...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !album) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/albums">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Albums
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Album</h1>
            <p className="text-muted-foreground">
              Update your photo album details
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Album Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Album title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe your album (max 500 characters)"
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.description.length}/500 characters
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="Country"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City (Optional)</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="City"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Captions */}
            {album.photos && album.photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Photo Captions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {album.photos.map((photo) => (
                      <div key={photo.id} className="space-y-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
                          <Image
                            src={photo.url}
                            alt="Album photo"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />

                          {/* Cover Photo Badge */}
                          {album.coverPhotoId === photo.id && (
                            <div className="absolute top-2 left-2">
                              <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Cover Photo
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                              {/* Set Cover Photo Button */}
                              {album.coverPhotoId !== photo.id && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCoverPhoto(photo.id)}
                                  disabled={settingCoverPhotoId === photo.id}
                                  className="bg-black/50 hover:bg-black/70 text-white p-1 rounded transition-colors"
                                  title="Set as cover photo"
                                >
                                  {settingCoverPhotoId === photo.id ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                                  ) : (
                                    <Star className="h-3 w-3" />
                                  )}
                                </button>
                              )}

                              {/* Delete Photo Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeletePhotoId(photo.id)
                                }
                                disabled={deletingPhotoId === photo.id}
                                className="bg-red-500/80 hover:bg-red-600/80 text-white p-1 rounded transition-colors"
                                title="Delete photo"
                              >
                                {deletingPhotoId === photo.id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        <Input
                          placeholder="Add a caption..."
                          value={photoCaptions[photo.id] || ""}
                          onChange={(e) =>
                            setPhotoCaptions((prev) => ({
                              ...prev,
                              [photo.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Photos</CardTitle>
              </CardHeader>
              <CardContent>
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-6">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Upload more photos</p>
                      <p className="text-xs text-muted-foreground">
                        Select multiple images (up to 50 photos total)
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
                      New Photos to Upload ({selectedFiles.length})
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="privacy">Privacy</Label>
                  <Select
                    value={formData.privacy}
                    onValueChange={(
                      value: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE"
                    ) => setFormData((prev) => ({ ...prev, privacy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="FRIENDS_ONLY">Friends Only</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="pr-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    maxLength={20}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    disabled={!newTag.trim() || formData.tags.length >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.tags.length}/10 tags
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Album Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Photos:</span>
                  <span className="font-medium">
                    {album.photos?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Created:</span>
                  <span className="font-medium">
                    {new Date(album.id).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/albums">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || isUploadingPhotos}>
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? "Saving..."
              : isUploadingPhotos
                ? "Uploading Photos..."
                : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Delete Photo Confirmation Dialog */}
      {confirmDeletePhotoId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-destructive/10 rounded-full">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Delete Photo</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this photo? This action cannot
                  be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeletePhotoId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeletePhoto(confirmDeletePhotoId)}
                disabled={deletingPhotoId === confirmDeletePhotoId}
              >
                {deletingPhotoId === confirmDeletePhotoId
                  ? "Deleting..."
                  : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
