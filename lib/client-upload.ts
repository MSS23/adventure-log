"use client";

import { nanoid } from "nanoid";
import { logger } from "./logger";
import { createAuthenticatedStorageClient } from "./supabase";
import { clientEnv } from "./env";

// Types
export interface ClientUploadedPhoto {
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

export interface ClientUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface ClientPhotoUploadResult {
  success: boolean;
  uploadedPhotos: ClientUploadedPhoto[];
  errors: string[];
  message: string;
  meta?: {
    requestId?: string;
    totalFiles?: number;
    successfulUploads?: number;
    failedUploads?: number;
    processingTime?: number;
    method: "client-side";
  };
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
export function validateClientFile(file: File): {
  isValid: boolean;
  error?: string;
} {
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
export function generateClientPhotoPath(
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
export function getClientPublicUrl(path: string): string {
  // Create a temporary client just to get the public URL
  const tempClient = createAuthenticatedStorageClient("temp");
  const { data } = tempClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

// Client-side authenticated upload
export async function uploadPhotoClientSide(
  file: File,
  userId: string,
  albumId: string,
  accessToken: string,
  onProgress?: (progress: ClientUploadProgress) => void
): Promise<ClientUploadedPhoto> {
  // Validate file
  const validation = validateClientFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const fileId = nanoid();
  const path = generateClientPhotoPath(userId, albumId, file.name);

  // Notify upload started
  onProgress?.({
    fileId,
    fileName: file.name,
    progress: 0,
    status: "uploading",
  });

  try {
    // Create authenticated storage client
    const authenticatedClient = createAuthenticatedStorageClient(accessToken);

    // Upload to Supabase Storage with user authentication
    const { data, error } = await authenticatedClient.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: "31536000", // 1 year
        contentType: file.type,
        upsert: false, // Prevent overwrites
      });

    if (error) {
      logger.error("Client-side upload error:", { error: error });
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
    const uploadedPhoto: ClientUploadedPhoto = {
      id: fileId,
      path: data.path,
      publicUrl: getClientPublicUrl(data.path),
      fileName: file.name,
      fileSize: file.size,
      sizeBytes: file.size,
      mimeType: file.type,
      userId,
      albumId,
      createdAt: new Date().toISOString(),
    };

    logger.info("Client-side upload successful:", {
      path: data.path,
      size: file.size,
      type: file.type,
    });

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

    logger.error("Client-side upload failed:", { error: error });
    throw error;
  }
}

// Client-side multiple file upload
export async function uploadMultiplePhotosClientSide(
  files: File[],
  userId: string,
  albumId: string,
  accessToken: string,
  onProgress?: (progress: ClientUploadProgress) => void
): Promise<ClientUploadedPhoto[]> {
  const results: ClientUploadedPhoto[] = [];

  for (const file of files) {
    try {
      const result = await uploadPhotoClientSide(
        file,
        userId,
        albumId,
        accessToken,
        onProgress
      );
      results.push(result);
    } catch (error) {
      logger.error(`Failed to upload ${file.name}:`, { error: error });
      // Continue with other files
      onProgress?.({
        fileId: nanoid(),
        fileName: file.name,
        progress: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  return results;
}

// Main client-side upload function with comprehensive error handling
export async function uploadPhotosToAlbumClientSide(
  albumId: string,
  files: File[],
  userId: string,
  accessToken: string,
  options: {
    onProgress?: (progress: ClientUploadProgress) => void;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<ClientPhotoUploadResult> {
  const { onProgress } = options;
  const startTime = Date.now();
  const requestId = `client-upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.info(
    `[${requestId}] Starting client-side upload of ${files.length} files to album ${albumId}`
  );

  // Validation
  if (!albumId || albumId.trim() === "") {
    throw new Error("Album ID is required");
  }

  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  if (!accessToken || accessToken.trim() === "") {
    throw new Error("Access token is required");
  }

  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  // Validate all files
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const validation = validateClientFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${validation.error}`);
    }
  });

  if (validFiles.length === 0) {
    return {
      success: false,
      uploadedPhotos: [],
      errors: ["No valid files to upload", ...errors],
      message: "All files failed validation",
      meta: {
        requestId,
        totalFiles: files.length,
        successfulUploads: 0,
        failedUploads: files.length,
        processingTime: Date.now() - startTime,
        method: "client-side",
      },
    };
  }

  // Upload files
  const successful: ClientUploadedPhoto[] = [];
  const failed: string[] = [...errors];

  try {
    const uploadedPhotos = await uploadMultiplePhotosClientSide(
      validFiles,
      userId,
      albumId,
      accessToken,
      onProgress
    );

    successful.push(...uploadedPhotos);

    logger.info(`[${requestId}] Client-side upload completed`, {
      successful: successful.length,
      failed: failed.length,
      totalTime: Date.now() - startTime,
    });

    return {
      success: successful.length > 0,
      uploadedPhotos: successful,
      errors: failed,
      message: `${successful.length} photo${successful.length === 1 ? "" : "s"} uploaded successfully${
        failed.length > 0 ? ` (${failed.length} failed)` : ""
      }`,
      meta: {
        requestId,
        totalFiles: files.length,
        successfulUploads: successful.length,
        failedUploads: failed.length,
        processingTime: Date.now() - startTime,
        method: "client-side",
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown upload error";
    logger.error(`[${requestId}] Client-side upload failed:`, { error: error });

    return {
      success: false,
      uploadedPhotos: successful,
      errors: [errorMessage, ...failed],
      message: `Upload failed: ${errorMessage}`,
      meta: {
        requestId,
        totalFiles: files.length,
        successfulUploads: successful.length,
        failedUploads: files.length - successful.length,
        processingTime: Date.now() - startTime,
        method: "client-side",
      },
    };
  }
}

// Helper to get Supabase access token from session
export function getSupabaseAccessToken(): string | null {
  try {
    // Check if we're in browser environment
    if (typeof window === "undefined") {
      return null;
    }

    // Try to get the session from localStorage (where Supabase stores it)
    const session = localStorage.getItem("supabase.auth.token");
    if (session) {
      const parsed = JSON.parse(session);
      return parsed?.access_token || null;
    }

    return null;
  } catch (error) {
    logger.error("Failed to get Supabase access token:", { error: error });
    return null;
  }
}

// Helper to save uploaded photos to database via API
export async function savePhotosToDatabase(
  albumId: string,
  photos: ClientUploadedPhoto[]
): Promise<{ success: boolean; errors: string[] }> {
  try {
    const response = await fetch(`/api/albums/${albumId}/photos/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        photos: photos.map((photo) => ({
          url: photo.publicUrl,
          metadata: JSON.stringify({
            originalName: photo.originalName || photo.fileName,
            filePath: photo.path,
            fileSize: photo.sizeBytes,
            mimeType: photo.mimeType,
            width: photo.width,
            height: photo.height,
            uploadedAt: photo.createdAt,
            uploadMethod: "client-side",
          }),
        })),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        errors: [
          errorData.error || `Failed to save photos: ${response.statusText}`,
        ],
      };
    }

    return { success: true, errors: [] };
  } catch (error) {
    logger.error("Failed to save photos to database:", { error: error });
    return {
      success: false,
      errors: [
        error instanceof Error ? error.message : "Failed to save photos",
      ],
    };
  }
}
