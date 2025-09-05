import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db, isDatabaseAvailable } from "@/lib/db";
import { logger } from "@/lib/logger";

const updateAlbumSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  country: z.string().min(1).optional(),
  city: z.string().optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]).optional(),
  tags: z.array(z.string()).max(10).optional(),
  date: z.string().datetime().optional(), // Trip date - when the visit actually occurred
});

// GET /api/albums/[albumId] - Get specific album
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const resolvedParams = await params;
  try {
    // Handle build-time scenario where db might not be available
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const album = await db.album.findFirst({
      where: {
        id: resolvedParams.albumId,
        OR: [
          { userId: session.user.id }, // User's own album
          { privacy: "PUBLIC" }, // Public albums
          {
            privacy: "FRIENDS_ONLY",
            user: {
              followers: {
                some: {
                  followerId: session.user.id,
                },
              },
            },
          }, // Friends-only albums where user follows the author
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        photos: {
          orderBy: {
            createdAt: "asc",
          },
        },
        coverPhoto: true,
        _count: {
          select: {
            photos: true,
            favorites: true,
          },
        },
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...album,
      tags: album.tags ? album.tags.split(",").filter(Boolean) : [],
      photosCount: album._count.photos,
      favoritesCount: album._count.favorites,
    });
  } catch (error) {
    logger.error("Error fetching album:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/albums/[albumId] - Update album
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const resolvedParams = await params;
  try {
    // Handle build-time scenario where db might not be available
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if album exists and belongs to user
    const existingAlbum = await db.album.findFirst({
      where: {
        id: resolvedParams.albumId,
        userId: session.user.id,
      },
    });

    if (!existingAlbum) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateAlbumSchema.parse(body);

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (validatedData.title !== undefined)
      updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.country !== undefined)
      updateData.country = validatedData.country;
    if (validatedData.city !== undefined) updateData.city = validatedData.city;
    if (validatedData.privacy !== undefined)
      updateData.privacy = validatedData.privacy;
    if (validatedData.tags !== undefined)
      updateData.tags = validatedData.tags.join(",");
    if (validatedData.date !== undefined)
      updateData.date = new Date(validatedData.date);

    const album = await db.album.update({
      where: { id: resolvedParams.albumId },
      data: updateData,
      include: {
        photos: true,
        _count: {
          select: {
            photos: true,
            favorites: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...album,
      tags: album.tags ? album.tags.split(",").filter(Boolean) : [],
      photosCount: album._count.photos,
      favoritesCount: album._count.favorites,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    logger.error("Error updating album:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/albums/[albumId] - Delete album
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const resolvedParams = await params;
  try {
    // Handle build-time scenario where db might not be available
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if album exists and belongs to user
    const existingAlbum = await db.album.findFirst({
      where: {
        id: resolvedParams.albumId,
        userId: session.user.id,
      },
    });

    if (!existingAlbum) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Delete the album (cascade will handle related records)
    await db.album.delete({
      where: { id: resolvedParams.albumId },
    });

    return NextResponse.json({ message: "Album deleted successfully" });
  } catch (error) {
    logger.error("Error deleting album:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
