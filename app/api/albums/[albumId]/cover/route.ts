import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const setCoverPhotoSchema = z.object({
  photoId: z.string().min(1, "Photo ID is required"),
});

// PUT /api/albums/[albumId]/cover - Set cover photo for album
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = setCoverPhotoSchema.parse(body);

    // Check if album exists and belongs to user
    const album = await db.album.findFirst({
      where: {
        id: resolvedParams.albumId,
        userId: user.id,
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Check if photo exists and belongs to this album
    const photo = await db.albumPhoto.findFirst({
      where: {
        id: validatedData.photoId,
        albumId: resolvedParams.albumId,
      },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found in this album" },
        { status: 404 }
      );
    }

    // Update album cover photo
    const updatedAlbum = await db.album.update({
      where: { id: resolvedParams.albumId },
      data: { coverPhotoId: validatedData.photoId },
      include: {
        coverPhoto: true,
        _count: {
          select: {
            photos: true,
            favorites: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updatedAlbum,
      tags: updatedAlbum.tags
        ? updatedAlbum.tags.split(",").filter(Boolean)
        : [],
      photosCount: updatedAlbum._count.photos,
      favoritesCount: updatedAlbum._count.favorites,
      coverPhotoUrl: updatedAlbum.coverPhoto?.url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    logger.error("Error setting cover photo:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/albums/[albumId]/cover - Remove cover photo from album
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const resolvedParams = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if album exists and belongs to user
    const album = await db.album.findFirst({
      where: {
        id: resolvedParams.albumId,
        userId: user.id,
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Remove cover photo
    const updatedAlbum = await db.album.update({
      where: { id: resolvedParams.albumId },
      data: { coverPhotoId: null },
      include: {
        _count: {
          select: {
            photos: true,
            favorites: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updatedAlbum,
      tags: updatedAlbum.tags
        ? updatedAlbum.tags.split(",").filter(Boolean)
        : [],
      photosCount: updatedAlbum._count.photos,
      favoritesCount: updatedAlbum._count.favorites,
      coverPhotoUrl: null,
    });
  } catch (error) {
    logger.error("Error removing cover photo:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
