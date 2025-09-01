import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const likeSchema = z.object({
  targetType: z.enum(["Album", "AlbumPhoto"]),
  targetId: z.string(),
});

// POST /api/social/like - Like an album or photo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId } = likeSchema.parse(body);

    // Check if target exists
    let targetExists = false;
    let targetOwner = null;
    let targetTitle = "";

    if (targetType === "Album") {
      const album = await db.album.findUnique({
        where: { id: targetId },
        include: { user: true },
      });
      targetExists = !!album;
      targetOwner = album?.user;
      targetTitle = album?.title || "";
    } else if (targetType === "AlbumPhoto") {
      const photo = await db.albumPhoto.findUnique({
        where: { id: targetId },
        include: {
          album: {
            include: { user: true },
          },
        },
      });
      targetExists = !!photo;
      targetOwner = photo?.album.user;
      targetTitle = photo?.album.title || "";
    }

    if (!targetExists) {
      return NextResponse.json(
        { error: `${targetType} not found` },
        { status: 404 }
      );
    }

    // Check if already liked
    const existingLike = await db.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId: session.user.id,
          targetType,
          targetId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ error: "Already liked" }, { status: 400 });
    }

    // Create like
    await db.like.create({
      data: {
        userId: session.user.id,
        targetType,
        targetId,
      },
    });

    // Create activity record
    await db.activity.create({
      data: {
        userId: session.user.id,
        type: "CONTENT_LIKED",
        targetType,
        targetId,
        metadata: JSON.stringify({
          targetTitle,
          targetOwnerName: targetOwner?.name,
        }),
      },
    });

    // Create notification for the content owner (if not self)
    if (targetOwner && targetOwner.id !== session.user.id) {
      await db.notification.create({
        data: {
          userId: targetOwner.id,
          type: "CONTENT_LIKED",
          title: "New Like",
          content: `${session.user.name} liked your ${targetType.toLowerCase()}: "${targetTitle}"`,
          metadata: JSON.stringify({
            likerId: session.user.id,
            likerName: session.user.name,
            likerImage: session.user.image,
            targetType,
            targetId,
            targetTitle,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully liked content",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error liking content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/social/like - Unlike an album or photo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId } = likeSchema.parse(body);

    // Find and delete the like
    const existingLike = await db.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId: session.user.id,
          targetType,
          targetId,
        },
      },
    });

    if (!existingLike) {
      return NextResponse.json({ error: "Not liked" }, { status: 400 });
    }

    await db.like.delete({
      where: {
        id: existingLike.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unliked content",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error unliking content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
