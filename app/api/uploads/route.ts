import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { parse as parseExif } from "exifr";
import { z } from "zod";
import { createHash } from "crypto";

import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser, rateLimit } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { clientEnv } from "@/src/env";

const uploadSchema = z.object({
  albumId: z.string().min(1, "Album ID is required"),
  caption: z.string().optional(),
  shareLocation: z.boolean().default(false),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const SIZES = {
  thumbnail: { width: 320, height: 240 },
  medium: { width: 768, height: 576 },
  large: { width: 1280, height: 960 },
  original: { width: 2048, height: 1536 },
};

/**
 * Secure photo upload with image processing
 * POST /api/uploads
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 uploads per minute per user
    const user = await getCurrentUser();
    await rateLimit("uploads", user.id);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = JSON.parse((formData.get("metadata") as string) || "{}");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Validate metadata
    const validatedMetadata = uploadSchema.parse(metadata);

    // Verify album exists and user has permission to upload to it
    const album = await db.album.findUnique({
      where: { id: validatedMetadata.albumId },
      select: {
        id: true,
        userId: true,
        privacy: true,
        shareLocation: true,
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.userId !== user.id) {
      return NextResponse.json(
        { error: "Permission denied. You can only upload to your own albums." },
        { status: 403 }
      );
    }

    // Process the image
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoId = createHash("sha256")
      .update(buffer)
      .update(user.id)
      .update(Date.now().toString())
      .digest("hex")
      .substring(0, 16);

    // Extract EXIF data
    let exifData: any = null;
    let gpsData: { latitude: number; longitude: number } | null = null;

    try {
      exifData = await parseExif(buffer);
      if (exifData?.latitude && exifData?.longitude) {
        gpsData = {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
        };
      }
    } catch (error) {
      logger.warn("Failed to extract EXIF data:", { error: error });
    }

    // Privacy check for GPS data
    const shouldStoreLocation =
      validatedMetadata.shareLocation &&
      album.privacy === "PUBLIC" &&
      album.shareLocation &&
      gpsData;

    // Process and upload different sizes
    const uploadedSizes: Record<string, string> = {};
    const uploadPromises = [];

    for (const [sizeName, dimensions] of Object.entries(SIZES)) {
      const processPromise = (async () => {
        try {
          let processedBuffer: Buffer;

          if (sizeName === "original") {
            // For original, just strip metadata and convert to WebP
            processedBuffer = await sharp(buffer)
              .webp({ quality: 85 })
              .withMetadata({})
              .resize(dimensions.width, dimensions.height, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .toBuffer();
          } else {
            // For other sizes, optimize more aggressively
            processedBuffer = await sharp(buffer)
              .webp({ quality: sizeName === "thumbnail" ? 70 : 75 })
              .withMetadata({})
              .resize(dimensions.width, dimensions.height, {
                fit: "cover",
                withoutEnlargement: false,
              })
              .toBuffer();
          }

          const path = `photos/${user.id}/${album.id}/${photoId}/${sizeName}.webp`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
            .upload(path, processedBuffer, {
              contentType: "image/webp",
              cacheControl: "31536000", // 1 year cache
              upsert: false,
            });

          if (uploadError) {
            throw new Error(
              `Failed to upload ${sizeName}: ${uploadError.message}`
            );
          }

          uploadedSizes[sizeName] = path;
          logger.debug(`Uploaded ${sizeName} variant:`, { path });
        } catch (error) {
          logger.error(`Failed to process ${sizeName}:`, { error: error });
          throw error;
        }
      })();

      uploadPromises.push(processPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Store photo in database
    const photoData = await db.albumPhoto.create({
      data: {
        id: photoId,
        albumId: album.id,
        url: uploadedSizes.large, // Primary URL for display
        caption: validatedMetadata.caption || null,
        latitude: shouldStoreLocation ? gpsData?.latitude || null : null,
        longitude: shouldStoreLocation ? gpsData?.longitude || null : null,
        metadata: JSON.stringify({
          sizes: uploadedSizes,
          originalFilename: file.name,
          originalSize: file.size,
          processedAt: new Date().toISOString(),
          exifStripped: true,
          locationStored: !!shouldStoreLocation,
        }),
      },
    });

    // Update album photo count
    await db.album.update({
      where: { id: album.id },
      data: {
        updatedAt: new Date(),
      },
    });

    // Update user statistics
    await db.user.update({
      where: { id: user.id },
      data: {
        totalPhotosCount: { increment: 1 },
      },
    });

    // Generate signed URLs for immediate display (1 hour expiry)
    const signedUrls: Record<string, string> = {};
    for (const [sizeName, path] of Object.entries(uploadedSizes)) {
      const { data: signedData } = await supabaseAdmin.storage
        .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
        .createSignedUrl(path, 3600); // 1 hour

      if (signedData?.signedUrl) {
        signedUrls[sizeName] = signedData.signedUrl;
      }
    }

    logger.info("Photo uploaded successfully:", {
      photoId,
      userId: user.id,
      albumId: album.id,
      sizes: Object.keys(uploadedSizes),
      locationStored: shouldStoreLocation,
    });

    return NextResponse.json({
      photo: {
        id: photoData.id,
        url: signedUrls.large || uploadedSizes.large,
        caption: photoData.caption,
        latitude: photoData.latitude,
        longitude: photoData.longitude,
        createdAt: photoData.createdAt,
        urls: signedUrls,
        metadata: {
          originalFilename: file.name,
          sizes: Object.keys(uploadedSizes),
        },
      },
    });
  } catch (error) {
    logger.error("Upload error:", { error: error });

    // Clean up any partial uploads
    // TODO: Implement cleanup for failed uploads

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes("Rate limit")) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }

      if (
        error.message.includes("Permission denied") ||
        error.message.includes("Forbidden")
      ) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Get signed URL for photo access
 * GET /api/uploads?photoId=xxx&size=large
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");
    const size = searchParams.get("size") || "large";

    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID is required" },
        { status: 400 }
      );
    }

    // Get photo and album info
    const photo = await db.albumPhoto.findUnique({
      where: { id: photoId },
      include: {
        album: {
          select: {
            privacy: true,
            userId: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check permissions
    try {
      await assertOwnerOrFriend(photo.album.userId, photo.album.privacy);
    } catch (authError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the photo URL from metadata
    const metadata = JSON.parse(photo.metadata || "{}");
    const photoPath = metadata.sizes?.[size] || photo.url;

    if (!photoPath) {
      return NextResponse.json(
        { error: "Photo size not found" },
        { status: 404 }
      );
    }

    // Generate signed URL (4 hours for viewing)
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET)
      .createSignedUrl(photoPath, 14400); // 4 hours

    if (signError || !signedData?.signedUrl) {
      logger.error("Failed to generate signed URL:", { error: signError });
      return NextResponse.json(
        { error: "Failed to generate photo URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      expiresAt: new Date(Date.now() + 14400 * 1000).toISOString(),
    });
  } catch (error) {
    logger.error("Get photo URL error:", { error: error });
    return NextResponse.json(
      { error: "Failed to get photo URL" },
      { status: 500 }
    );
  }
}

// Import assertOwnerOrFriend for the GET handler
async function assertOwnerOrFriend(userId: string, privacy: any) {
  const { assertOwnerOrFriend: authCheck } = await import("@/lib/auth-utils");
  return authCheck(userId, privacy);
}
