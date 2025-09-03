import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";

import { authOptions } from "@/lib/auth";
import { checkAndAwardBadges } from "@/lib/badges";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase";
import { clientEnv } from "@/src/env";
import {
  moderateImage,
  requiresReview,
  logModerationAction,
} from "@/lib/moderation";

// POST /api/photos/upload - Upload photos to an album
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = uuidv4().substring(0, 8);

  logger.info(`[${requestId}] Upload request started`);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Upload attempt without valid session`);
      return NextResponse.json(
        {
          error: "Unauthorized - Please sign in to upload photos",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    logger.info(
      `[${requestId}] User ${session.user.id} (${session.user.email}) uploading photos`
    );

    // Validate Supabase configuration
    const bucketName = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;
    if (!bucketName) {
      logger.error(
        `[${requestId}] NEXT_PUBLIC_SUPABASE_BUCKET environment variable is not configured`
      );
      return NextResponse.json(
        {
          error: "Storage configuration error - bucket name not configured",
          code: "CONFIG_ERROR",
          details: "NEXT_PUBLIC_SUPABASE_BUCKET environment variable missing",
        },
        { status: 500 }
      );
    }

    logger.info(`[${requestId}] Using Supabase bucket: ${bucketName}`);

    // Parse form data with error handling
    let formData: FormData;
    let albumId: string;
    let files: File[];

    try {
      formData = await request.formData();
      albumId = formData.get("albumId") as string;
      files = formData.getAll("photos") as File[];
    } catch (error) {
      logger.error(`[${requestId}] Failed to parse form data:`, error);
      return NextResponse.json(
        {
          error:
            "Invalid form data - ensure you're sending multipart/form-data",
          code: "FORM_DATA_ERROR",
        },
        { status: 400 }
      );
    }

    if (!albumId) {
      logger.warn(`[${requestId}] Missing album ID in request`);
      return NextResponse.json(
        {
          error: "Album ID is required",
          code: "MISSING_ALBUM_ID",
        },
        { status: 400 }
      );
    }

    if (!files.length) {
      logger.warn(`[${requestId}] No files provided in request`);
      return NextResponse.json(
        {
          error: "No photos provided - please select at least one image file",
          code: "NO_FILES",
        },
        { status: 400 }
      );
    }

    logger.info(
      `[${requestId}] Processing ${files.length} files for album ${albumId}`
    );

    // Verify album exists and belongs to user
    let album;
    try {
      album = await db.album.findFirst({
        where: {
          id: albumId,
          userId: session.user.id,
        },
        select: {
          id: true,
          title: true,
          userId: true,
          coverPhotoId: true,
        },
      });
    } catch (error) {
      logger.error(`[${requestId}] Database error when fetching album:`, error);
      return NextResponse.json(
        {
          error: "Database connection error - please try again",
          code: "DB_ERROR",
        },
        { status: 500 }
      );
    }

    if (!album) {
      logger.warn(
        `[${requestId}] Album ${albumId} not found or not owned by user ${session.user.id}`
      );
      return NextResponse.json(
        {
          error: "Album not found or you don't have permission to upload to it",
          code: "ALBUM_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    logger.info(
      `[${requestId}] Album verified: "${album.title}" (ID: ${albumId})`
    );

    const uploadedPhotos: any[] = [];
    const errors = [];

    // Process each file
    logger.info(`[${requestId}] Starting file processing loop...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `file-${i}-${file.name}`;

      logger.info(
        `[${requestId}] Processing ${fileId} (${file.size} bytes, type: ${file.type})`
      );

      // Validate file type
      const validImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
      ];
      if (!validImageTypes.includes(file.type.toLowerCase())) {
        const errorMsg = `File ${file.name} has unsupported type ${file.type}. Supported: JPEG, PNG, GIF, WebP, BMP`;
        logger.warn(`[${requestId}] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        const errorMsg = `File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size: 10MB`;
        logger.warn(`[${requestId}] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }

      // Validate file has content
      if (file.size === 0) {
        const errorMsg = `File ${file.name} is empty (0 bytes)`;
        logger.warn(`[${requestId}] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }

      try {
        // Generate unique filename with safety checks
        const fileExtension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExtension = [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "bmp",
        ].includes(fileExtension)
          ? fileExtension
          : "jpg";
        const fileName = `${uuidv4()}.${safeExtension}`;
        const filePath = `albums/${albumId}/${fileName}`;

        logger.info(`[${requestId}] Generated file path: ${filePath}`);

        // Convert file to array buffer with error handling
        let arrayBuffer: ArrayBuffer;
        try {
          arrayBuffer = await file.arrayBuffer();
          logger.info(
            `[${requestId}] File ${file.name} converted to array buffer (${arrayBuffer.byteLength} bytes)`
          );
        } catch (bufferError) {
          const errorMsg = `Failed to process file ${file.name}: File may be corrupted`;
          logger.error(
            `[${requestId}] Array buffer conversion failed:`,
            bufferError
          );
          errors.push(errorMsg);
          continue;
        }

        // Content moderation check (Phase 9.2 - Abuse filters)
        logger.info(
          `[${requestId}] Running content moderation for ${file.name}...`
        );
        const moderationResult = await moderateImage(Buffer.from(arrayBuffer));

        if (moderationResult.result === "BLOCKED") {
          const errorMsg = `File ${file.name} was blocked: ${moderationResult.reason || "Content policy violation"}`;
          logger.warn(`[${requestId}] ${errorMsg}`, { moderationResult });
          errors.push(errorMsg);

          // Log the blocked content
          await logModerationAction(
            session.user.id,
            "AlbumPhoto",
            `blocked-${uuidv4()}`,
            moderationResult,
            "rejected"
          );
          continue;
        }

        // Upload to Supabase with detailed error handling
        logger.info(
          `[${requestId}] Uploading ${file.name} to Supabase storage...`
        );
        const uploadStartTime = Date.now();

        const { error: uploadError } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false, // Don't overwrite existing files
          });

        const uploadDuration = Date.now() - uploadStartTime;
        logger.info(
          `[${requestId}] Supabase upload completed in ${uploadDuration}ms`
        );

        if (uploadError) {
          logger.error(
            `[${requestId}] Supabase upload error for ${file.name}:`,
            {
              error: uploadError.message,
              // Note: StorageError doesn't have statusCode property
              bucketName,
              filePath,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadDuration,
            }
          );

          // Provide user-friendly error messages based on error type
          let userError = `Failed to upload ${file.name}: `;
          if (uploadError.message?.includes("already exists")) {
            userError += "File already exists (this should not happen)";
          } else if (uploadError.message?.includes("access")) {
            userError +=
              "Storage permission error (check Supabase configuration)";
          } else if (uploadError.message?.includes("bucket")) {
            userError += "Storage bucket not found (check configuration)";
          } else {
            userError += uploadError.message || "Unknown storage error";
          }

          errors.push(userError);
          continue;
        }

        logger.info(
          `[${requestId}] Successfully uploaded ${file.name} to ${filePath}`
        );

        // Get public URL with error handling
        try {
          const {
            data: { publicUrl },
          } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

          if (!publicUrl) {
            throw new Error("Failed to generate public URL");
          }

          logger.info(`[${requestId}] Generated public URL: ${publicUrl}`);

          // Save to database with detailed error handling
          logger.info(
            `[${requestId}] Saving photo ${file.name} to database...`
          );

          const needsReview = requiresReview(moderationResult);

          const albumPhoto = await db.albumPhoto.create({
            data: {
              url: publicUrl,
              albumId,
              caption: (formData.get(`caption_${i}`) as string) || null,
              requiresReview: needsReview,
              metadata: JSON.stringify({
                originalName: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                filePath,
                moderationResult: {
                  result: moderationResult.result,
                  confidence: moderationResult.confidence,
                  categories: moderationResult.categories,
                },
              }),
            },
          });

          // Log moderation action
          await logModerationAction(
            session.user.id,
            "AlbumPhoto",
            albumPhoto.id,
            moderationResult,
            needsReview ? "flagged" : "approved"
          );

          logger.info(
            `[${requestId}] Successfully saved photo ${file.name} to database with ID ${albumPhoto.id}`
          );
          uploadedPhotos.push(albumPhoto);
        } catch (dbError) {
          logger.error(
            `[${requestId}] Database error while saving ${file.name}:`,
            dbError
          );

          // If database save fails, we should clean up the uploaded file
          try {
            await supabaseAdmin.storage.from(bucketName).remove([filePath]);
            logger.info(
              `[${requestId}] Cleaned up uploaded file ${filePath} after database error`
            );
          } catch (cleanupError) {
            logger.error(
              `[${requestId}] Failed to cleanup file ${filePath}:`,
              cleanupError
            );
          }

          errors.push(
            `Failed to save ${file.name} to database: ${dbError instanceof Error ? dbError.message : "Unknown database error"}`
          );
        }
      } catch (error) {
        logger.error(
          `[${requestId}] Unexpected error processing file ${file.name}:`,
          error
        );
        errors.push(
          `Failed to process ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    logger.info(
      `[${requestId}] File processing complete. ${uploadedPhotos.length} successful, ${errors.length} errors`
    );

    // Update album stats with optimized database operations
    if (uploadedPhotos.length > 0) {
      logger.info(
        `[${requestId}] Updating album stats for ${uploadedPhotos.length} photos...`
      );

      try {
        // Use a transaction to ensure data consistency
        await db.$transaction(
          async (tx) => {
            // Set cover photo if this is the first photo (optimized query)
            if (!album.coverPhotoId) {
              const existingPhotoCount = await tx.albumPhoto.count({
                where: { albumId },
              });

              // Only set cover if this is the first batch of photos
              if (existingPhotoCount === uploadedPhotos.length) {
                await tx.album.update({
                  where: { id: albumId },
                  data: {
                    coverPhotoId: uploadedPhotos[0].id,
                    updatedAt: new Date(), // Explicit timestamp update
                  },
                });
                logger.info(
                  `[${requestId}] Set cover photo for album ${albumId}: ${uploadedPhotos[0].id}`
                );
              }
            }

            // Update user stats (atomic increment)
            await tx.user.update({
              where: { id: session.user.id },
              data: {
                totalPhotosCount: {
                  increment: uploadedPhotos.length,
                },
                updatedAt: new Date(),
              },
            });

            // Create activity record (single insert instead of multiple)
            await tx.activity.create({
              data: {
                userId: session.user.id,
                type: "PHOTO_UPLOADED",
                targetType: "Album",
                targetId: albumId,
                metadata: JSON.stringify({
                  albumTitle: album.title,
                  photosCount: uploadedPhotos.length,
                  photoIds: uploadedPhotos.map((p) => p.id),
                  uploadRequestId: requestId,
                }),
              },
            });

            logger.info(
              `[${requestId}] Successfully updated album stats in transaction`
            );
          },
          {
            maxWait: 5000, // Maximum time to wait for a transaction slot (5s)
            timeout: 10000, // Maximum time the transaction can run (10s)
          }
        );

        // Check for badge achievements (async, don't wait)
        // Run this outside the transaction to avoid blocking the response
        setImmediate(() => {
          checkAndAwardBadges({
            userId: session.user.id,
            triggerType: "PHOTO_UPLOADED",
            metadata: {
              albumId,
              photosCount: uploadedPhotos.length,
              requestId,
            },
          }).catch((error) =>
            logger.error(`[${requestId}] Badge check failed:`, error)
          );
        });
      } catch (transactionError) {
        logger.error(
          `[${requestId}] Transaction failed for album stats update:`,
          transactionError
        );

        // Don't fail the upload if stats update fails - photos are already uploaded
        // Instead, try individual operations as fallback
        try {
          logger.info(`[${requestId}] Attempting fallback stats update...`);

          const userUpdate = db.user.update({
            where: { id: session.user.id },
            data: {
              totalPhotosCount: { increment: uploadedPhotos.length },
            },
          });

          const activityCreate = db.activity.create({
            data: {
              userId: session.user.id,
              type: "PHOTO_UPLOADED",
              targetType: "Album",
              targetId: albumId,
              metadata: JSON.stringify({
                albumTitle: album.title,
                photosCount: uploadedPhotos.length,
                fallbackUpdate: true,
              }),
            },
          });

          await Promise.allSettled([userUpdate, activityCreate]);
          logger.info(`[${requestId}] Fallback stats update completed`);
        } catch (fallbackError) {
          logger.error(
            `[${requestId}] Fallback stats update also failed:`,
            fallbackError
          );
          // Continue anyway - the photos are uploaded successfully
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    logger.info(
      `[${requestId}] Upload request completed in ${totalDuration}ms. ${uploadedPhotos.length} successful, ${errors.length} errors`
    );

    // Return detailed response
    return NextResponse.json(
      {
        success: uploadedPhotos.length > 0,
        uploadedPhotos,
        errors,
        message:
          uploadedPhotos.length > 0
            ? `${uploadedPhotos.length} photos uploaded successfully${errors.length > 0 ? ` (${errors.length} failed)` : ""}`
            : errors.length > 0
              ? `All ${errors.length} photos failed to upload`
              : "No photos were processed",
        meta: {
          requestId,
          totalFiles: files.length,
          successfulUploads: uploadedPhotos.length,
          failedUploads: errors.length,
          processingTime: totalDuration,
          albumId,
          userId: session.user.id,
        },
      },
      {
        status: uploadedPhotos.length > 0 ? 200 : 400,
      }
    );
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error(
      `[${requestId}] Unexpected error in upload API (${totalDuration}ms):`,
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error - please try again",
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Unknown server error",
        meta: {
          requestId,
          processingTime: totalDuration,
        },
      },
      { status: 500 }
    );
  }
}
