import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

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
