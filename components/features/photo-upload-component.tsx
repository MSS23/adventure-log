"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/app/providers";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  validateFile,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
} from "@/lib/storage-simple";

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

interface UploadedPhoto {
  path: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  originalName: string;
}

interface PhotoUploadProps {
  albumId: string;
  albumTitle?: string;
  onUploadComplete?: (photos: UploadedPhoto[]) => void;
  onUploadError?: (errors: string[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function PhotoUploadComponent({
  albumId,
  albumTitle,
  onUploadComplete,
  onUploadError,
  disabled = false,
  maxFiles = 10,
}: PhotoUploadProps) {
  const { user, session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, UploadProgress>
  >({});
  const [dragOver, setDragOver] = useState(false);

  // Handle file selection
  const handleFileSelection = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newFiles: File[] = [];
      const errors: string[] = [];

      Array.from(files).forEach((file) => {
        const validation = validateFile(file);
        if (validation.isValid) {
          newFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      });

      if (selectedFiles.length + newFiles.length > maxFiles) {
        toast.error(
          `Maximum ${maxFiles} files allowed. Selected ${newFiles.length}, already have ${selectedFiles.length}.`
        );
        return;
      }

      if (errors.length > 0) {
        toast.error(`Some files were rejected: ${errors.join(", ")}`);
      }

      if (newFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        toast.success(
          `Added ${newFiles.length} file${newFiles.length === 1 ? "" : "s"} for upload`
        );
      }
    },
    [selectedFiles.length, maxFiles]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelection(e.dataTransfer.files);
    },
    [handleFileSelection]
  );

  // Remove selected file
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Upload files to server
  const uploadFiles = useCallback(async () => {
    if (!user?.id) {
      toast.error("Please sign in to upload photos");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setUploading(true);
    const progressMap: Record<string, UploadProgress> = {};

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append("photos", file);

        // Initialize progress tracking
        const fileId = `${Date.now()}-${index}`;
        progressMap[fileId] = {
          fileId,
          fileName: file.name,
          progress: 0,
          status: "uploading",
        };
      });

      setUploadProgress(progressMap);

      // Upload to secure server endpoint
      const uploadResponse = await fetch(
        `/api/albums/${albumId}/photos/secure-upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(
          errorData.error || `Upload failed: ${uploadResponse.statusText}`
        );
      }

      const result = await uploadResponse.json();

      // Update progress for successful uploads
      Object.keys(progressMap).forEach((fileId, index) => {
        if (index < result.results.successful.length) {
          progressMap[fileId] = {
            ...progressMap[fileId],
            progress: 100,
            status: "completed",
          };
        } else {
          progressMap[fileId] = {
            ...progressMap[fileId],
            status: "error",
            error: "Upload failed",
          };
        }
      });

      setUploadProgress({ ...progressMap });

      // Handle results
      if (result.success) {
        toast.success(result.message || "Photos uploaded successfully!");
        onUploadComplete?.(result.results.successful);

        // Clear selected files after successful upload
        setTimeout(() => {
          setSelectedFiles([]);
          setUploadProgress({});
        }, 2000);
      } else {
        const errors = result.results.failed.map(
          (f: any) => `${f.filename}: ${f.error}`
        );
        toast.error("Some uploads failed");
        onUploadError?.(errors);
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown upload error";
      toast.error(`Upload failed: ${errorMessage}`);

      // Mark all as failed
      Object.keys(progressMap).forEach((fileId) => {
        progressMap[fileId] = {
          ...progressMap[fileId],
          status: "error",
          error: errorMessage,
        };
      });
      setUploadProgress({ ...progressMap });

      onUploadError?.([errorMessage]);
    } finally {
      setUploading(false);
    }
  }, [user, selectedFiles, albumId, onUploadComplete, onUploadError]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to upload photos to your albums.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Upload Photos
          {albumTitle && (
            <span className="text-sm font-normal text-muted-foreground">
              to {albumTitle}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-gray-300 hover:border-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop photos here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Support: JPEG, PNG, WebP, HEIC • Max:{" "}
              {formatFileSize(MAX_FILE_SIZE)} • Up to {maxFiles} files
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
            disabled={disabled}
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Selected Files ({selectedFiles.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFiles([])}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => {
                const fileId =
                  Object.keys(uploadProgress).find(
                    (id) => uploadProgress[id].fileName === file.name
                  ) || `file-${index}`;
                const progress = uploadProgress[fileId];

                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(file.size)}
                        </Badge>
                        {progress?.status === "completed" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {progress?.status === "error" && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>

                      {progress && (
                        <div className="space-y-1">
                          <Progress value={progress.progress} className="h-2" />
                          {progress.status === "error" && progress.error && (
                            <p className="text-xs text-red-600">
                              {progress.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={uploadFiles}
              disabled={uploading || disabled || selectedFiles.length === 0}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} Photo
                  {selectedFiles.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Upload Summary */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Upload Progress</h4>
            <div className="text-sm text-gray-600">
              {
                Object.values(uploadProgress).filter(
                  (p) => p.status === "completed"
                ).length
              }{" "}
              completed,{" "}
              {
                Object.values(uploadProgress).filter(
                  (p) => p.status === "error"
                ).length
              }{" "}
              failed,{" "}
              {
                Object.values(uploadProgress).filter(
                  (p) => p.status === "uploading"
                ).length
              }{" "}
              uploading
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
