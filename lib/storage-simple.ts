/**
<<<<<<< HEAD
 * Simplified Photo Upload System for Adventure Log
 * Based on proven SupabaseImageGallery pattern with 2024 best practices
 */

import { supabase } from "./supabase";
import { nanoid } from "nanoid";
import { clientEnv } from "@/src/env";

// Core Types
=======
 * Photo Upload System for Adventure Log - Client-Side Utilities
 *
 * This library provides client-side utilities for the signed upload system.
 * The actual uploads now use signed URLs from the server for better security.
 *
 * @deprecated Many functions in this file are deprecated in favor of server-side APIs.
 * New implementations should use:
 * - POST /api/storage/signed-upload for uploads
 * - GET /api/albums/{albumId}/photos for listing
 * - DELETE /api/storage/file for deletion
 */

import { clientEnv } from "./env";
import type {
  UploadProgress,
  PhotoUploadData,
  StorageFile,
  FileValidationResult,
  FileValidationOptions,
} from "@/types/storage";

// Core Types (kept for backward compatibility)
>>>>>>> oauth-upload-fixes
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

<<<<<<< HEAD
// Path generation following user-scoped pattern
=======
/**
 * Generate secure photo path for album photos
 * New format: albums/{albumId}/{userId}/{timestamp}-{safeName}.{ext}
 * @deprecated Use server-side generateSecurePhotoPath in supabaseAdmin.ts instead
 */
>>>>>>> oauth-upload-fixes
export function generatePhotoPath(
  userId: string,
  albumId: string,
  fileName: string
): string {
<<<<<<< HEAD
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
=======
  console.warn(
    "generatePhotoPath is deprecated. Use server-side signed upload APIs instead."
  );

  const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const safeName = fileName
    .substring(0, fileName.lastIndexOf("."))
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  // New path format: albums/{albumId}/{userId}/{timestamp}-{safeName}.{ext}
  return `albums/${albumId}/${userId}/${timestamp}-${safeName}.${fileExt}`;
}

/**
 * Get public URL for uploaded file
 * @deprecated Photos should now use URLs returned by server APIs
 */
export function getPublicUrl(path: string): string {
  console.warn(
    "getPublicUrl is deprecated. Use URLs returned by server APIs instead."
  );

  // Construct URL manually since we don't import Supabase client anymore
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
}

/**
 * @deprecated Use signed upload system instead
 * Use POST /api/storage/signed-upload to get signed URL, then upload directly to Supabase
 */
export async function uploadPhoto(
  _file: File,
  _userId: string,
  _albumId: string,
  _onProgress?: (progress: UploadProgress) => void
): Promise<UploadedPhoto> {
  throw new Error(
    "uploadPhoto is deprecated. Use the signed upload system: " +
      "1. POST to /api/storage/signed-upload to get signed URL, " +
      "2. Upload directly to Supabase using the signed URL"
  );
}

/**
 * @deprecated Use signed upload system instead
 * Use POST /api/storage/signed-upload for each file, then upload directly to Supabase
 */
export async function uploadMultiplePhotos(
  _files: File[],
  _userId: string,
  _albumId: string,
  _onProgress?: (progress: UploadProgress) => void
): Promise<UploadedPhoto[]> {
  throw new Error(
    "uploadMultiplePhotos is deprecated. Use the signed upload system: " +
      "1. POST to /api/storage/signed-upload for each file, " +
      "2. Upload each file directly to Supabase using signed URLs"
  );
}

/**
 * @deprecated Use server-side API instead
 * Use GET /api/albums/{albumId}/photos to list photos
 */
export async function getAlbumPhotos(
  _userId: string,
  _albumId: string
): Promise<string[]> {
  throw new Error(
    "getAlbumPhotos is deprecated. Use GET /api/albums/{albumId}/photos instead"
  );
}

/**
 * @deprecated Use server-side API instead
 * Use DELETE /api/storage/file to delete photos securely
 */
export async function deletePhoto(
  _userId: string,
  _path: string
): Promise<void> {
  throw new Error(
    "deletePhoto is deprecated. Use DELETE /api/storage/file instead"
  );
}

/**
 * @deprecated Use server-side API instead
 * Use GET /api/albums/{albumId}/photos for each album instead
 */
