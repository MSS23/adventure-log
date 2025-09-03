"use client";

import React, { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  uploadMultiplePhotos,
  validateFile,
  type UploadedPhoto,
  type UploadProgress,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage-simple";

interface AlbumPhotoUploaderProps {
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
  preview?: string;
  status: "ready" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
}

export function AlbumPhotoUploader({
  albumId,
  onUploadComplete,
  onUploadError,
  className = "",
  disabled = false,
  maxFiles = 10,
}: AlbumPhotoUploaderProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>("");

  // File processing
  const processFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles: FileWithPreview[] = [];
      const errors: string[] = [];

      newFiles.forEach((file) => {
        const validation = validateFile(file);
        if (validation.isValid) {
          const preview = URL.createObjectURL(file);
          validFiles.push({
            file,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            preview,
            status: "ready",
            progress: 0,
          });
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      });

      if (errors.length > 0) {
        setError(errors.join("; "));
      } else {
        setError("");
      }

      setFiles((prev) => {
        // Clean up old previews
        prev.forEach((f) => {
          if (f.preview) URL.revokeObjectURL(f.preview);
        });

        // Take only up to maxFiles
        return validFiles.slice(0, maxFiles);
      });
    },
    [maxFiles]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
        ALLOWED_TYPES.includes(file.type)
      );

      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, isUploading, processFiles]
  );

  // File input handler
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFiles]
  );

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // Upload function
  const startUpload = useCallback(async () => {
    if (!session?.user?.id || files.length === 0) {
      setError("Please sign in and select files to upload");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress(0);

    // Update all files to uploading status
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "uploading" as const, progress: 0 }))
    );

    try {
      const uploaded: UploadedPhoto[] = [];

      // Upload files one by one for simplicity
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];

        try {
          // Update progress handler
          const onProgress = (progress: UploadProgress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileData.id
                  ? {
                      ...f,
                      progress: progress.progress,
                      status: progress.status,
                    }
                  : f
              )
            );
          };

          const result = await uploadMultiplePhotos(
            [fileData.file],
            session.user.id,
            albumId,
            onProgress
          );

          if (result.length > 0) {
            uploaded.push(result[0]);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileData.id
                  ? { ...f, status: "completed", progress: 100 }
                  : f
              )
            );
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Upload failed";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? { ...f, status: "error", error: errorMsg }
                : f
            )
          );
        }

        // Update overall progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (uploaded.length > 0) {
        onUploadComplete?.(uploaded);
      }

      const failedCount = files.length - uploaded.length;
      if (failedCount > 0) {
        setError(`${failedCount} file(s) failed to upload`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [session?.user?.id, files, albumId, onUploadComplete, onUploadError]);

  // Clear all files
  const clearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setError("");
  }, [files]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusIcon = (status: FileWithPreview["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "uploading":
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return (
          <ImageIcon
            className="w-4 h-4 text-gray-400"
            aria-label="File ready"
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-300 dark:border-gray-700"}
          ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !disabled && !isUploading && fileInputRef.current?.click()
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`p-4 rounded-full ${isDragOver ? "bg-blue-100" : "bg-gray-100"}`}
          >
            <Upload
              className={`w-8 h-8 ${isDragOver ? "text-blue-500" : "text-gray-400"}`}
            />
          </div>
          <div>
            <p className="text-lg font-medium">
              {isDragOver ? "Drop photos here" : "Upload photos"}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop or click to select • Up to {maxFiles} photos • Max{" "}
              {formatSize(MAX_FILE_SIZE)} each
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Selected Photos ({files.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={isUploading}
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {files.map((fileData) => (
                <div
                  key={fileData.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    {fileData.preview ? (
                      <Image
                        src={fileData.preview}
                        alt={`Preview of ${fileData.file.name}`}
                        className="w-full h-full object-cover"
                        width={48}
                        height={48}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon
                          className="w-6 h-6 text-gray-400"
                          aria-label="File placeholder"
                        />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {fileData.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSize(fileData.file.size)}
                    </p>

                    {/* Progress */}
                    {fileData.status === "uploading" && (
                      <div className="mt-2">
                        <Progress value={fileData.progress} className="h-1" />
                        <p className="text-xs text-gray-500 mt-1">
                          {fileData.progress}%
                        </p>
                      </div>
                    )}

                    {fileData.error && (
                      <p className="text-xs text-red-500 mt-1">
                        {fileData.error}
                      </p>
                    )}
                  </div>

                  {/* Status & Remove */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusIcon(fileData.status)}
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileData.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {files.length > 0 && !isUploading && (
        <Button onClick={startUpload} disabled={disabled} className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          Upload {files.length} Photo{files.length === 1 ? "" : "s"}
        </Button>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uploading...</span>
              <span className="text-sm text-gray-500">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
