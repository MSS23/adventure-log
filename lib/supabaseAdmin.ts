/**
 * Supabase Admin Client - Server-Only Operations
 *
 * This file contains the server-side Supabase client with service role permissions.
 * IMPORTANT: This should only be imported in server-side code (API routes, server components).
 * The service role key provides admin access to bypass RLS policies.
 */

import { createClient } from "@supabase/supabase-js";
import { serverEnv, clientEnv } from "@/src/env";

// Ensure this runs only on the server
if (typeof window !== "undefined") {
  throw new Error(
    "supabaseAdmin should only be used in server-side code. Use the regular supabase client for client-side operations."
  );
}

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

/**
 * Admin client with service role permissions
 * - Bypasses Row Level Security (RLS) policies
 * - Can perform any operation on any table
 * - Should only be used for trusted server-side operations
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      "X-Client-Info": "adventure-log-server",
    },
  },
});

/**
 * Storage bucket name from environment
 */
export const STORAGE_BUCKET = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;

/**
 * Generate a secure file path for album photos
 * Format: albums/{albumId}/{userId}/{timestamp}-{safeName}
 */
export function generateSecurePhotoPath(
  albumId: string,
  userId: string,
  fileName: string
): string {
  // Sanitize filename - remove special characters and spaces
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
  const safeName = baseName
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50); // Limit length

  const timestamp = Date.now();
  return `albums/${albumId}/${userId}/${timestamp}-${safeName}.${fileExtension}`;
}

/**
 * Validate that a path belongs to a specific user and album
 */
export function validatePhotoPath(
  path: string,
  albumId: string,
  userId: string
): boolean {
  const expectedPrefix = `albums/${albumId}/${userId}/`;
  return path.startsWith(expectedPrefix);
}

/**
 * Create a signed upload URL for direct client uploads
 * @param path - The storage path where the file will be uploaded
 * @param options - Upload options
 * @returns Promise with signed URL data or error
 */
export async function createSignedUploadUrl(
  path: string,
  _options: {
    expiresIn?: number; // Seconds until expiry (default: 2 hours)
    contentType?: string;
  } = {}
) {
  // Options are not used since createSignedUploadUrl API is simplified

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error("Failed to create signed URL"),
    };
  }
}

/**
 * Get a public URL for a stored file
 */
export function getPublicUrl(path: string): string {
  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Create a signed download URL (for private files)
 */
export async function createSignedDownloadUrl(
  path: string,
  expiresIn: number = 3600 // 1 hour default
) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error("Failed to create signed download URL"),
    };
  }
}

/**
 * List files in a specific album folder
 */
export async function listAlbumFiles(
  albumId: string,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order?: "asc" | "desc" };
  } = {}
) {
  const folderPath = `albums/${albumId}/${userId}`;
  const {
    limit = 1000,
    offset = 0,
    sortBy = { column: "created_at", order: "desc" },
  } = options;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list(folderPath, {
        limit,
        offset,
        sortBy,
      });

    if (error) {
      throw error;
    }

    // Filter out folder placeholders and add full paths
    const files = (data || [])
      .filter(
        (file) => file.name && !file.name.includes(".emptyFolderPlaceholder")
      )
      .map((file) => ({
        ...file,
        fullPath: `${folderPath}/${file.name}`,
        publicUrl: getPublicUrl(`${folderPath}/${file.name}`),
      }));

    return { data: files, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Failed to list files"),
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error("Failed to delete file"),
    };
  }
}

/**
 * Get storage usage for a user
 */
export async function getUserStorageUsage(userId: string) {
  try {
    // Note: This is a simplified implementation. In production, you might want
    // to traverse all user folders or use a more efficient method
    const albumsPath = `albums`;

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list(albumsPath, { limit: 1000 });

    if (error) {
      throw error;
    }

    let totalSize = 0;
    let fileCount = 0;

    // This would need to be improved for production to handle nested folders
    for (const item of data || []) {
      if (item.name) {
        // Check if this album belongs to the user (this is simplified)
        const albumPath = `${albumsPath}/${item.name}/${userId}`;
        const { data: files } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .list(albumPath, { limit: 1000 });

        if (files) {
          for (const file of files) {
            if (file.name && !file.name.includes(".emptyFolderPlaceholder")) {
              totalSize += file.metadata?.size || 0;
              fileCount += 1;
            }
          }
        }
      }
    }

    return {
      data: {
        totalSizeBytes: totalSize,
        totalFiles: fileCount,
        formattedSize: formatFileSize(totalSize),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error("Failed to get storage usage"),
    };
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
