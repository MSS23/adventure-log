"use client";

import { ArrowLeft, Save, Plus, X, Camera } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
        console.error("Error fetching album:", error);
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

      toast.success("Album updated successfully!");
      router.push(`/albums`);
    } catch (error) {
      console.error("Error updating album:", error);
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
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={photo.url}
                            alt="Album photo"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded">
                            <Camera className="h-3 w-3" />
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
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
