import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  listAlbumFiles,
  getUserStorageUsage,
  STORAGE_BUCKET,
} from "@/lib/supabaseAdmin";

// Ensure Node.js runtime for server-side operations
export const runtime = "nodejs";

// Query parameters validation schema
const photosQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sortBy: z
    .enum(["created_at", "name", "updated_at"])
    .optional()
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  includeUsage: z.coerce.boolean().optional().default(false),
});

interface PhotoListItem {
  path: string;
  publicUrl: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * GET /api/albums/[albumId]/photos
 *
 * Server-side photo listing for an album with comprehensive metadata.
 * This replaces client-side Supabase storage operations with secure server-side listing.
 *
 * Features:
 * - Authentication and album ownership verification
 * - Pagination support (limit/offset)
 * - Sorting options (date, name, size)
 * - Public URL generation for display
 * - Optional storage usage statistics
 * - Proper error handling and logging
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
): Promise<NextResponse> {
  const requestId = `photos_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { albumId } = params;

  logger.info(`[${requestId}] Album photos list request`, {
    albumId,
    url: request.url,
  });

  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized photos list attempt`);
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

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = photosQuerySchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      includeUsage: searchParams.get("includeUsage"),
    });

    if (!queryResult.success) {
      logger.error(
        `[${requestId}] Invalid query parameters:`,
        queryResult.error
      );
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "INVALID_QUERY",
          requestId,
          details: queryResult.error.issues
            .map((e: any) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    const { limit, offset, sortBy, sortOrder, includeUsage } = queryResult.data;

    logger.info(`[${requestId}] Query parameters validated`, {
      limit,
      offset,
      sortBy,
      sortOrder,
      includeUsage,
    });

    // 3. Verify album ownership and existence
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        privacy: true,
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
      dbPhotoCount: album._count.photos,
    });

    // 4. List files from Supabase Storage
    const { data: storageFiles, error: storageError } = await listAlbumFiles(
      albumId,
      userId,
      {
        limit: limit + 1, // Fetch one extra to check for more results
        offset,
        sortBy: { column: sortBy, order: sortOrder },
      }
    );

    if (storageError || !storageFiles) {
      logger.error(
        `[${requestId}] Failed to list storage files:`,
        storageError
      );
      return NextResponse.json(
        {
          error: "Failed to retrieve photos",
          code: "STORAGE_LIST_FAILED",
          requestId,
          details: storageError?.message || "Unknown storage error",
        },
        { status: 500 }
      );
    }

    // 5. Process results and check for pagination
    const hasMore = storageFiles.length > limit;
    const photos: PhotoListItem[] = storageFiles
      .slice(0, limit)
      .map((file) => ({
        path: file.fullPath,
        publicUrl: file.publicUrl,
        name: file.name || "Unknown",
        sizeBytes: file.metadata?.size || 0,
        createdAt: file.created_at || new Date().toISOString(),
        updatedAt: file.updated_at,
        metadata: file.metadata
          ? {
              lastModified: file.metadata.lastModified,
              cacheControl: file.metadata.cacheControl,
              contentLength: file.metadata.contentLength,
              httpStatusCode: file.metadata.httpStatusCode,
              mimetype: file.metadata.mimetype,
            }
          : undefined,
      }));

    logger.info(`[${requestId}] Photos processed`, {
      totalFound: storageFiles.length,
      returned: photos.length,
      hasMore,
      totalSize: photos.reduce((acc, photo) => acc + photo.sizeBytes, 0),
    });

    // 6. Get storage usage if requested
    let usage = null;
    if (includeUsage) {
      const { data: usageData, error: usageError } =
        await getUserStorageUsage(userId);
      if (usageData) {
        usage = usageData;
        logger.info(`[${requestId}] Storage usage included`, usage);
      } else if (usageError) {
        logger.warn(`[${requestId}] Failed to get storage usage:`, usageError);
      }
    }

    // 7. Return comprehensive response
    return NextResponse.json(
      {
        success: true,
        requestId,
        album: {
          id: album.id,
          title: album.title,
          description: album.description,
          privacy: album.privacy,
          createdAt: album.createdAt,
          updatedAt: album.updatedAt,
          photoCount: album._count.photos,
        },
        photos,
        pagination: {
          limit,
          offset,
          hasMore,
          total: photos.length + (hasMore ? 1 : 0), // Approximate total
          nextOffset: hasMore ? offset + limit : null,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
        ...(usage && { usage }),
        summary: {
          photosInStorage: storageFiles.length - (hasMore ? 1 : 0),
          photosReturned: photos.length,
          totalSizeBytes: photos.reduce(
            (acc, photo) => acc + photo.sizeBytes,
            0
          ),
          bucket: STORAGE_BUCKET,
          pathPrefix: `albums/${albumId}/${userId}/`,
        },
        message: `Retrieved ${photos.length} photo${photos.length === 1 ? "" : "s"}`,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    logger.error(`[${requestId}] Unexpected error in photos listing:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      albumId,
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
 * OPTIONS /api/albums/[albumId]/photos
 *
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