export async function getUserPhotos(_userId: string): Promise<string[]> {
  throw new Error(
    "getUserPhotos is deprecated. Use GET /api/albums/{albumId}/photos for each album instead"
  );
}

/**
 * @deprecated Use server-side API instead
 * Use GET /api/albums/{albumId}/photos instead
 */
export async function listAlbumPhotos(
  _userId: string,
  _albumId: string,
  _options: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<{ photos: PhotoListItem[]; hasMore: boolean }> {
  throw new Error(
    "listAlbumPhotos is deprecated. Use GET /api/albums/{albumId}/photos instead"
  );
}

/**
 * @deprecated Use server-side API instead
 * Storage usage is now included in the GET /api/albums/{albumId}/photos response
 */
export async function getUserStorageUsage(_userId: string): Promise<{
  totalSizeBytes: number;
  totalFiles: number;
  formattedSize: string;
}> {
  throw new Error(
    "getUserStorageUsage is deprecated. Storage usage is included in album photos API responses"
  );
}

// ================================
// NEW UTILITY FUNCTIONS FOR SIGNED UPLOAD SYSTEM
// ================================

/**
 * Upload a single file using the signed URL system
 * This is the new recommended approach for file uploads
 */
export async function uploadPhotoWithSignedUrl(
  file: File,
  albumId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedPhoto> {
  const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Step 1: Get signed upload URL from server
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 10,
      status: "uploading",
    });

    const signedUrlResponse = await fetch("/api/storage/signed-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        albumId,
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!signedUrlResponse.ok) {
      const errorData = await signedUrlResponse
        .json()
        .catch(() => ({ error: "Failed to get upload URL" }));
      throw new Error(errorData.error || "Failed to get upload URL");
    }

    const signedData = await signedUrlResponse.json();

    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 30,
      status: "uploading",
    });

    // Step 2: Upload directly to Supabase using signed URL
    const uploadResponse = await fetch(signedData.upload.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse
        .text()
        .catch(() => "Upload failed");
      throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
    }

>>>>>>> oauth-upload-fixes
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 100,
      status: "completed",
    });

<<<<<<< HEAD
    // Return uploaded photo info
    const uploadedPhoto: UploadedPhoto = {
      id: fileId,
      path: data.path,
      publicUrl: getPublicUrl(data.path),
=======
    // Step 3: Return upload result
    const uploadedPhoto: UploadedPhoto = {
      id: fileId,
      path: signedData.upload.path,
      publicUrl: getPublicUrl(signedData.upload.path),
>>>>>>> oauth-upload-fixes
      fileName: file.name,
      fileSize: file.size,
      sizeBytes: file.size,
      mimeType: file.type,
<<<<<<< HEAD
      userId,
      albumId,
      createdAt: new Date().toISOString(),
=======
      albumId,
      createdAt: new Date().toISOString(),
      originalName: file.name,
>>>>>>> oauth-upload-fixes
    };

    return uploadedPhoto;
  } catch (error) {
<<<<<<< HEAD
    // Notify upload error
=======
>>>>>>> oauth-upload-fixes
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

<<<<<<< HEAD
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
=======
/**
 * Delete a photo using the server-side API
 */
export async function deletePhotoSecurely(
  albumId: string,
  photoPath: string
): Promise<void> {
  const response = await fetch("/api/storage/file", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: photoPath,
      albumId: albumId,
    }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Failed to delete photo" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
}

/**
 * List album photos using the server-side API
 */
export async function listAlbumPhotosSecurely(
>>>>>>> oauth-upload-fixes
  albumId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
<<<<<<< HEAD
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
=======
    includeUsage?: boolean;
  } = {}
): Promise<{
  photos: PhotoListItem[];
  pagination: { hasMore: boolean; nextOffset: number | null };
  usage?: { totalSizeBytes: number; totalFiles: number; formattedSize: string };
}> {
  const {
    limit = 50,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "desc",
    includeUsage = false,
  } = options;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sortBy,
    sortOrder,
    includeUsage: includeUsage.toString(),
  });

  const response = await fetch(`/api/albums/${albumId}/photos?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Failed to load photos" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const result = await response.json();

  return {
    photos: result.photos,
    pagination: {
      hasMore: result.pagination.hasMore,
      nextOffset: result.pagination.nextOffset,
    },
    ...(result.usage && { usage: result.usage }),
  };
}
>>>>>>> oauth-upload-fixes
