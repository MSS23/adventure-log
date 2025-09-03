import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Validation schema
const savePhotosRequestSchema = z.object({
  photos: z.array(
    z.object({
      url: z.string().url(),
      caption: z.string().optional(),
      metadata: z.string().optional(),
    })
  ),
});

/**
 * POST /api/albums/[albumId]/photos/save
 *
 * Save client-side uploaded photos to the database.
 * Used after successful client-side Supabase storage upload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`[${requestId}] Save photos to database started`, {
    albumId: params.albumId,
  });

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized save attempt`);
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.error(`[${requestId}] Failed to parse request body:`, error);
      return NextResponse.json(
        {
          error: "Invalid JSON format",
          code: "INVALID_JSON",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate request
    let validatedData;
    try {
      validatedData = savePhotosRequestSchema.parse(body);
    } catch (error) {
      logger.error(`[${requestId}] Request validation failed:`, error);
      return NextResponse.json(
        {
          error: "Invalid request format",
          code: "INVALID_REQUEST",
          requestId,
          details:
            error instanceof z.ZodError
              ? error.issues
              : "Unknown validation error",
        },
        { status: 400 }
      );
    }

    if (validatedData.photos.length === 0) {
      return NextResponse.json(
        {
          error: "No photos provided",
          code: "NO_PHOTOS",
          requestId,
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

    // Save photos to database
    const savedPhotos: Array<{
      id: string;
      url: string;
      caption?: string | null;
      metadata?: string | null;
      createdAt: Date;
    }> = [];
    const errors: string[] = [];

    for (const photoData of validatedData.photos) {
      try {
        const albumPhoto = await db.albumPhoto.create({
          data: {
            url: photoData.url,
            albumId: albumId,
            caption: photoData.caption || null,
            metadata: photoData.metadata || null,
          },
        });

        savedPhotos.push({
          id: albumPhoto.id,
          url: albumPhoto.url,
          caption: albumPhoto.caption,
          metadata: albumPhoto.metadata,
          createdAt: albumPhoto.createdAt,
        });

        logger.info(`[${requestId}] Photo saved to database`, {
          photoId: albumPhoto.id,
          url: photoData.url,
        });
      } catch (error) {
        logger.error(`[${requestId}] Failed to save photo:`, {
          url: photoData.url,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        errors.push(
          `Failed to save photo ${photoData.url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Update album stats and user stats if we have successful saves
    if (savedPhotos.length > 0) {
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
              increment: savedPhotos.length,
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
              photosCount: savedPhotos.length,
              photoIds: savedPhotos.map((photo) => photo.id),
              uploadMethod: "client-side",
              requestId,
            }),
          },
        });
      });
    }

    const totalTime = Date.now() - startTime;

    logger.info(`[${requestId}] Save photos completed`, {
      successful: savedPhotos.length,
      failed: errors.length,
      totalTime,
    });

    const isSuccess = savedPhotos.length > 0;
    const statusCode = isSuccess ? 200 : 400;

    return NextResponse.json(
      {
        success: isSuccess,
        requestId,
        results: {
          saved: savedPhotos,
          errors,
          summary: {
            totalPhotos: validatedData.photos.length,
            successfulSaves: savedPhotos.length,
            failedSaves: errors.length,
            processingTimeMs: totalTime,
          },
        },
        message: isSuccess
          ? `${savedPhotos.length} photo${savedPhotos.length === 1 ? "" : "s"} saved successfully${
              errors.length > 0 ? ` (${errors.length} failed)` : ""
            }`
          : `All saves failed (${errors.length} errors)`,
      },
      { status: statusCode }
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    logger.error(`[${requestId}] Unexpected save error:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalTime,
    });

    return NextResponse.json(
      {
        error: "Internal server error during save",
        code: "INTERNAL_ERROR",
        requestId,
        message: errorMessage,
        processingTime: totalTime,
      },
      { status: 500 }
    );
  }
}
