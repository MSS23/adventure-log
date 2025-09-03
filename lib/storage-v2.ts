/**
 * Advanced Photo Upload System for Adventure Log
 *
 * Production-ready Supabase Storage integration with:
 * - User-scoped folder structure (/<uid>/albums/<albumId>/...)
 * - Public bucket with RLS for write operations
 * - Multi-file upload with concurrency control
 * - Client-side image optimization
 * - Progress tracking and error handling
 * - Type safety throughout
 */

import { supabase } from "./supabase";
import { nanoid } from "nanoid";
import { clientEnv } from "@/src/env";

// Core Types
export interface UploadedPhoto {
  path: string;
  publicUrl: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  originalName: string;
  optimized: boolean;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status:
    | "pending"
    | "uploading"
    | "optimizing"
    | "completed"
    | "error"
    | "cancelled";
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface BatchUploadResult {
  successful: UploadedPhoto[];
  failed: Array<{
    file: File;
    error: string;
    fileId: string;
  }>;
  totalTimeMs: number;
  totalSizeBytes: number;
}

export interface UploadOptions {
  albumId: string;
  userId: string;
  onProgress?: (fileId: string, progress: number) => void;
  onStatusChange?: (
    fileId: string,
    status: UploadProgress["status"],
    error?: string
  ) => void;
  onBatchProgress?: (
    completed: number,
    total: number,
    overallProgress: number
  ) => void;
  signal?: AbortSignal;
  optimizeImages?: boolean;
  maxDimension?: number;
  quality?: number;
}

export interface PhotoListItem {
  name: string;
  path: string;
  publicUrl: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
}

// Constants
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_FILES_PER_BATCH = 100;
export const MAX_CONCURRENT_UPLOADS = 4;
export const BUCKET_NAME =
  clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET || "adventure-photos";

// Validation
export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  if (!ALLOWED_TYPES.includes(file.type.toLowerCase() as any)) {
    return {
      isValid: false,
      error: `File type "${file.type}" not supported. Allowed: ${ALLOWED_TYPES.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size (${sizeMB}MB) exceeds maximum (${maxMB}MB)`,
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: "File is empty" };
  }

  // Check for potentially malicious filenames
  if (/[<>:"|?*\\]/.test(file.name)) {
    return { isValid: false, error: "Filename contains invalid characters" };
  }

  return { isValid: true };
}

export function validateFileBatch(files: File[]): {
  isValid: boolean;
  errors: string[];
} {
  if (!files || files.length === 0) {
    return { isValid: false, errors: ["No files provided"] };
  }

  if (files.length > MAX_FILES_PER_BATCH) {
    return {
      isValid: false,
      errors: [
        `Too many files (${files.length}). Maximum: ${MAX_FILES_PER_BATCH}`,
      ],
    };
  }

  const errors: string[] = [];
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const maxBatchSize = MAX_FILE_SIZE * files.length * 0.8; // 80% of theoretical max

  if (totalSize > maxBatchSize) {
    const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
    const maxMB = (maxBatchSize / (1024 * 1024)).toFixed(1);
    errors.push(
      `Total batch size (${totalMB}MB) too large. Maximum: ${maxMB}MB`
    );
  }

  // Check for duplicate filenames
  const names = new Set<string>();
  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      errors.push(`File ${index + 1} "${file.name}": ${validation.error}`);
    }

    if (names.has(file.name)) {
      errors.push(`Duplicate filename: "${file.name}"`);
    }
    names.add(file.name);
  });

  return { isValid: errors.length === 0, errors };
}

// Path Generation
export function generatePhotoPath(
  userId: string,
  albumId: string,
  fileName: string
): string {
  // Validate inputs
  if (!userId || !albumId || !fileName) {
    throw new Error("Invalid parameters for path generation");
  }

  // Sanitize inputs
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, "");
  const sanitizedAlbumId = albumId.replace(/[^a-zA-Z0-9-_]/g, "");

  if (sanitizedUserId !== userId || sanitizedAlbumId !== albumId) {
    throw new Error("Invalid characters in userId or albumId");
  }

  const timestamp = Date.now();
  const id = nanoid(10);
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";

  // Ensure extension is safe
  const safeExtension = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(
    extension
  )
    ? extension
    : "jpg";

  return `${userId}/albums/${albumId}/${timestamp}-${id}.${safeExtension}`;
}

// Public URL Generation with cache busting
export function getPublicUrl(path: string, updatedAt?: string | Date): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  if (updatedAt) {
    const timestamp =
      updatedAt instanceof Date
        ? updatedAt.getTime()
        : new Date(updatedAt).getTime();

    const url = new URL(data.publicUrl);
    url.searchParams.set("v", timestamp.toString());
    return url.toString();
  }

  return data.publicUrl;
}

