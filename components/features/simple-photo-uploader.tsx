"use client";

import React, { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

interface UploadedPhoto {
  id: string;
  url: string;
  filename: string;
  size: number;
}

interface SimplePhotoUploaderProps {
  albumId: string;
  onUploadComplete?: (photos: UploadedPhoto[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  maxFiles?: number;
}

interface FileWithPreview {
  file: File;
  id: string;
  preview: string;
  status: "ready" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
  uploadedPhoto?: UploadedPhoto;
}

export function SimplePhotoUploader({
  albumId,
  onUploadComplete,
  onUploadError,
  className = "",
  disabled = false,
  maxFiles = 10,
}: SimplePhotoUploaderProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Unsupported file type. Please use JPEG, PNG, or WebP images.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB.`;
    }

    return null;
  }, []);

  const createPreviewUrl = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || !session?.user?.id) return;

      const newFiles: FileWithPreview[] = [];
      const errors: string[] = [];

      // Check total file count
      if (files.length + selectedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const error = validateFile(file);

        if (error) {
          errors.push(error);
          continue;
        }

        const fileWithPreview: FileWithPreview = {
          file,
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          preview: createPreviewUrl(file),
          status: "ready",
          progress: 0,
        };

        newFiles.push(fileWithPreview);
      }

      if (errors.length > 0) {
        errors.forEach((error) => toast.error(error));
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [files.length, maxFiles, session?.user?.id, validateFile, createPreviewUrl]
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  const uploadFile = async (
    fileWithPreview: FileWithPreview
  ): Promise<UploadedPhoto> => {
    const formData = new FormData();
    formData.append("file", fileWithPreview.file);
    formData.append("albumId", albumId);

    const response = await fetch(`/api/albums/${albumId}/photos/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const result = await response.json();

    // Handle different response formats
    if (
      result.photos &&
      Array.isArray(result.photos) &&
      result.photos.length > 0
    ) {
      const photo = result.photos[0];
      return {
        id: photo.id,
        url: photo.publicUrl || photo.url,
        filename:
          photo.fileName || photo.originalName || fileWithPreview.file.name,
        size: photo.sizeBytes || photo.fileSize || fileWithPreview.file.size,
      };
    } else if (result.id && result.url) {
      return {
        id: result.id,
        url: result.url,
        filename: result.filename || fileWithPreview.file.name,
        size: result.size || fileWithPreview.file.size,
      };
    } else {
      throw new Error("Invalid response format from upload API");
    }
  };

  const handleUpload = async () => {
    if (!session?.user?.id || files.length === 0) return;

    setIsUploading(true);
    const uploadedPhotos: UploadedPhoto[] = [];
    let hasErrors = false;

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const fileWithPreview of files) {
        if (fileWithPreview.status !== "ready") continue;

        // Update file status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithPreview.id
              ? { ...f, status: "uploading" as const, progress: 10 }
              : f
          )
        );

        try {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithPreview.id && f.status === "uploading"
                  ? { ...f, progress: Math.min(f.progress + 20, 90) }
                  : f
              )
            );
          }, 300);

          const uploadedPhoto = await uploadFile(fileWithPreview);
          clearInterval(progressInterval);

          // Mark as completed
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithPreview.id
                ? {
                    ...f,
                    status: "completed" as const,
                    progress: 100,
                    uploadedPhoto,
                  }
                : f
            )
          );

          uploadedPhotos.push(uploadedPhoto);
        } catch (error) {
          hasErrors = true;
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithPreview.id
                ? {
                    ...f,
                    status: "error" as const,
                    error: errorMessage,
                    progress: 0,
                  }
                : f
            )
          );

          console.error(
            `Upload error for ${fileWithPreview.file.name}:`,
            error
          );
        }
      }

      // Call completion handlers
      if (uploadedPhotos.length > 0) {
        onUploadComplete?.(uploadedPhotos);
        toast.success(
          `Successfully uploaded ${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? "s" : ""}`
        );
      }

      if (hasErrors) {
        onUploadError?.("Some photos failed to upload");
        toast.error("Some photos failed to upload. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || isUploading) return;

      const droppedFiles = e.dataTransfer.files;
      handleFileSelect(droppedFiles);
    },
    [disabled, isUploading, handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const readyFiles = files.filter((f) => f.status === "ready").length;
  const completedFiles = files.filter((f) => f.status === "completed").length;
  const hasErrors = files.some((f) => f.status === "error");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Input Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${
            disabled || isUploading
              ? "border-muted bg-muted/50 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() =>
          !disabled && !isUploading && fileInputRef.current?.click()
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled || isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2 rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {files.length === 0
                ? "Drop photos here or click to upload"
                : "Add more photos"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPEG, PNG, WebP up to{" "}
              {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB each
            </p>
            {maxFiles && (
              <p className="text-xs text-muted-foreground">
                {files.length}/{maxFiles} photos selected
              </p>
            )}
          </div>
        </div>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((fileWithPreview) => (
            <Card key={fileWithPreview.id} className="overflow-hidden">
              <CardContent className="p-2">
                <div className="relative aspect-square mb-2">
                  <Image
                    src={fileWithPreview.preview}
                    alt={fileWithPreview.file.name}
                    fill
                    className="object-cover rounded"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />

                  {/* Remove button */}
                  {!isUploading && fileWithPreview.status === "ready" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileWithPreview.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Status overlay */}
                  {fileWithPreview.status !== "ready" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                      {fileWithPreview.status === "uploading" && (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      )}
                      {fileWithPreview.status === "completed" && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      )}
                      {fileWithPreview.status === "error" && (
                        <AlertCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {fileWithPreview.status === "uploading" && (
                  <Progress
                    value={fileWithPreview.progress}
                    className="h-1 mb-1"
                  />
                )}

                {/* File info */}
                <div className="text-xs space-y-1">
                  <p className="truncate font-medium">
                    {fileWithPreview.file.name}
                  </p>
                  <p className="text-muted-foreground">
                    {(fileWithPreview.file.size / (1024 * 1024)).toFixed(1)}MB
                  </p>

                  {fileWithPreview.status === "error" &&
                    fileWithPreview.error && (
                      <p className="text-red-500 text-xs">
                        {fileWithPreview.error}
                      </p>
                    )}

                  <Badge
                    variant={
                      fileWithPreview.status === "completed"
                        ? "default"
                        : fileWithPreview.status === "error"
                          ? "destructive"
                          : fileWithPreview.status === "uploading"
                            ? "secondary"
                            : "outline"
                    }
                    className="text-xs"
                  >
                    {fileWithPreview.status === "ready" && "Ready"}
                    {fileWithPreview.status === "uploading" && "Uploading..."}
                    {fileWithPreview.status === "completed" && "Uploaded"}
                    {fileWithPreview.status === "error" && "Failed"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Controls */}
      {files.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            {readyFiles > 0 && `${readyFiles} ready to upload`}
            {completedFiles > 0 && ` • ${completedFiles} uploaded`}
            {hasErrors && ` • Some failed`}
          </div>

          <div className="flex gap-2">
            {readyFiles > 0 && (
              <Button
                onClick={handleUpload}
                disabled={disabled || isUploading}
                size="sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {readyFiles} Photo{readyFiles > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                files.forEach(
                  (f) => f.preview && URL.revokeObjectURL(f.preview)
                );
                setFiles([]);
              }}
              disabled={isUploading}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {!session?.user?.id && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please sign in to upload photos</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
