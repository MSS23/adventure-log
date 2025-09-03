import { supabaseAdmin } from "./supabase";
import { clientEnv } from "@/src/env";
import { logger } from "./logger";

export interface PhotoVariant {
  size: string;
  path: string;
  signedUrl?: string;
}

export interface PhotoUrls {
  thumbnail: string;
  medium: string;
  large: string;
  original: string;
}

/**
 * Generate signed URLs for photo variants
 * These URLs expire after the specified time (default 4 hours)
 */
export async function generateSignedPhotoUrls(
  photoMetadata: string | null,
  expiresInSeconds: number = 4 * 60 * 60 // 4 hours default
): Promise<PhotoUrls | null> {
  try {
    if (!photoMetadata) {
      return null;
    }

    const metadata = JSON.parse(photoMetadata);
    const sizes = metadata.sizes;

    if (!sizes || typeof sizes !== "object") {
      logger.warn("Invalid photo metadata - no sizes found");
      return null;
    }

    const signedUrls: Record<string, string> = {};

    // Generate signed URLs for each size
    for (const [sizeName, path] of Object.entries(sizes)) {
      if (typeof path === "string") {
        const { data: signedData, error } = await supabaseAdmin.storage
          .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
          .createSignedUrl(path, expiresInSeconds);

        if (error) {
          logger.error(`Failed to create signed URL for ${sizeName}:`, error);
          continue;
        }

        if (signedData?.signedUrl) {
          signedUrls[sizeName] = signedData.signedUrl;
        }
      }
    }

    // Ensure we have all required sizes
    const photoUrls: PhotoUrls = {
      thumbnail:
        signedUrls.thumbnail || signedUrls.medium || signedUrls.large || "",
      medium:
        signedUrls.medium || signedUrls.large || signedUrls.original || "",
      large: signedUrls.large || signedUrls.original || signedUrls.medium || "",
      original: signedUrls.original || signedUrls.large || "",
    };

    return photoUrls;
  } catch (error) {
    logger.error("Failed to generate signed photo URLs:", error);
    return null;
  }
}

/**
 * Generate a single signed URL for a specific photo path
 */
export async function generateSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 4 * 60 * 60
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      logger.error("Failed to create signed URL:", error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    logger.error("Failed to generate signed URL:", error);
    return null;
  }
}

/**
 * Delete photo files from storage
 */
export async function deletePhotoFiles(
  photoMetadata: string | null
): Promise<boolean> {
  try {
    if (!photoMetadata) {
      return true; // Nothing to delete
    }

    const metadata = JSON.parse(photoMetadata);
    const sizes = metadata.sizes;

    if (!sizes || typeof sizes !== "object") {
      logger.warn("Invalid photo metadata - no sizes found for deletion");
      return true; // Consider successful since nothing to delete
    }

    const deletionPromises = Object.values(sizes).map(async (path) => {
      if (typeof path === "string") {
        const { error } = await supabaseAdmin.storage
          .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
          .remove([path]);

        if (error) {
          logger.error(`Failed to delete photo file ${path}:`, error);
          return false;
        }
        return true;
      }
      return true;
    });

    const results = await Promise.all(deletionPromises);
    const allSuccessful = results.every((result) => result === true);

    if (allSuccessful) {
      logger.info("Successfully deleted all photo files");
    } else {
      logger.warn("Some photo files could not be deleted");
    }

    return allSuccessful;
  } catch (error) {
    logger.error("Failed to delete photo files:", error);
    return false;
  }
}

/**
 * Get storage statistics for monitoring
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  formattedSize: string;
} | null> {
  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
      .list("photos", {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      logger.error("Failed to get storage stats:", error);
      return null;
    }

    const totalFiles = files?.length || 0;
    const totalSize =
      files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;

    // Format size in human-readable format
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return {
      totalFiles,
      totalSize,
      formattedSize: formatBytes(totalSize),
    };
  } catch (error) {
    logger.error("Failed to get storage statistics:", error);
    return null;
  }
}

/**
 * Clean up expired signed URL cache (if implementing caching)
 * This is a placeholder for future signed URL caching implementation
 */
export async function cleanupSignedUrlCache(): Promise<void> {
  // TODO: Implement signed URL caching with Redis or similar
  // This would cache signed URLs for a shorter period (e.g., 30 minutes)
  // to avoid regenerating them on every request
  logger.debug("Signed URL cache cleanup (not yet implemented)");
}

/**
 * Generate a unique photo ID for storage path
 */
export function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Parse storage path to extract components
 */
export function parseStoragePath(path: string): {
  userId?: string;
  albumId?: string;
  photoId?: string;
  size?: string;
} | null {
  try {
    // Expected format: photos/{userId}/{albumId}/{photoId}/{size}.webp
    const parts = path.split("/");

    if (parts.length !== 5 || parts[0] !== "photos") {
      return null;
    }

    const [, userId, albumId, photoId, sizeWithExt] = parts;
    const size = sizeWithExt.replace(".webp", "");

    return {
      userId,
      albumId,
      photoId,
      size,
    };
  } catch (error) {
    logger.error("Failed to parse storage path:", error);
    return null;
  }
}

/**
 * Build storage path for a photo variant
 */
export function buildStoragePath(
  userId: string,
  albumId: string,
  photoId: string,
  size: string
): string {
  return `photos/${userId}/${albumId}/${photoId}/${size}.webp`;
}
