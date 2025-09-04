// Storage and upload related TypeScript interfaces

export interface UploadMetadata {
  albumId: string;
  originalFilename: string;
  secureFilename: string;
  contentType: string;
  size?: number;
  uploadedAt: string;
  userId: string;
}

export interface SignedUploadRequest {
  albumId: string;
  filename: string;
  contentType: string;
}

export interface SignedUploadResponse {
  success: boolean;
  requestId: string;
  upload: {
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  };
  metadata: {
    albumId: string;
    originalFilename: string;
    secureFilename: string;
    contentType: string;
    expiresAt: string;
    maxFileSizeBytes: number;
  };
  message: string;
}

export interface UploadError {
  error: string;
  code: string;
  requestId: string;
  details?: string | string[];
  allowedTypes?: string[];
}

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata?: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
  fullPath?: string;
  publicUrl?: string;
}

export interface StorageUsage {
  totalSizeBytes: number;
  totalFiles: number;
  formattedSize: string;
}

export interface StorageListOptions {
  limit?: number;
  offset?: number;
  sortBy?: {
    column: string;
    order?: "asc" | "desc";
  };
}

export interface PhotoUploadData {
  url: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  metadata?: string;
}

export interface PhotoSaveRequest {
  photos: PhotoUploadData[];
}

export interface UploadConstraints {
  maxFileSizeBytes: number;
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
  signedUrlExpirySeconds: number;
}

export interface UploadEndpointInfo {
  endpoint: string;
  method: string;
  description: string;
  constraints: UploadConstraints;
  requiredFields: Record<string, string>;
  authentication: string;
  pathFormat: string;
  usage: {
    step1: string;
    step2: string;
    step3: string;
  };
}

// Supabase Storage API response types
export interface SupabaseStorageResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SupabaseUploadResponse {
  data: {
    token: string;
    signedUrl: string;
  } | null;
  error: {
    message: string;
    statusCode?: number;
  } | null;
}

// File validation types
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions?: string[];
  requireImageDimensions?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

// Album photo types for database operations
export interface AlbumPhotoInsert {
  url: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  metadata?: string;
  albumId: string;
}

export interface AlbumPhotoWithMetadata {
  id: string;
  url: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
  albumId: string;
  album: {
    id: string;
    title: string;
    userId: string;
  };
}