// Image Optimization
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(url);

    img.onload = () => {
      cleanup();
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      cleanup();
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export async function optimizeImage(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    targetFormat?: "webp" | "jpeg";
    skipOptimization?: boolean;
  } = {}
): Promise<{ file: File; optimized: boolean; originalSize: number }> {
  const {
    maxDimension = 3000,
    quality = 0.85,
    targetFormat = "webp",
    skipOptimization = false,
  } = options;

  const originalSize = file.size;

  // Skip optimization for small WebP files or if explicitly disabled
  if (
    skipOptimization ||
    (file.type === "image/webp" && file.size < 1024 * 1024)
  ) {
    return { file, optimized: false, originalSize };
  }

  try {
    const dimensions = await getImageDimensions(file);

    // Skip if already small enough and in target format
    if (
      Math.max(dimensions.width, dimensions.height) <= maxDimension &&
      file.type === `image/${targetFormat}`
    ) {
      return { file, optimized: false, originalSize };
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return { file, optimized: false, originalSize };
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    return new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = dimensions;

        // Calculate new dimensions
        if (Math.max(width, height) > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // High-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < originalSize * 0.95) {
              // Only use optimized version if it's meaningfully smaller
              const extension = targetFormat === "webp" ? ".webp" : ".jpg";
              const optimizedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, extension),
                {
                  type: `image/${targetFormat}`,
                  lastModified: Date.now(),
                }
              );
              resolve({ file: optimizedFile, optimized: true, originalSize });
            } else {
              resolve({ file, optimized: false, originalSize });
            }
          },
          `image/${targetFormat}`,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ file, optimized: false, originalSize });
      };

      img.src = url;
    });
  } catch (error) {
    console.warn("Image optimization failed:", error);
    return { file, optimized: false, originalSize };
  }
}

// Core Upload Functions
async function uploadSinglePhoto(
  file: File,
  path: string,
  options: UploadOptions,
  fileId: string
): Promise<UploadedPhoto> {
  const { onProgress, onStatusChange, signal, optimizeImages = true } = options;

  if (signal?.aborted) {
    throw new Error("Upload cancelled");
  }

  try {
    onStatusChange?.(fileId, "optimizing");

    // Optimize if requested
    let processedFile = file;
    let optimized = false;

    if (optimizeImages) {
      const result = await optimizeImage(file, {
        maxDimension: options.maxDimension,
        quality: options.quality,
      });
      processedFile = result.file;
      optimized = result.optimized;
    }

    if (signal?.aborted) {
      throw new Error("Upload cancelled during optimization");
    }

    onStatusChange?.(fileId, "uploading");

    // Get dimensions for metadata
    let dimensions: { width: number; height: number } | undefined;
    try {
      dimensions = await getImageDimensions(processedFile);
    } catch (error) {
      console.warn("Failed to get image dimensions:", error);
    }

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, processedFile, {
        cacheControl: "31536000", // 1 year cache
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (signal?.aborted) {
      // Clean up uploaded file if cancelled
      await supabase.storage.from(BUCKET_NAME).remove([path]);
      throw new Error("Upload cancelled");
    }

    onProgress?.(fileId, 100);
    onStatusChange?.(fileId, "completed");

    const publicUrl = getPublicUrl(path);

    return {
      path,
      publicUrl,
      width: dimensions?.width,
      height: dimensions?.height,
      sizeBytes: processedFile.size,
      mimeType: processedFile.type,
      createdAt: new Date().toISOString(),
      originalName: file.name,
      optimized,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    onStatusChange?.(fileId, "error", errorMessage);
    throw error;
  }
}

// Main Upload Function
export async function uploadPhotos(
  files: File[],
  options: UploadOptions
): Promise<BatchUploadResult> {
  const startTime = Date.now();
  const { albumId, userId, onBatchProgress } = options;

  // Validate authentication
  if (!userId) {
    throw new Error("User must be authenticated");
  }

  // Validate files
  const validation = validateFileBatch(files);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  const successful: UploadedPhoto[] = [];
  const failed: Array<{ file: File; error: string; fileId: string }> = [];
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  // Create file IDs
  const fileIds = files.map(() => nanoid());

  // Concurrency control with Promise pool
  const executeInPool = async <T>(
    items: T[],
    poolSize: number,
    executor: (item: T, index: number) => Promise<void>
  ): Promise<void> => {
    const pool: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const promise = executor(items[i], i).finally(() => {
        const index = pool.indexOf(promise);
        if (index > -1) pool.splice(index, 1);
      });

      pool.push(promise);

      if (pool.length >= poolSize) {
        await Promise.race(pool);
      }
    }

    await Promise.all(pool);
  };

  let completed = 0;

  await executeInPool(files, MAX_CONCURRENT_UPLOADS, async (file, index) => {
    const fileId = fileIds[index];

    try {
      const path = generatePhotoPath(userId, albumId, file.name);
      const result = await uploadSinglePhoto(file, path, options, fileId);
      successful.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      failed.push({ file, error: errorMessage, fileId });
    } finally {
      completed++;
      const overallProgress = (completed / files.length) * 100;
      onBatchProgress?.(completed, files.length, overallProgress);
    }
  });

  return {
    successful,
    failed,
    totalTimeMs: Date.now() - startTime,
    totalSizeBytes: totalSize,
  };
}

// Photo Management Functions
export async function listAlbumPhotos(
  userId: string,
  albumId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: "created_at" | "name" | "updated_at";
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<{
  photos: PhotoListItem[];
  hasMore: boolean;
  totalCount?: number;
}> {
  const {
    limit = 50,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "desc",
  } = options;
  const folderPath = `${userId}/albums/${albumId}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: limit + 1, // Get one extra to check for more
      offset,
      sortBy: { column: sortBy, order: sortOrder },
    });

  if (error) {
    throw new Error(`Failed to list photos: ${error.message}`);
  }

  const hasMore = data.length > limit;
  const photos = (hasMore ? data.slice(0, -1) : data)
    .filter((file) => file.name && !file.name.endsWith("/")) // Filter out folders
    .map((file) => ({
      name: file.name,
      path: `${folderPath}/${file.name}`,
      publicUrl: getPublicUrl(`${folderPath}/${file.name}`, file.updated_at),
      metadata: file.metadata,
      createdAt: file.created_at || "",
      updatedAt: file.updated_at || "",
      sizeBytes: file.metadata?.size || 0,
    }));

  return { photos, hasMore };
}

export async function deletePhoto(userId: string, path: string): Promise<void> {
  // Security: Validate path belongs to user
  if (!path.startsWith(`${userId}/`)) {
    throw new Error("Unauthorized: Cannot delete files outside your folder");
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Failed to delete photo: ${error.message}`);
  }
}

