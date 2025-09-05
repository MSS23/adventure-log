import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { supabaseStorageAdmin } from "@/lib/supabase";
import { createAuthenticatedServerClient } from "@/lib/supabase-server";
import { checkAndAwardBadges } from "@/lib/badges";
import {
  generatePhotoPath,
  getPublicUrl,
  validateFile,
  BUCKET_NAME,
  type UploadedPhoto,
} from "@/lib/storage-simple";

// Ensure Node.js runtime for proper FormData handling
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for batch uploads

// Validation schema
const uploadRequestSchema = z.object({
  albumId: z.string().min(1),
  optimize: z.boolean().optional().default(true),
  maxDimension: z.number().min(100).max(5000).optional().default(3000),
  quality: z.number().min(0.1).max(1).optional().default(0.85),
});

interface UploadError {
  filename: string;
  error: string;
  code: string;
}

/**
 * POST /api/albums/[albumId]/photos/upload
 *
 * Upload photos to a specific album with comprehensive validation and security.
 * Supports batch uploads with concurrency control and detailed error reporting.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`[${requestId}] Photo upload started`, {
    albumId: params.albumId,
    url: request.url,
    userAgent: request.headers.get("user-agent"),
  });

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized upload attempt`);
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          requestId,
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { albumId } = params;

    // Validate request parameters
    let formData: FormData;
    let files: File[];
    let options: z.infer<typeof uploadRequestSchema>;

    try {
      formData = await request.formData();

      // Extract options with defaults
      options = uploadRequestSchema.parse({
        albumId,
        optimize: formData.get("optimize") === "true",
        maxDimension: formData.get("maxDimension")
          ? parseInt(formData.get("maxDimension") as string)
          : undefined,
        quality: formData.get("quality")
          ? parseFloat(formData.get("quality") as string)
          : undefined,
      });

      // Extract files from various possible field names
      files = [];
      const fileFields = ["photos", "files", "images"];

      for (const fieldName of fileFields) {
        const fieldFiles = formData.getAll(fieldName) as File[];
        files.push(
          ...fieldFiles.filter((f) => f instanceof File && f.size > 0)
        );
      }

      // Also check individual file field
      const singleFile = formData.get("photo") as File | null;
      if (singleFile instanceof File && singleFile.size > 0) {
        files.push(singleFile);
      }

      logger.info(`[${requestId}] Form data parsed`, {
        filesCount: files.length,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
        options,
      });
    } catch (error) {
      logger.error(`[${requestId}] Failed to parse form data:`, { error });
      return NextResponse.json(
        {
          error: "Invalid form data format",
          code: "INVALID_FORM_DATA",
          requestId,
          details:
            error instanceof Error ? error.message : "Unknown parsing error",
        },
        { status: 400 }
      );
    }

    // Validate files
    if (files.length === 0) {
      return NextResponse.json(
        {
          error: "No files provided",
          code: "NO_FILES",
          requestId,
          hint: "Include files in 'photos', 'files', 'images', or 'photo' fields",
        },
        { status: 400 }
      );
    }

    // File validation
    const validationErrors: UploadError[] = [];
    const validFiles: File[] = [];

    files.forEach((file, index) => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        validationErrors.push({
          filename: file.name || `File ${index + 1}`,
          error: validation.error || "Validation failed",
          code: "FILE_INVALID",
        });
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error: "No valid files to upload",
          code: "NO_VALID_FILES",
          requestId,
          validationErrors,
        },
        { status: 400 }
      );
    }

    // Verify album ownership
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId: userId,
      },
      select: {
        id: true,
        title: true,
        userId: true,
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!album) {
      logger.warn(`[${requestId}] Album not found or unauthorized`, {
        albumId,
        userId,
      });
      return NextResponse.json(
        {
          error: "Album not found or access denied",
          code: "ALBUM_NOT_FOUND",
          requestId,
        },
        { status: 404 }
      );
    }

    logger.info(`[${requestId}] Album verified`, {
      albumTitle: album.title,
      existingPhotos: album._count.photos,
    });

    // Upload files with error handling
    const successful: UploadedPhoto[] = [];
    const failed: UploadError[] = [...validationErrors];

    // Process files with controlled concurrency
    const CONCURRENT_UPLOADS = 3;
    const processingQueue = validFiles.map((file) => ({ file }));
    const activeUploads: Promise<void>[] = [];

    while (processingQueue.length > 0 || activeUploads.length > 0) {
      // Start new uploads if we have capacity and files to process
      while (
        activeUploads.length < CONCURRENT_UPLOADS &&
        processingQueue.length > 0
      ) {
        const { file } = processingQueue.shift()!;

        const uploadPromise = (async () => {
          const fileStartTime = Date.now();

          try {
            // Generate secure path
            const storagePath = generatePhotoPath(userId, albumId, file.name);

            logger.info(`[${requestId}] Uploading file: ${file.name}`, {
              size: file.size,
              type: file.type,
              path: storagePath,
            });

            // Try authenticated server client first, fallback to admin client
            let uploadError: any = null;
            let uploadSuccess = false;

            try {
              // Use authenticated server client with cookies
              const authenticatedClient =
                await createAuthenticatedServerClient();
              const { error: authUploadError } =
                await authenticatedClient.storage
                  .from(BUCKET_NAME)
                  .upload(storagePath, file, {
                    cacheControl: "31536000", // 1 year
                    contentType: file.type,
                    upsert: false, // Prevent overwrites
                  });

              if (!authUploadError) {
                uploadSuccess = true;
                logger.info(`[${requestId}] Upload successful with authenticated client: ${file.name}`
                );
              } else {
                uploadError = authUploadError;
                logger.warn(
                  `[${requestId}] Authenticated upload failed, { trying admin client:`,
                  { error: authUploadError } });
              }
            } catch (authError) {
              logger.warn(
                `[${requestId}] Authenticated client creation failed:`,
                { error: authError }
              );
            }

            // Fallback to admin client if authenticated upload failed
            if (!uploadSuccess) {
              const { error: adminUploadError } =
                await supabaseStorageAdmin.storage
                  .from(BUCKET_NAME)
                  .upload(storagePath, file, {
                    cacheControl: "31536000", // 1 year
                    contentType: file.type,
                    upsert: false, // Prevent overwrites
                  });

              if (!adminUploadError) {
                uploadSuccess = true;
                logger.info(`[${requestId}] Upload successful with admin client: ${file.name}`
                );
              } else {
                uploadError = adminUploadError;
              }
            }

            if (uploadError) {
              throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            // Generate public URL
            const publicUrl = getPublicUrl(storagePath);

            // Get image dimensions if possible
            let dimensions: { width: number; height: number } | undefined;
            if (file.type.startsWith("image/")) {
              // Note: Server-side dimension extraction would require additional libraries
              // For now, { we'll let the client handle this or add it later
            }

            // Save to database
            const albumPhoto = await db.albumPhoto.create({
              data: {
                url: publicUrl,
                albumId: albumId,
                metadata: JSON.stringify({
                  originalName: file.name,
                  filePath: storagePath,
                  fileSize: file.size,
                  mimeType: file.type,
                  width: dimensions?.width,
                  height: dimensions?.height,
                  uploadedAt: new Date().toISOString(),
                  requestId,
                  originalSize: file.size,
                  optimized: options.optimize,
                }),
              },
            });

            const uploadResult: UploadedPhoto = {
              path: storagePath,
              publicUrl,
              width: dimensions?.width,
              height: dimensions?.height,
              sizeBytes: file.size,
              mimeType: file.type,
              createdAt: albumPhoto.createdAt.toISOString(),
              originalName: file.name,
              optimized: options.optimize,
            };

            successful.push(uploadResult);

            const fileUploadTime = Date.now() - fileStartTime;
            logger.info(
              `[${requestId}] File uploaded successfully: ${file.name}`,
              {
                uploadTime: fileUploadTime,
                photoId: albumPhoto.id,
              }
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown upload error";
            logger.error(`[${requestId}] File upload failed: ${file.name}`, {
              error: errorMessage,
              size: file.size,
              type: file.type,
            });

            failed.push({
              filename: file.name,
              error: errorMessage,
              code: "UPLOAD_FAILED",
            });
          }
        })();

        activeUploads.push(uploadPromise);
      }

      // Wait for at least one upload to complete
      if (activeUploads.length > 0) {
        await Promise.race(activeUploads);

        // Remove completed uploads
        for (let i = activeUploads.length - 1; i >= 0; i--) {
          const upload = activeUploads[i];
          const isCompleted = await Promise.race([
            upload.then(() => true),
            Promise.resolve(false),
          ]);

          if (isCompleted) {
            activeUploads.splice(i, 1);
          }
        }
      }
    }

    // Update album stats and user stats if we have successful uploads
    if (successful.length > 0) {
      await db.$transaction(async (tx) => {
        // Update album updated timestamp
        await tx.album.update({
          where: { id: albumId },
          data: { updatedAt: new Date() },
        });

        // Update user photo count
        await tx.user.update({
          where: { id: userId },
          data: {
            totalPhotosCount: {
              increment: successful.length,
            },
          },
        });

        // Create activity record
        await tx.activity.create({
          data: {
            userId: userId,
            type: "PHOTO_UPLOADED",
            targetType: "Album",
            targetId: albumId,
            metadata: JSON.stringify({
              albumTitle: album.title,
              photosCount: successful.length,
              photoIds: successful.map((photo) => photo.path),
              requestId,
            }),
          },
        });
      });

      // Award badges asynchronously
      setImmediate(() => {
        checkAndAwardBadges({
          userId,
          triggerType: "PHOTO_UPLOADED",
          metadata: {
            albumId,
            photosCount: successful.length,
            requestId,
          },
        }).catch((error) => {
          logger.error(`[${requestId}] Badge award failed:`, { error });
        });
      });
    }

    const totalTime = Date.now() - startTime;

    logger.info(`[${requestId}] Upload batch completed`, {
      successful: successful.length,
      failed: failed.length,
      totalTime,
      totalSize: successful.reduce((acc, photo) => acc + photo.sizeBytes, 0),
    });

    // Return results
    const isSuccess = successful.length > 0;
    const statusCode = isSuccess ? 200 : 400;

    return NextResponse.json(
      {
        success: isSuccess,
        requestId,
        results: {
          successful,
          failed,
          summary: {
            totalFiles: files.length,
            successfulUploads: successful.length,
            failedUploads: failed.length,
            totalSizeBytes: successful.reduce(
              (acc, photo) => acc + photo.sizeBytes,
              0
            ),
            processingTimeMs: totalTime,
          },
        },
        message: isSuccess
          ? `${successful.length} photo${successful.length === 1 ? "" : "s"} uploaded successfully${
              failed.length > 0 ? ` (${failed.length} failed)` : ""
            }`
          : `All uploads failed (${failed.length} errors)`,
      },
      { status: statusCode }
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    logger.error(`[${requestId}] Unexpected upload error:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalTime,
    });

    return NextResponse.json(
      {
        error: "Internal server error during upload",
        code: "INTERNAL_ERROR",
        requestId,
        message: errorMessage,
        processingTime: totalTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/albums/[albumId]/photos/upload
 *
 * Get upload endpoint information and album details for debugging
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { albumId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { albumId } = params;

  try {
    // Verify album exists and user has access
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      endpoint: `/api/albums/${albumId}/photos/upload`,
      method: "POST",
      contentType: "multipart/form-data",
      album: {
        id: album.id,
        title: album.title,
        description: album.description,
        photoCount: album._count.photos,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
      },
      uploadConfig: {
        maxFileSize: "25MB",
        allowedTypes: ["JPEG", "PNG", "WebP", "HEIC", "HEIF"],
        maxFilesPerBatch: 100,
        bucketName: BUCKET_NAME,
        runtime: "nodejs",
      },
      expectedFields: {
        photos: "File[] (main field for multiple files)",
        files: "File[] (alternative field name)",
        images: "File[] (alternative field name)",
        photo: "File (single file field)",
        optimize: "boolean (optional, default: true)",
        maxDimension: "number (optional, default: 3000px)",
        quality: "number (optional, default: 0.85)",
      },
    });
  } catch (error) {
    logger.error("Failed to get upload endpoint info:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
