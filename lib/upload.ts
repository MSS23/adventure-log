import { logger } from "./logger";

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
  };
}

export interface UploadProgress {
  totalFiles: number;
  uploadedFiles: number;
  currentFile?: string;
  progress: number; // 0-100
  status: 'preparing' | 'uploading' | 'completed' | 'error';
  errors: string[];
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

// Enhanced upload function with retry logic and progress tracking
export async function uploadPhotosToAlbum(
  albumId: string,
  files: File[],
  options: {
    onProgress?: UploadProgressCallback;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<PhotoUploadResult> {
  const { onProgress, maxRetries = 2, retryDelay = 1000 } = options;
  let retries = 0;

  // Initialize progress
  const updateProgress = (update: Partial<UploadProgress>) => {
    if (onProgress) {
      const progress: UploadProgress = {
        totalFiles: files.length,
        uploadedFiles: 0,
        progress: 0,
        status: 'preparing',
        errors: [],
        ...update
      };
      onProgress(progress);
    }
  };

  updateProgress({ status: 'preparing' });

  while (retries <= maxRetries) {
    try {
      logger.info(`Upload attempt ${retries + 1}/${maxRetries + 1} for ${files.length} files to album ${albumId}`);
      
      updateProgress({ status: 'uploading', currentFile: files[0]?.name });

      const formData = new FormData();
      formData.append("albumId", albumId);

      files.forEach((file, _index) => {
        formData.append("photos", file);
      });

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(`Invalid response from server (${response.status}): ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Upload failed with status ${response.status}`);
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
      });
    }
  }

  // This should never be reached, but TypeScript requires it
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
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
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
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to get file extension
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Utility function to generate safe filename
export function generateSafeFilename(originalName: string): string {
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
  
  return safeName + (extension ? `.${extension}` : '');
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
      status: 'preparing',
      errors: []
    };
    
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
      callbacks.forEach(callback => callback(progress));
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
    const response = await fetch('/api/debug/upload-test');
    
    if (!response.ok) {
      errors.push(`Debug endpoint failed: ${response.status} ${response.statusText}`);
      return { success: false, details: {}, errors };
    }

    const result = await response.json();
    details.configTest = result;

    // Check if all critical tests passed
    const criticalTests = ['environment_config', 'supabase_connection', 'file_upload'];
    const failedCritical = criticalTests.filter(test => 
      !result.tests?.[test]?.passed
    );

    if (failedCritical.length > 0) {
      errors.push(`Critical tests failed: ${failedCritical.join(', ')}`);
    }

    return {
      success: errors.length === 0,
      details,
      errors
    };

  } catch (error) {
    errors.push(`Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, details, errors };
  }
}
