import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { slugify } from "@/lib/utils";
import {
  STORAGE_BUCKET,
  generateSecurePhotoPath,
  createSignedUploadUrl,
} from "@/lib/supabaseAdmin";

// Ensure Node.js runtime for proper server-side operations
export const runtime = "nodejs";

// Request validation schema
const uploadRequestSchema = z.object({
  albumId: z.string().min(1, "Album ID is required"),
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().min(1, "Content type is required"),
});

// Allowed file types for uploads
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * POST /api/storage/signed-upload
 *
 * Generate signed upload URLs for direct client-side uploads to Supabase Storage.
 * This endpoint:
 * 1. Verifies NextAuth session
 * 2. Validates request body and file constraints
 * 3. Confirms album ownership
 * 4. Generates secure file path
 * 5. Creates signed upload URL with 2-hour expiry
 * 6. Returns bucket, path, and token for client upload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = `signed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`[${requestId}] Signed upload request started`, {
    url: request.url,
    userAgent: request.headers.get("user-agent"),
  });

  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized signed upload attempt`);
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

    // 2. Parse and validate request body
    let body: z.infer<typeof uploadRequestSchema>;
    try {
      const rawBody = await request.json();
      body = uploadRequestSchema.parse(rawBody);

      logger.info(`[${requestId}] Request validated`, {
        albumId: body.albumId,
        filename: body.filename,
        contentType: body.contentType,
        userId,
      });
    } catch (error) {
      logger.error(`[${requestId}] Invalid request body:`, error);
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_REQUEST",
          requestId,
          details:
            error instanceof z.ZodError
              ? error.issues
                  .map((e: any) => `${e.path.join(".")}: ${e.message}`)
                  .join(", ")
              : "Failed to parse request body",
        },
        { status: 400 }
      );
    }

    const { albumId, filename, contentType } = body;

    // 3. Validate file constraints
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          code: "INVALID_FILE_TYPE",
          requestId,
          allowedTypes: ALLOWED_MIME_TYPES,
        },
        { status: 400 }
      );
    }

    // Note: File size validation happens client-side since we don't have the actual file here
    // The signed URL itself can have size constraints, but we'll validate on the client

    // 4. Verify album ownership and existence
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId: userId,
        deletedAt: null, // Ensure album isn't soft-deleted
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

    logger.info(`[${requestId}] Album ownership verified`, {
      albumTitle: album.title,
    });

    // 5. Generate secure file path
    const safeName = slugify(
      filename.substring(0, filename.lastIndexOf(".")) || filename
    );
    const fileExtension = filename.split(".").pop()?.toLowerCase() || "jpg";
    const secureFilename = `${safeName}.${fileExtension}`;
    const storagePath = generateSecurePhotoPath(
      albumId,
      userId,
      secureFilename
    );

    logger.info(`[${requestId}] Generated secure path`, {
      originalFilename: filename,
      secureFilename,
      storagePath,
    });

    // 6. Create signed upload URL
    const { data: signedUploadData, error: signedUploadError } =
      await createSignedUploadUrl(storagePath, {
        expiresIn: 7200, // 2 hours
        contentType: contentType,
      });

    if (signedUploadError || !signedUploadData) {
      logger.error(
        `[${requestId}] Failed to create signed upload URL:`,
        signedUploadError
      );
      return NextResponse.json(
        {
          error: "Failed to create upload URL",
          code: "UPLOAD_URL_FAILED",
          requestId,
          details: signedUploadError?.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    logger.info(`[${requestId}] Signed upload URL created successfully`, {
      path: storagePath,
      expiresIn: "2 hours",
    });

    // 7. Return upload data for client
    return NextResponse.json(
      {
        success: true,
        requestId,
        upload: {
          bucket: STORAGE_BUCKET,
          path: storagePath,
          token: signedUploadData.token,
          signedUrl: signedUploadData.signedUrl,
        },
        metadata: {
          albumId,
          originalFilename: filename,
          secureFilename,
          contentType,
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(), // 2 hours from now
          maxFileSizeBytes: MAX_FILE_SIZE,
        },
        message: "Signed upload URL generated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    logger.error(`[${requestId}] Unexpected error in signed upload:`, {
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
 * GET /api/storage/signed-upload
 *
 * Get information about the signed upload endpoint and constraints
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/storage/signed-upload",
    method: "POST",
    description: "Generate signed upload URLs for direct client uploads",
    constraints: {
      maxFileSizeBytes: MAX_FILE_SIZE,
      maxFileSizeMB: Math.round(MAX_FILE_SIZE / 1024 / 1024),
      allowedMimeTypes: ALLOWED_MIME_TYPES,
      signedUrlExpirySeconds: 7200, // 2 hours
    },
    requiredFields: {
      albumId: "string - ID of the album to upload to",
      filename: "string - Original filename with extension",
      contentType: "string - MIME type of the file",
    },
    authentication: "NextAuth session required",
    pathFormat: "albums/{albumId}/{userId}/{timestamp}-{safeName}.{ext}",
    usage: {
      step1: "POST to this endpoint with album ID, filename, and content type",
      step2:
        "Use returned signedUrl and token to upload file directly to Supabase",
      step3: "File will be stored at the returned path with public access",
    },
  });
}
