import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase";
import { clientEnv } from "@/src/env";

const updatePhotoSchema = z.object({
  caption: z.string().optional(),
});

// PUT /api/photos/[id] - Update photo caption
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePhotoSchema.parse(body);

    // Check if photo exists and belongs to user's album
    const albumPhoto = await db.albumPhoto.findFirst({
      where: {
        id: resolvedParams.id,
        album: {
          userId: session.user.id,
        },
      },
    });

    if (!albumPhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Update the album photo
    const updatedPhoto = await db.albumPhoto.update({
      where: { id: resolvedParams.id },
      data: {
        caption: validatedData.caption,
      },
    });
    return NextResponse.json(updatedPhoto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    logger.error("Error updating photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] - Delete photo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if photo exists and belongs to user's album
    const albumPhoto = await db.albumPhoto.findFirst({
      where: {
        id: resolvedParams.id,
        album: {
          userId: session.user.id,
        },
      },
      include: {
        album: true,
      },
    });

    if (!albumPhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Extract file path from URL for Supabase deletion
    const urlParts = albumPhoto.url.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const albumId = albumPhoto.albumId;
    const filePath = `albums/${albumId}/${fileName}`;

    // Delete from Supabase storage
    const bucketName = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;
    if (!bucketName) {
      logger.error(
        "NEXT_PUBLIC_SUPABASE_BUCKET environment variable is not configured"
      );
      return NextResponse.json(
        { error: "Storage configuration error - bucket name not configured" },
        { status: 500 }
      );
    }

    try {
      const { error: storageError } = await supabaseAdmin.storage
        .from(bucketName)
        .remove([filePath]);

      if (storageError) {
        logger.warn("Failed to delete file from storage:", {
          error: storageError,
          bucketName,
          filePath,
          photoId: resolvedParams.id,
          albumId,
        });
        // Continue with database deletion even if storage deletion fails
      }
    } catch (storageError) {
      logger.warn("Error deleting from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // If this is the cover photo, clear the album's cover photo
    if (albumPhoto.album.coverPhotoId === albumPhoto.id) {
      await db.album.update({
        where: { id: albumId },
        data: { coverPhotoId: null },
      });
    }

    // Delete the photo from database
    await db.albumPhoto.delete({
      where: { id: resolvedParams.id },
    });

    // Update user photo count
    await db.user.update({
      where: { id: session.user.id },
      data: {
        totalPhotosCount: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({
      message: "Photo deleted successfully",
      wasCoverPhoto: albumPhoto.album.coverPhotoId === albumPhoto.id,
    });
  } catch (error) {
    logger.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