export async function movePhoto(
  userId: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  // Security: Validate both paths belong to user
  if (!fromPath.startsWith(`${userId}/`) || !toPath.startsWith(`${userId}/`)) {
    throw new Error("Unauthorized: Cannot move files outside your folder");
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .move(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to move photo: ${error.message}`);
  }
}

// Storage Analytics
export async function getUserStorageUsage(userId: string): Promise<{
  totalSizeBytes: number;
  totalFiles: number;
  formattedSize: string;
  albumBreakdown: Array<{
    albumId: string;
    fileCount: number;
    totalSize: number;
  }>;
}> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${userId}/albums`, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    throw new Error(`Failed to get storage usage: ${error.message}`);
  }

  let totalSizeBytes = 0;
  let totalFiles = 0;
  const albumBreakdown: Array<{
    albumId: string;
    fileCount: number;
    totalSize: number;
  }> = [];

  // Process each album folder
  for (const folder of data.filter(
    (item) => item.name && item.name.endsWith("/")
  )) {
    const albumId = folder.name.replace("/", "");

    const { data: albumFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`${userId}/albums/${albumId}`, {
        limit: 1000,
      });

    if (albumFiles) {
      const albumSize = albumFiles.reduce(
        (acc, file) => acc + (file.metadata?.size || 0),
        0
      );
      const fileCount = albumFiles.filter(
        (file) => !file.name.endsWith("/")
      ).length;

      albumBreakdown.push({
        albumId,
        fileCount,
        totalSize: albumSize,
      });

      totalSizeBytes += albumSize;
      totalFiles += fileCount;
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    totalSizeBytes,
    totalFiles,
    formattedSize: formatBytes(totalSizeBytes),
    albumBreakdown,
  };
}

// Utility Functions
export function createFilePreview(file: File): {
  url: string;
  cleanup: () => void;
} {
  const url = URL.createObjectURL(file);
  return {
    url,
    cleanup: () => URL.revokeObjectURL(url),
  };
}

export function estimateUploadTime(fileSizeBytes: number): number {
  // Rough estimate based on average upload speed (2 Mbps)
  const bytesPerSecond = (2 * 1024 * 1024) / 8; // 2 Mbps in bytes/sec
  return Math.ceil(fileSizeBytes / bytesPerSecond) * 1000; // ms
}

export function shouldOptimizeFile(file: File): boolean {
  // Optimize if it's not WebP or if it's larger than 2MB
  return file.type !== "image/webp" || file.size > 2 * 1024 * 1024;
}
