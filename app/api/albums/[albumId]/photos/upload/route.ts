import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAndAwardBadges } from "@/lib/badges";
import {
  validateFile,
  BUCKET_NAME,
  type UploadedPhoto,
} from "@/lib/storage-simple";

// Ensure Node.js runtime for proper FormData handling
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for batch uploads

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

  try {
    // Simple authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { albumId } = params;

    // Parse form data
    const formData = await request.formData();
    const files: File[] = [];

    // Extract files from various field names
    const fileFields = ["photos", "files", "images", "photo"];
    for (const fieldName of fileFields) {
      const fieldFiles = formData.getAll(fieldName) as File[];
      files.push(...fieldFiles.filter((f) => f instanceof File && f.size > 0));
    }

    // Validate files
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
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
        { error: "No valid files to upload", validationErrors },
        { status: 400 }
      );
    }

    // Verify album ownership
    const album = await db.album.findFirst({
      where: { id: albumId, userId },
      select: { id: true, title: true },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found or access denied" },
        { status: 404 }
      );
    }

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
          try {
            // Generate secure path: albums/{albumId}/{userId}/{timestamp}-{filename}
            const timestamp = Date.now();
            const safeName = file.name
              .replace(/[^a-zA-Z0-9.-]/g, "-")
              .replace(/-+/g, "-");
            const storagePath = `albums/${albumId}/${userId}/${timestamp}-${safeName}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabaseAdmin.storage
              .from(BUCKET_NAME)
              .upload(storagePath, file, {
                cacheControl: "31536000", // 1 year
                contentType: file.type,
                upsert: false,
              });

            if (uploadError) {
              throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            // Generate public URL
            const { data } = supabaseAdmin.storage
              .from(BUCKET_NAME)
              .getPublicUrl(storagePath);
            const publicUrl = data.publicUrl;

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
                }),
              },
            });

            successful.push({
              path: storagePath,
              publicUrl,
              sizeBytes: file.size,
              mimeType: file.type,
              createdAt: albumPhoto.createdAt.toISOString(),
              originalName: file.name,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown upload error";
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

    // Update user stats and create activity if we have successful uploads
    if (successful.length > 0) {
      await db.$transaction(async (tx) => {
        // Update album timestamp
        await tx.album.update({
          where: { id: albumId },
          data: { updatedAt: new Date() },
        });

        // Update user photo count
        await tx.user.update({
          where: { id: userId },
          data: { totalPhotosCount: { increment: successful.length } },
        });

        // Create activity record
        await tx.activity.create({
          data: {
            userId,
            type: "PHOTO_UPLOADED",
            targetType: "Album",
            targetId: albumId,
            metadata: JSON.stringify({
              albumTitle: album.title,
              photosCount: successful.length,
            }),
          },
        });
      });

      // Award badges asynchronously
      checkAndAwardBadges({
        userId,
        triggerType: "PHOTO_UPLOADED",
        metadata: { albumId, photosCount: successful.length },
      }).catch(() => {
        // Silently ignore badge errors
      });
    }

    const totalTime = Date.now() - startTime;
    const isSuccess = successful.length > 0;

    return NextResponse.json(
      {
        success: isSuccess,
        results: {
          successful,
          failed,
          summary: {
            totalFiles: files.length,
            successfulUploads: successful.length,
            failedUploads: failed.length,
            processingTimeMs: totalTime,
          },
        },
        message: isSuccess
          ? `${successful.length} photo${successful.length === 1 ? "" : "s"} uploaded successfully${
              failed.length > 0 ? ` (${failed.length} failed)` : ""
            }`
          : "All uploads failed",
      },
      { status: isSuccess ? 200 : 400 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { error: "Internal server error during upload", message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/albums/[albumId]/photos/upload
 *
 * Get basic upload endpoint information
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
  const userId = session.user.id;

  const album = await db.album.findFirst({
    where: { id: albumId, userId },
    select: { id: true, title: true, _count: { select: { photos: true } } },
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
      photoCount: album._count.photos,
    },
    supportedFields: ["photos", "files", "images", "photo"],
  });
}
