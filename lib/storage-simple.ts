/**
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

// Core Types (kept for backward compatibility)
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

/**
 * Generate secure photo path for album photos
 * New format: albums/{albumId}/{userId}/{timestamp}-{safeName}.{ext}
 * @deprecated Use server-side generateSecurePhotoPath in supabaseAdmin.ts instead
 */
export function generatePhotoPath(
  userId: string,
  albumId: string,
  fileName: string
): string {
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

    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 100,
      status: "completed",
    });

    // Step 3: Return upload result
    const uploadedPhoto: UploadedPhoto = {
      id: fileId,
      path: signedData.upload.path,
      publicUrl: getPublicUrl(signedData.upload.path),
      fileName: file.name,
      fileSize: file.size,
      sizeBytes: file.size,
      mimeType: file.type,
      albumId,
      createdAt: new Date().toISOString(),
      originalName: file.name,
    };

    return uploadedPhoto;
  } catch (error) {
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
  albumId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
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
