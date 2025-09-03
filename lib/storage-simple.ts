/**
 * Simplified Photo Upload System for Adventure Log
 * Based on proven SupabaseImageGallery pattern with 2024 best practices
 */

import { supabase } from "./supabase";
import { nanoid } from "nanoid";
import { clientEnv } from "@/src/env";

// Core Types
export interface UploadedPhoto {
  id: string;
  path: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  albumId?: string;
  createdAt: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

// Constants
export const BUCKET_NAME = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET || "adventure-photos";
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

// Validation
export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File too large. Max size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: "Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed" 
    };
  }

  return { isValid: true };
}

// Path generation following user-scoped pattern
export function generatePhotoPath(userId: string, albumId: string, fileName: string): string {
  const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const uniqueId = nanoid();
  const timestamp = Date.now();
  return `${userId}/albums/${albumId}/${timestamp}-${uniqueId}.${fileExt}`;
}

// Get public URL for uploaded file
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
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
    status: "uploading"
  });

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Notify upload completed
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 100,
      status: "completed"
    });

    // Return uploaded photo info
    const uploadedPhoto: UploadedPhoto = {
      id: fileId,
      path: data.path,
      publicUrl: getPublicUrl(data.path),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      userId,
      albumId,
      createdAt: new Date().toISOString()
    };

    return uploadedPhoto;

  } catch (error) {
    // Notify upload error
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Upload failed"
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
export async function getAlbumPhotos(userId: string, albumId: string): Promise<string[]> {
  const folderPath = `${userId}/albums/${albumId}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  return data
    .filter(file => file.name && !file.name.includes('.emptyFolderPlaceholder'))
    .map(file => getPublicUrl(`${folderPath}/${file.name}`));
}

// Delete photo
export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

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
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    console.error('Error fetching user photos:', error);
    return [];
  }

  const allPhotos: string[] = [];

  // Get photos from all albums
  for (const item of data) {
    if (item.name === 'albums') {
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