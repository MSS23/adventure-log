import { logger } from "./logger";
<<<<<<< HEAD
=======
import { nanoid } from "nanoid";
import {
  uploadPhotosToAlbumClientSide,
  savePhotosToDatabase,
  getSupabaseAccessToken,
  type ClientUploadProgress,
} from "./client-upload";
>>>>>>> oauth-upload-fixes

interface UploadedPhoto {
  id: string;
  url: string;
  caption?: string;
  metadata?: string;
}

export interface PhotoUploadResult {
  success: boolean;
  uploadedPhotos: UploadedPhoto[];
  errors: string[];
  message: string;
  meta?: {
    requestId?: string;
    totalFiles?: number;
    successfulUploads?: number;
    failedUploads?: number;
    processingTime?: number;
    retries?: number;
<<<<<<< HEAD
=======
    uploadMethod?: string;
>>>>>>> oauth-upload-fixes
  };
}

export interface UploadProgress {
  totalFiles: number;
  uploadedFiles: number;
  currentFile?: string;
  progress: number; // 0-100
<<<<<<< HEAD
  status: 'preparing' | 'uploading' | 'completed' | 'error';
=======
  status: "preparing" | "uploading" | "completed" | "error";
>>>>>>> oauth-upload-fixes
  errors: string[];
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

<<<<<<< HEAD
// Enhanced upload function with retry logic and progress tracking
=======
// Enhanced upload function with client-side first, server-side fallback
>>>>>>> oauth-upload-fixes
export async function uploadPhotosToAlbum(
  albumId: string,
  files: File[],
  options: {
    onProgress?: UploadProgressCallback;
    maxRetries?: number;
    retryDelay?: number;
<<<<<<< HEAD
  } = {}
): Promise<PhotoUploadResult> {
  const { onProgress, maxRetries = 2, retryDelay = 1000 } = options;
  let retries = 0;
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
=======
    forceServerSide?: boolean; // Force server-side upload
  } = {}
): Promise<PhotoUploadResult> {
  const {
    onProgress,
    maxRetries = 2,
    retryDelay = 1000,
    forceServerSide = false,
  } = options;
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
>>>>>>> oauth-upload-fixes

  // Initialize progress
  const updateProgress = (update: Partial<UploadProgress>) => {
    if (onProgress) {
      const progress: UploadProgress = {
        totalFiles: files.length,
        uploadedFiles: 0,
        progress: 0,
<<<<<<< HEAD
        status: 'preparing',
        errors: [],
        ...update
=======
        status: "preparing",
        errors: [],
        ...update,
>>>>>>> oauth-upload-fixes
      };
      onProgress(progress);
    }
  };

<<<<<<< HEAD
  // Enhanced validation and logging
  logger.info(`[${uploadId}] Starting upload of ${files.length} files to album ${albumId}`);
  
  if (!albumId || albumId.trim() === '') {
    logger.error(`[${uploadId}] Invalid album ID: ${albumId}`);
    throw new Error('Album ID is required');
  }

  if (!files || files.length === 0) {
    logger.error(`[${uploadId}] No files provided`);
    throw new Error('No files provided for upload');
=======
  logger.info(
    `[${uploadId}] Starting upload of ${files.length} files to album ${albumId}`
  );

  if (!albumId || albumId.trim() === "") {
    throw new Error("Album ID is required");
  }

  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
>>>>>>> oauth-upload-fixes
  }

  // Validate all files before attempting upload
  const { validFiles, errors } = validateImageFiles(files);
  if (validFiles.length === 0) {
<<<<<<< HEAD
    logger.error(`[${uploadId}] No valid files to upload:`, errors);
    throw new Error(`No valid files to upload: ${errors.join(', ')}`);
  }

  if (errors.length > 0) {
    logger.warn(`[${uploadId}] Some files failed validation:`, errors);
  }

  updateProgress({ status: 'preparing' });

  while (retries <= maxRetries) {
    try {
      logger.info(`[${uploadId}] Upload attempt ${retries + 1}/${maxRetries + 1} for ${validFiles.length} valid files`);
      
      updateProgress({ status: 'uploading', currentFile: validFiles[0]?.name });
=======
    throw new Error(`No valid files to upload: ${errors.join(", ")}`);
  }

  updateProgress({ status: "preparing" });

  // Check authentication state
  const authCheck = await fetch("/api/auth/session");
  if (!authCheck.ok) {
    throw new Error("Authentication required. Please sign in and try again.");
  }

  const session = await authCheck.json();
  if (!session || !session.user) {
    throw new Error("Please sign in to upload photos.");
  }

  const userId = session.user.id;
  logger.info(`[${uploadId}] Authenticated as user: ${session.user.email}`);

  // Try client-side upload first (if not forced to server-side)
  if (!forceServerSide && typeof window !== "undefined") {
    try {
      const accessToken = getSupabaseAccessToken();

      if (accessToken) {
        logger.info(
          `[${uploadId}] Attempting client-side upload with Supabase auth`
        );

        // Map progress callback
        const clientProgressCallback = (progress: ClientUploadProgress) => {
          updateProgress({
            status:
              progress.status === "error"
                ? "error"
                : progress.status === "completed"
                  ? "completed"
                  : "uploading",
            progress: progress.progress,
            currentFile: progress.fileName,
            errors: progress.error ? [progress.error] : [],
          });
        };

        const clientResult = await uploadPhotosToAlbumClientSide(
          albumId,
          validFiles,
          userId,
          accessToken,
          { onProgress: clientProgressCallback, maxRetries }
        );

        if (clientResult.success && clientResult.uploadedPhotos.length > 0) {
          // Save photos to database
          const saveResult = await savePhotosToDatabase(
            albumId,
            clientResult.uploadedPhotos
          );

          if (saveResult.success) {
            logger.info(`[${uploadId}] Client-side upload and save successful`);

            // Convert to expected format
            const result: PhotoUploadResult = {
              success: true,
              uploadedPhotos: clientResult.uploadedPhotos.map((photo) => ({
                id: photo.id || nanoid(),
                url: photo.publicUrl,
                caption: photo.fileName,
                metadata: JSON.stringify({
                  originalName: photo.originalName || photo.fileName,
                  filePath: photo.path,
                  fileSize: photo.sizeBytes,
                  mimeType: photo.mimeType,
                  uploadMethod: "client-side",
                }),
              })),
              errors: [...errors, ...clientResult.errors, ...saveResult.errors],
              message: clientResult.message,
              meta: {
                ...clientResult.meta,
                processingTime: Date.now() - startTime,
                uploadMethod: "client-side",
              },
            };

            updateProgress({
              status: "completed",
              uploadedFiles: clientResult.uploadedPhotos.length,
              progress: 100,
            });

            return result;
          } else {
            logger.warn(
              `[${uploadId}] Client-side upload succeeded but database save failed:`,
              saveResult.errors
            );
          }
        }
      } else {
        logger.warn(
          `[${uploadId}] No Supabase access token found, falling back to server-side`
        );
      }
    } catch (error) {
      logger.warn(
        `[${uploadId}] Client-side upload failed, falling back to server-side:`,
        error
      );
    }
  }

  // Fallback to server-side upload
  logger.info(`[${uploadId}] Using server-side upload method`);
  return await uploadPhotosToAlbumServerSide(albumId, validFiles, {
    onProgress,
    maxRetries,
    retryDelay,
    uploadId,
    startTime,
  });
}

// Server-side upload implementation
async function uploadPhotosToAlbumServerSide(
  albumId: string,
  files: File[],
  options: {
    onProgress?: UploadProgressCallback;
    maxRetries?: number;
    retryDelay?: number;
    uploadId?: string;
    startTime?: number;
  }
): Promise<PhotoUploadResult> {
  const {
    onProgress,
    maxRetries = 2,
    retryDelay = 1000,
    uploadId = `server-${Date.now()}`,
    startTime = Date.now(),
  } = options;
  let retries = 0;

  const updateProgress = (update: Partial<UploadProgress>) => {
    if (onProgress) {
      const progress: UploadProgress = {
        totalFiles: files.length,
        uploadedFiles: 0,
        progress: 0,
        status: "preparing",
        errors: [],
        ...update,
      };
      onProgress(progress);
    }
  };

  while (retries <= maxRetries) {
    try {
      logger.info(
        `[${uploadId}] Server-side upload attempt ${retries + 1}/${maxRetries + 1}`
      );

      updateProgress({ status: "uploading", currentFile: files[0]?.name });
>>>>>>> oauth-upload-fixes

      const formData = new FormData();
      formData.append("albumId", albumId);

<<<<<<< HEAD
      // Log form data for debugging
      logger.info(`[${uploadId}] Preparing FormData with albumId: ${albumId}`);

      validFiles.forEach((file, index) => {
        formData.append("photos", file);
        logger.info(`[${uploadId}] Added file ${index + 1}: ${file.name} (${file.size} bytes, ${file.type})`);
      });

      // Check authentication state
      const authCheck = await fetch('/api/auth/session');
      if (!authCheck.ok) {
        logger.error(`[${uploadId}] Authentication check failed: ${authCheck.status}`);
        throw new Error('Authentication required. Please sign in and try again.');
      }

      const session = await authCheck.json();
      if (!session || !session.user) {
        logger.error(`[${uploadId}] No valid session found`);
        throw new Error('Please sign in to upload photos.');
      }

      logger.info(`[${uploadId}] Authenticated as user: ${session.user.email}`);

      // Make the upload request
      logger.info(`[${uploadId}] Making upload request to /api/photos/upload`);
      const response = await fetch("/api/photos/upload", {
=======
      files.forEach((file, index) => {
        formData.append("photos", file);
        logger.info(`[${uploadId}] Added file ${index + 1}: ${file.name}`);
      });

      const response = await fetch(`/api/albums/${albumId}/photos/upload`, {
>>>>>>> oauth-upload-fixes
        method: "POST",
        body: formData,
      });

<<<<<<< HEAD
      logger.info(`[${uploadId}] Upload response status: ${response.status} ${response.statusText}`);
=======
      logger.info(`[${uploadId}] Server response: ${response.status}`);
>>>>>>> oauth-upload-fixes

      let result;
      try {
        const responseText = await response.text();
<<<<<<< HEAD
        logger.info(`[${uploadId}] Raw response: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        
        result = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`[${uploadId}] Failed to parse response:`, parseError);
        throw new Error(`Invalid response from server (${response.status}): ${response.statusText}`);
      }

      if (!response.ok) {
        logger.error(`[${uploadId}] Upload failed:`, {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          code: result.code,
          details: result.details
        });
        
        // Provide more specific error messages based on status code
        let errorMessage = result.error || `Upload failed with status ${response.status}`;
        
        switch (response.status) {
          case 400:
            if (result.code === 'AUTH_REQUIRED') {
              errorMessage = 'Please sign in to upload photos.';
            } else if (result.code === 'MISSING_ALBUM_ID') {
              errorMessage = 'Album not found. Please refresh the page and try again.';
            } else if (result.code === 'NO_FILES') {
              errorMessage = 'No valid image files selected.';
            } else if (result.code === 'FORM_DATA_ERROR') {
              errorMessage = 'Invalid upload data. Please try again.';
            }
            break;
          case 401:
            errorMessage = 'Please sign in to upload photos.';
            break;
          case 404:
            errorMessage = 'Album not found or you don\'t have permission to upload to it.';
            break;
          case 500:
            errorMessage = result.code === 'CONFIG_ERROR' 
              ? 'Upload service is not configured properly. Please contact support.'
              : 'Server error. Please try again later.';
            break;
        }
        
        throw new Error(errorMessage);
      }

      // Success - update progress to completed
      updateProgress({
        status: 'completed',
        uploadedFiles: result.uploadedPhotos?.length || 0,
        progress: 100,
        errors: result.errors || []
      });

      logger.info(`Upload successful: ${result.uploadedPhotos?.length || 0} photos uploaded`);

      // Add retry count to result meta
      if (result.meta) {
        result.meta.retries = retries;
      }

      return result;
    } catch (error) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Upload attempt ${retries} failed:`, errorMessage);

      updateProgress({
        status: 'error',
        errors: [errorMessage]
      });

      if (retries > maxRetries) {
        logger.error(`Upload failed after ${maxRetries + 1} attempts`);
        throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${errorMessage}`);
      }

      // Wait before retrying
      if (retryDelay > 0) {
        logger.info(`Retrying upload in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      updateProgress({
        status: 'uploading',
        errors: [`Retrying... (attempt ${retries + 1}/${maxRetries + 1})`]
=======
        if (!responseText) {
          throw new Error("Empty response from server");
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(
          `Invalid response from server (${response.status}): ${response.statusText}`
        );
      }

      if (!response.ok) {
        let errorMessage =
          result.error || `Upload failed with status ${response.status}`;

        switch (response.status) {
          case 401:
            errorMessage = "Please sign in to upload photos.";
            break;
          case 404:
            errorMessage =
              "Album not found or you don't have permission to upload to it.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
        }

        throw new Error(errorMessage);
      }

      // Success
      updateProgress({
        status: "completed",
        uploadedFiles: result.results?.successful?.length || 0,
        progress: 100,
      });

      // Convert server response to expected format
      const convertedResult: PhotoUploadResult = {
        success: result.success,
        uploadedPhotos: (result.results?.successful || []).map(
          (photo: any) => ({
            id: nanoid(),
            url: photo.publicUrl,
            caption: photo.originalName,
            metadata: JSON.stringify({
              originalName: photo.originalName,
              filePath: photo.path,
              fileSize: photo.sizeBytes,
              mimeType: photo.mimeType,
              uploadMethod: "server-side",
            }),
          })
        ),
        errors: result.results?.failed?.map((f: any) => f.error) || [],
        message: result.message || "Upload completed",
        meta: {
          ...(result.results?.summary || {}),
          processingTime: Date.now() - startTime,
          uploadMethod: "server-side",
          retries,
        },
      };

      logger.info(`[${uploadId}] Server-side upload successful`);
      return convertedResult;
    } catch (error) {
      retries++;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `[${uploadId}] Server upload attempt ${retries} failed:`,
        errorMessage
      );

      updateProgress({
        status: "error",
        errors: [errorMessage],
      });

      if (retries > maxRetries) {
        throw new Error(
          `Upload failed after ${maxRetries + 1} attempts: ${errorMessage}`
        );
      }

      if (retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      updateProgress({
        status: "uploading",
        errors: [`Retrying... (attempt ${retries + 1}/${maxRetries + 1})`],
>>>>>>> oauth-upload-fixes
      });
    }
  }

<<<<<<< HEAD
  // This should never be reached, but TypeScript requires it
=======
>>>>>>> oauth-upload-fixes
  throw new Error("Upload failed unexpectedly");
}

// Legacy function for backward compatibility
export async function uploadPhotosToAlbumLegacy(
  albumId: string,
  files: File[]
): Promise<PhotoUploadResult> {
  return uploadPhotosToAlbum(albumId, files);
}

export function createPhotoPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

// Enhanced file validation with detailed error reporting
export function validateImageFile(file: File): string | null {
  // Check if file exists and has content
  if (!file || file.size === 0) {
    return "File is empty or corrupted";
  }

  // Enhanced MIME type validation
  const validImageTypes = [
<<<<<<< HEAD
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
=======
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
>>>>>>> oauth-upload-fixes
  ];

  if (!validImageTypes.includes(file.type.toLowerCase())) {
    return `Unsupported file type: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF`;
  }

  // File size validation (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    return `File size (${fileSizeMB}MB) exceeds maximum limit of 10MB`;
  }

  // Minimum file size (to avoid empty or corrupted files)
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return `File size (${file.size} bytes) is too small. Minimum size: 1KB`;
  }

  // File name validation
  if (file.name.length > 255) {
    return "File name is too long (maximum 255 characters)";
  }

  // Check for potentially problematic characters in filename
  const problematicChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (problematicChars.test(file.name)) {
    return "File name contains invalid characters";
  }

  return null;
}

export function validateImageFiles(files: File[]): {
  validFiles: File[];
  errors: string[];
} {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const error = validateImageFile(file);
    if (error) {
      errors.push(`${file.name}: ${error}`);
    } else {
      validFiles.push(file);
    }
  });

  return { validFiles, errors };
}

// Utility function to format file sizes
export function formatFileSize(bytes: number): string {
<<<<<<< HEAD
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
=======
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
>>>>>>> oauth-upload-fixes
}

// Utility function to get file extension
export function getFileExtension(filename: string): string {
<<<<<<< HEAD
  return filename.split('.').pop()?.toLowerCase() || '';
=======
  return filename.split(".").pop()?.toLowerCase() || "";
>>>>>>> oauth-upload-fixes
}

// Utility function to generate safe filename
export function generateSafeFilename(originalName: string): string {
  const extension = getFileExtension(originalName);
<<<<<<< HEAD
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
  
  return safeName + (extension ? `.${extension}` : '');
=======
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace invalid chars with underscore
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, "") // Remove leading/trailing underscores
    .substring(0, 100); // Limit length

  return safeName + (extension ? `.${extension}` : "");
>>>>>>> oauth-upload-fixes
}

// Upload status tracker utility
export class UploadTracker {
  private uploads: Map<string, UploadProgress> = new Map();
  private listeners: Map<string, UploadProgressCallback[]> = new Map();

  startUpload(uploadId: string, totalFiles: number): void {
    const progress: UploadProgress = {
      totalFiles,
      uploadedFiles: 0,
      progress: 0,
<<<<<<< HEAD
      status: 'preparing',
      errors: []
    };
    
=======
      status: "preparing",
      errors: [],
    };

>>>>>>> oauth-upload-fixes
    this.uploads.set(uploadId, progress);
    this.notifyListeners(uploadId, progress);
  }

  updateProgress(uploadId: string, update: Partial<UploadProgress>): void {
    const current = this.uploads.get(uploadId);
    if (!current) return;

    const updated = { ...current, ...update };
    this.uploads.set(uploadId, updated);
    this.notifyListeners(uploadId, updated);
  }

  addListener(uploadId: string, callback: UploadProgressCallback): void {
    if (!this.listeners.has(uploadId)) {
      this.listeners.set(uploadId, []);
    }
    this.listeners.get(uploadId)!.push(callback);
  }

  removeListener(uploadId: string, callback: UploadProgressCallback): void {
    const callbacks = this.listeners.get(uploadId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  getProgress(uploadId: string): UploadProgress | undefined {
    return this.uploads.get(uploadId);
  }

  private notifyListeners(uploadId: string, progress: UploadProgress): void {
    const callbacks = this.listeners.get(uploadId);
    if (callbacks) {
<<<<<<< HEAD
      callbacks.forEach(callback => callback(progress));
=======
      callbacks.forEach((callback) => callback(progress));
>>>>>>> oauth-upload-fixes
    }
  }

  cleanup(uploadId: string): void {
    this.uploads.delete(uploadId);
    this.listeners.delete(uploadId);
  }
}

// Global upload tracker instance
export const uploadTracker = new UploadTracker();

// Utility function for testing upload configuration
export async function testUploadConfiguration(): Promise<{
  success: boolean;
  details: any;
  errors: string[];
}> {
  const errors: string[] = [];
  const details: any = {};

  try {
    // Test the debug endpoint
<<<<<<< HEAD
    const response = await fetch('/api/debug/upload-test');
    
    if (!response.ok) {
      errors.push(`Debug endpoint failed: ${response.status} ${response.statusText}`);
=======
    const response = await fetch("/api/debug/upload-test");

    if (!response.ok) {
      errors.push(
        `Debug endpoint failed: ${response.status} ${response.statusText}`
      );
>>>>>>> oauth-upload-fixes
      return { success: false, details: {}, errors };
    }

    const result = await response.json();
    details.configTest = result;

    // Check if all critical tests passed
<<<<<<< HEAD
    const criticalTests = ['environment_config', 'supabase_connection', 'file_upload'];
    const failedCritical = criticalTests.filter(test => 
      !result.tests?.[test]?.passed
    );

    if (failedCritical.length > 0) {
      errors.push(`Critical tests failed: ${failedCritical.join(', ')}`);
=======
    const criticalTests = [
      "environment_config",
      "supabase_connection",
      "file_upload",
    ];
    const failedCritical = criticalTests.filter(
      (test) => !result.tests?.[test]?.passed
    );

    if (failedCritical.length > 0) {
      errors.push(`Critical tests failed: ${failedCritical.join(", ")}`);
>>>>>>> oauth-upload-fixes
    }

    return {
      success: errors.length === 0,
      details,
<<<<<<< HEAD
      errors
    };

  } catch (error) {
    errors.push(`Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
=======
      errors,
    };
  } catch (error) {
    errors.push(
      `Configuration test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
>>>>>>> oauth-upload-fixes
    return { success: false, details, errors };
  }
}
