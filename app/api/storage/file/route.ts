import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { ZodIssue } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  deleteFile,
  validatePhotoPath,
  STORAGE_BUCKET,
} from "@/lib/supabaseAdmin";

// Ensure Node.js runtime for server-side operations
export const runtime = "nodejs";

// Request body validation schema
const deleteRequestSchema = z.object({
  path: z.string().min(1, "File path is required"),
  albumId: z.string().min(1, "Album ID is required"),
});

/**
 * DELETE /api/storage/file
 *
 * Secure server-side file deletion with comprehensive security checks.
 * This endpoint:
 * 1. Verifies NextAuth session
 * 2. Validates request body and file path format
 * 3. Confirms album ownership and file path ownership
 * 4. Deletes file from Supabase Storage
 * 5. Updates database records if necessary
 * 6. Returns success/error status
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`[${requestId}] File deletion request started`, {
    url: request.url,
    userAgent: request.headers.get("user-agent"),
  });

  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized file deletion attempt`);
      return NextResponse.json(
        {
          error: "Authentication required", { code: "AUTH_REQUIRED",
          requestId,
        },
        { status: 401 } });
    }

    const userId = session.user.id;

    // 2. Parse and validate request body
    let body: z.infer<typeof deleteRequestSchema>;
    try {
      const rawBody = await request.json();
      body = deleteRequestSchema.parse(rawBody);

      logger.info(`[${requestId}] Request validated`, {
        path: body.path,
        albumId: body.albumId,
        userId,
      });
    } catch (error) {
      logger.error(`[${requestId}] Invalid request body:`, { error: error });
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_REQUEST",
          requestId,
          details:
            error instanceof z.ZodError
              ? error.issues
                  .map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`)
                  .join(", ")
              : "Failed to parse request body",
        },
        { status: 400 }
      );
    }

    const { path, albumId } = body;

    // 3. Validate file path format and ownership
    if (!validatePhotoPath(path, albumId, userId)) {
      logger.warn(`[${requestId}] Invalid file path or ownership`, {
        path,
        albumId,
        userId,
        expectedPrefix: `albums/${albumId}/${userId}/`,
      });
      return NextResponse.json(
        {
          error: "Invalid file path or access denied",
          code: "INVALID_PATH",
          requestId,
          details: `File path must start with albums/${albumId}/${userId}/`,
        },
        { status: 403 }
      );
    }

    // 4. Verify album ownership and existence
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId: userId,
        deletedAt: null,
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

    logger.info(`[${requestId}] Album ownership verified`, {
      albumTitle: album.title,
      existingPhotos: album._count.photos,
    });

    // 5. Extract filename from path for logging
    const filename = path.split("/").pop() || "unknown";

    logger.info(`[${requestId}] Attempting to delete file`, {
      filename,
      path,
      bucket: STORAGE_BUCKET,
    });

    // 6. Delete file from Supabase Storage
    const { error: deletionError } = await deleteFile(path);

    if (deletionError) {
      // Check if file doesn't exist (404) - this might be ok
      if (
        deletionError.message?.includes("Object not found") ||
        deletionError.message?.includes("404")
      ) {
        logger.warn(
          `[${requestId}] File not found in storage (already deleted?)`,
          {
            path,
            error: deletionError.message,
          }
        );

        // Still return success since the desired end state is achieved
        return NextResponse.json(
          {
            success: true,
            requestId,
            message:
              "File not found in storage (may have been already deleted)",
            path,
            filename,
            warning: "File was not found in storage",
          },
          { status: 200 }
        );
      }

      logger.error(`[${requestId}] Failed to delete file from storage:`, { error: deletionError });
      return NextResponse.json(
        {
          error: "Failed to delete file",
          code: "DELETE_FAILED",
          requestId,
          details: deletionError.message || "Unknown storage error",
          path,
        },
        { status: 500 }
      );
    }

    logger.info(`[${requestId}] File deleted successfully from storage`, {
      path,
      filename,
    });

    // 7. Clean up database records if they exist
    // Note: In the current schema, files might be tracked in AlbumPhoto table
    try {
      // Find and soft-delete any matching AlbumPhoto records
      const deletedPhotos = await db.albumPhoto.updateMany({
        where: {
          albumId: albumId,
          // Note: The current schema might store URL instead of path
          // We'll try to match by URL containing the filename
          url: {
            contains: filename,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (deletedPhotos.count > 0) {
        logger.info(
          `[${requestId}] Soft-deleted ${deletedPhotos.count} database record(s)`,
          {
            filename,
          }
        );

        // Update user photo count
        await db.user.update({
          where: { id: userId },
          data: {
            totalPhotosCount: {
              decrement: deletedPhotos.count,
            },
          },
        });

        // Create activity record
        await db.activity.create({
          data: {
            userId: userId,
            type: "PHOTO_UPLOADED", // We might want a PHOTO_DELETED type
            targetType: "Album",
            targetId: albumId,
            metadata: JSON.stringify({
              action: "delete",
              albumTitle: album.title,
              filename,
              path,
              deletedCount: deletedPhotos.count,
              requestId,
            }),
          },
        });
      }
    } catch (dbError) {
      logger.warn(`[${requestId}] Database cleanup failed (non-critical):`, { error: dbError });
      // Don't fail the request for database issues since the file is already deleted
    }

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        requestId,
        message: `File deleted successfully`,
        path,
        filename,
        bucket: STORAGE_BUCKET,
        albumId,
        deletedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    logger.error(`[${requestId}] Unexpected error in file deletion:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/storage/file
 *
 * Get information about the file deletion endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/storage/file",
    method: "DELETE",
    description: "Secure server-side file deletion with ownership validation",
    requiredFields: {
      path: "string - Full storage path of the file to delete",
      albumId: "string - ID of the album containing the file",
    },
    pathValidation: {
      format: "albums/{albumId}/{userId}/{filename}",
      description:
        "Path must match the expected format and belong to the authenticated user",
    },
    authentication: "NextAuth session required",
    security: [
      "Validates session and album ownership",
      "Checks file path belongs to authenticated user",
      "Prevents deletion of files not owned by user",
      "Updates database records and user statistics",
    ],
    behavior: {
      fileNotFound: "Returns success if file doesn't exist (idempotent)",
      databaseCleanup: "Soft-deletes related database records",
      activityLog: "Creates activity record for audit trail",
    },
  });
}
