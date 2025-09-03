"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import {
  Upload,
  X,
  Image,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  uploadPhotos,
  validateFileBatch,
  createFilePreview,
  estimateUploadTime,
  shouldOptimizeFile,
  type UploadedPhoto,
  type UploadProgress,
  type BatchUploadResult,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_BATCH,
} from "@/lib/storage-v2";

interface AlbumPhotoUploaderProps {
  albumId: string;
  onUploadComplete?: (photos: UploadedPhoto[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  maxFiles?: number;
  showOptimizationOption?: boolean;
}

interface FileWithMetadata {
  file: File;
  id: string;
  preview?: string;
  progress: UploadProgress;
  estimatedTime: number;
  shouldOptimize: boolean;
}

export function AlbumPhotoUploader({
  albumId,
  onUploadComplete,
  onUploadError,
  className = "",
  disabled = false,
  maxFiles = MAX_FILES_PER_BATCH,
  showOptimizationOption = true,
}: AlbumPhotoUploaderProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // State
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadController, setUploadController] =
    useState<AbortController | null>(null);
  const [batchProgress, setBatchProgress] = useState({
    completed: 0,
    total: 0,
    overall: 0,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [optimizeImages, setOptimizeImages] = useState(true);
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(
    null
  );

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      files.forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [files]);

  // File processing
  const processFiles = useCallback(
    (newFiles: File[]) => {
      // Validate batch
      const validation = validateFileBatch([
        ...files.map((f) => f.file),
        ...newFiles,
      ]);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      setValidationErrors([]);

      const processedFiles: FileWithMetadata[] = newFiles.map((file) => {
        const { url: preview } = createFilePreview(file);
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          file,
          id,
          preview,
          progress: {
            fileId: id,
            fileName: file.name,
            progress: 0,
            status: "pending",
          },
          estimatedTime: estimateUploadTime(file.size),
          shouldOptimize: shouldOptimizeFile(file),
        };
      });

      setFiles((prev) => {
        // Clean up old previews for replaced files
        const keptFiles = prev.slice(
          0,
          Math.max(0, maxFiles - processedFiles.length)
        );
        const removedFiles = prev.slice(keptFiles.length);
        removedFiles.forEach(({ preview }) => {
          if (preview) URL.revokeObjectURL(preview);
        });

        return [...keptFiles, ...processedFiles].slice(0, maxFiles);
      });
    },
    [files, maxFiles]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
        ALLOWED_TYPES.includes(file.type.toLowerCase() as any)
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
      // Reset input value to allow same file selection
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

  // Upload progress handlers
  const handleFileProgress = useCallback((fileId: string, progress: number) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId
          ? { ...file, progress: { ...file.progress, progress } }
          : file
      )
    );
  }, []);

  const handleFileStatusChange = useCallback(
    (fileId: string, status: UploadProgress["status"], error?: string) => {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                progress: {
                  ...file.progress,
                  status,
                  error,
                },
              }
            : file
        )
      );
    },
    []
  );

  const handleBatchProgress = useCallback(
    (completed: number, total: number, overall: number) => {
      setBatchProgress({ completed, total, overall });
    },
    []
  );

  // Upload function
  const startUpload = useCallback(async () => {
    if (!session?.user?.id || files.length === 0) {
      onUploadError?.("Please sign in and select files to upload");
      return;
    }

    const controller = new AbortController();
    setUploadController(controller);
    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadPhotos(
        files.map((f) => f.file),
        {
          albumId,
          userId: session.user.id,
          optimizeImages,
          onProgress: handleFileProgress,
          onStatusChange: handleFileStatusChange,
          onBatchProgress: handleBatchProgress,
          signal: controller.signal,
        }
      );

      setUploadResult(result);

      if (result.successful.length > 0) {
        onUploadComplete?.(result.successful);
      }

      if (result.failed.length > 0) {
        const errors = result.failed
          .map((f) => `${f.file.name}: ${f.error}`)
          .join("; ");
        onUploadError?.(errors);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      onUploadError?.(errorMessage);
      setValidationErrors([errorMessage]);
    } finally {
      setIsUploading(false);
      setUploadController(null);
    }
  }, [
    session?.user?.id,
    files,
    albumId,
    optimizeImages,
    handleFileProgress,
    handleFileStatusChange,
    handleBatchProgress,
    onUploadComplete,
    onUploadError,
  ]);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
      setIsUploading(false);
      setBatchProgress({ completed: 0, total: 0, overall: 0 });
    }
  }, [uploadController]);

  // Clear all files
  const clearAll = useCallback(() => {
    files.forEach(({ preview }) => {
      if (preview) URL.revokeObjectURL(preview);
    });
    setFiles([]);
    setValidationErrors([]);
    setUploadResult(null);
  }, [files]);

  // Statistics
  const totalSize = files.reduce((acc, { file }) => acc + file.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusIcon = (status: UploadProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "uploading":
      case "optimizing":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const canUpload = files.length > 0 && !isUploading && !disabled;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${
            isDragOver
              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-300 dark:border-gray-700"
          }
          ${
            disabled || isUploading
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer"
          }
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
            className={`p-4 rounded-full ${isDragOver ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            <Upload
              className={`w-8 h-8 ${isDragOver ? "text-blue-500" : "text-gray-400"}`}
            />
          </div>

          <div>
            <p className="text-lg font-medium">
              {isDragOver ? "Drop photos here" : "Upload your adventure photos"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop or click to select • Up to {maxFiles} photos • Max{" "}
              {formatSize(MAX_FILE_SIZE)} each
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports:{" "}
              {ALLOWED_TYPES.map((type) =>
                type.split("/")[1].toUpperCase()
              ).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Options */}
      {showOptimizationOption && files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Image Optimization</span>
                <Badge variant="secondary" className="text-xs">
                  {files.filter((f) => f.shouldOptimize).length} files will be
                  optimized
                </Badge>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optimizeImages}
                  onChange={(e) => setOptimizeImages(e.target.checked)}
                  className="rounded"
                  disabled={isUploading}
                />
                <span className="text-sm">Auto-optimize (recommended)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Reduces file sizes, fixes orientation, and converts to WebP when
              beneficial
            </p>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    Selected Photos ({files.length})
                  </h3>
                  <p className="text-sm text-gray-500">
                    Total size: {formatSize(totalSize)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={isUploading}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              <div className="p-4 space-y-3">
                {files.map((fileData) => (
                  <div
                    key={fileData.id}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {fileData.preview ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden">
                          <NextImage
                            src={fileData.preview}
                            alt={`Preview: ${fileData.file.name}`}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Image
                            className="w-6 h-6 text-gray-400"
                            aria-label="File placeholder"
                          />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {fileData.file.name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {formatSize(fileData.file.size)}
                        </Badge>
                        {fileData.shouldOptimize && optimizeImages && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            Auto-optimize
                          </Badge>
                        )}
                      </div>

                      {/* Progress */}
                      {(isUploading ||
                        fileData.progress.status !== "pending") && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 text-xs">
                            {getStatusIcon(fileData.progress.status)}
                            <span className="capitalize">
                              {fileData.progress.status}
                            </span>
                            {fileData.progress.status === "uploading" && (
                              <span>{fileData.progress.progress}%</span>
                            )}
                          </div>
                          {fileData.progress.status !== "pending" && (
                            <Progress
                              value={fileData.progress.progress}
                              className="mt-1 h-1"
                            />
                          )}
                          {fileData.progress.error && (
                            <p className="text-xs text-red-500 mt-1">
                              {fileData.progress.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileData.id)}
                      disabled={isUploading}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Upload Controls */}
      {files.length > 0 && (
        <div className="flex items-center gap-4">
          {isUploading ? (
            <>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>
                    Uploading {batchProgress.completed} of {batchProgress.total}{" "}
                    photos
                  </span>
                  <span>{Math.round(batchProgress.overall)}%</span>
                </div>
                <Progress value={batchProgress.overall} className="h-2" />
              </div>
              <Button variant="outline" onClick={cancelUpload}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={startUpload}
                disabled={!canUpload}
                className="flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload {files.length} Photo{files.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-medium">Upload Complete</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-green-600 font-medium">
                    {uploadResult.successful.length} Successful
                  </div>
                </div>
                {uploadResult.failed.length > 0 && (
                  <div>
                    <div className="text-red-600 font-medium">
                      {uploadResult.failed.length} Failed
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-gray-600">
                    {formatSize(uploadResult.totalSizeBytes)} Total
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">
                    {(uploadResult.totalTimeMs / 1000).toFixed(1)}s Upload Time
                  </div>
                </div>
              </div>

              {uploadResult.failed.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Failed Uploads:
                    </h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {uploadResult.failed.map((failure, index) => (
                        <li key={index}>
                          • {failure.file.name}: {failure.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
