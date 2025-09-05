import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { checkAndAwardBadges } from "@/lib/badges";
import { db, isDatabaseAvailable } from "@/lib/db";
import { getCoordinates } from "@/lib/geocoding";
import { logger } from "@/lib/logger";

const createAlbumSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  country: z.string().min(1),
  city: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]).default("PUBLIC"),
  tags: z.array(z.string()).max(10),
  date: z.string().datetime().optional(), // Trip date - when the visit actually occurred
});

// GET /api/albums - Get user's albums
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const albums = await db.album.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      include: {
        photos: {
          take: 1, // Just get the cover photo
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

    const total = await db.album.count({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      albums: albums.map((album) => ({
        ...album,
        tags: album.tags ? album.tags.split(",").filter(Boolean) : [],
        photosCount: album._count.photos,
        favoritesCount: album._count.favorites,
        coverPhotoUrl: album.coverPhoto?.url || album.photos[0]?.url || null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching albums:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/albums - Create new album
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createAlbumSchema.parse(body);

    // Get coordinates if not provided
    let { latitude } = validatedData;
    let { longitude } = validatedData;

    if (latitude === undefined || longitude === undefined) {
      // Try to geocode the location
      const coordinates = await getCoordinates(
        validatedData.country,
        validatedData.city
      );

      if (coordinates) {
        latitude = coordinates.lat;
        longitude = coordinates.lng;
      } else {
        // Default to 0,0 if geocoding fails (will be updated later)
        latitude = latitude ?? 0;
        longitude = longitude ?? 0;
        logger.warn(
          `Could not geocode location: ${validatedData.city || ""}, ${validatedData.country}`
        );
      }
    }

    // Create the album with coordinates
    const album = await db.album.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        country: validatedData.country,
        city: validatedData.city,
        latitude,
        longitude,
        privacy: validatedData.privacy,
        tags: validatedData.tags.join(","),
        userId: session.user.id,
        // Use provided date or default to now for historical album support
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
      },
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

    // Create activity record
    await db.activity.create({
      data: {
        userId: session.user.id,
        type: "ALBUM_CREATED",
        targetType: "Album",
        targetId: album.id,
        metadata: JSON.stringify({
          albumTitle: album.title,
          country: album.country,
          city: album.city,
        }),
      },
    });

    // Update user statistics
    await db.user.update({
      where: { id: session.user.id },
      data: {
        totalAlbumsCount: {
          increment: 1,
        },
      },
    });

    // Check for badge achievements (async, don't wait)
    checkAndAwardBadges({
      userId: session.user.id,
      triggerType: "ALBUM_CREATED",
      metadata: {
        country: album.country,
        albumId: album.id,
      },
    }).catch((error) => logger.error("Badge check failed:", { error }));

    return NextResponse.json(
      {
        ...album,
        tags: album.tags ? album.tags.split(",").filter(Boolean) : [],
        photosCount: album._count.photos,
        favoritesCount: album._count.favorites,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    logger.error("Error creating album:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
