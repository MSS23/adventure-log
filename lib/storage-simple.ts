/**
 * Simplified Photo Upload System for Adventure Log
 * Based on proven SupabaseImageGallery pattern with 2024 best practices
 */

import { supabase } from "./supabase";
import { nanoid } from "nanoid";
import { clientEnv } from "@/src/env";

// Core Types
export interface UploadedPhoto {
  id?: string;
  path: string;
  publicUrl: string;
  fileName?: string;
  fileSize?: number;
  sizeBytes: number;
  mimeType: string;
  userId?: string;
  albumId?: string;
  createdAt: string;
  width?: number;
  height?: number;
  originalName?: string;
  optimized?: boolean;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface PhotoListItem {
  path: string;
  publicUrl: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
}

// Constants
export const BUCKET_NAME =
  clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET || "adventure-photos";
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Validation
export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Max size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error:
        "Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed",
    };
  }

  return { isValid: true };
}

// Path generation following user-scoped pattern
export function generatePhotoPath(
  userId: string,
  albumId: string,
  fileName: string
): string {
  const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueId = nanoid();
  const timestamp = Date.now();
  return `${userId}/albums/${albumId}/${timestamp}-${uniqueId}.${fileExt}`;
}

// Get public URL for uploaded file
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return data.publicUrl;
}

// Single file upload (client-side with user authentication)
export async function uploadPhoto(
  file: File,
  userId: string,
  albumId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedPhoto> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const fileId = nanoid();
  const path = generatePhotoPath(userId, albumId, file.name);

  // Notify upload started
  onProgress?.({
    fileId,
    fileName: file.name,
    progress: 0,
    status: "uploading",
  });

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Notify upload completed
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 100,
      status: "completed",
    });

    // Return uploaded photo info
    const uploadedPhoto: UploadedPhoto = {
      id: fileId,
      path: data.path,
      publicUrl: getPublicUrl(data.path),
      fileName: file.name,
      fileSize: file.size,
      sizeBytes: file.size,
      mimeType: file.type,
      userId,
      albumId,
      createdAt: new Date().toISOString(),
    };

    return uploadedPhoto;
  } catch (error) {
    // Notify upload error
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Upload failed",
    });

    throw error;
  }
}

// Multiple file upload
export async function uploadMultiplePhotos(
  files: File[],
  userId: string,
  albumId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedPhoto[]> {
  const results: UploadedPhoto[] = [];

  for (const file of files) {
    try {
      const result = await uploadPhoto(file, userId, albumId, onProgress);
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      // Continue with other files
    }
  }

  return results;
}

// Get user's photos from a specific album
export async function getAlbumPhotos(
  userId: string,
  albumId: string
): Promise<string[]> {
  const folderPath = `${userId}/albums/${albumId}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("Error fetching photos:", error);
    return [];
  }

  return data
    .filter(
      (file) => file.name && !file.name.includes(".emptyFolderPlaceholder")
    )
    .map((file) => getPublicUrl(`${folderPath}/${file.name}`));
}

// Delete photo
export async function deletePhoto(
  _userId: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// Get all user photos
export async function getUserPhotos(userId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(userId, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("Error fetching user photos:", error);
    return [];
  }

  const allPhotos: string[] = [];

  // Get photos from all albums
  for (const item of data) {
    if (item.name === "albums") {
      const { data: albums } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`${userId}/albums`, { limit: 100 });

      if (albums) {
        for (const album of albums) {
          if (album.name) {
            const albumPhotos = await getAlbumPhotos(userId, album.name);
            allPhotos.push(...albumPhotos);
          }
        }
      }
    }
  }

  return allPhotos;
}

// List album photos with metadata for gallery
export async function listAlbumPhotos(
  userId: string,
  albumId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<{ photos: PhotoListItem[]; hasMore: boolean }> {
  const {
    limit = 1000,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "desc",
  } = options;
  const folderPath = `${userId}/albums/${albumId}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: limit + 1, // Fetch one extra to check if there are more
      offset,
      sortBy: { column: sortBy, order: sortOrder },
    });

  if (error) {
    console.error("Error listing album photos:", error);
    return { photos: [], hasMore: false };
  }

  const filteredFiles = data.filter(
    (file) => file.name && !file.name.includes(".emptyFolderPlaceholder")
  );
  const hasMore = filteredFiles.length > limit;
  const photos = filteredFiles.slice(0, limit);

  return {
    photos: photos.map((file) => ({
      path: `${folderPath}/${file.name}`,
      publicUrl: getPublicUrl(`${folderPath}/${file.name}`),
      name: file.name || "Unknown",
      sizeBytes: file.metadata?.size || 0,
      createdAt: file.created_at || new Date().toISOString(),
    })),
    hasMore,
  };
}

// Get user storage usage
export async function getUserStorageUsage(
  userId: string
): Promise<{
  totalSizeBytes: number;
  totalFiles: number;
  formattedSize: string;
}> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, { limit: 1000 });

    if (error) {
      console.error("Error getting storage usage:", error);
      return { totalSizeBytes: 0, totalFiles: 0, formattedSize: "0 B" };
    }

    // This is a simplified calculation - in a real app you'd want to traverse
    // all folders and sum up file sizes properly
    let totalSize = 0;
    let fileCount = 0;

    const calculateFolderSize = async (path: string): Promise<void> => {
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path, { limit: 1000 });

      if (files) {
        for (const file of files) {
          if (file.name && !file.name.includes(".emptyFolderPlaceholder")) {
            totalSize += file.metadata?.size || 0;
            fileCount += 1;
          }
        }
      }
    };

    // Calculate size for albums folder
    await calculateFolderSize(`${userId}/albums`);

    // Format size for display
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return {
      totalSizeBytes: totalSize,
      totalFiles: fileCount,
      formattedSize: formatFileSize(totalSize),
    };
  } catch (error) {
    console.error("Error calculating storage usage:", error);
    return { totalSizeBytes: 0, totalFiles: 0, formattedSize: "0 B" };
  }
}
