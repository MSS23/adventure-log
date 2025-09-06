import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const followSchema = z.object({
  userId: z.string(),
});

// POST /api/social/follow - Follow a user
export async function POST(request: NextRequest) {
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
    const { userId } = followSchema.parse(body);

    // Can't follow yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 400 }
      );
    }

    // Create follow relationship
    await db.follow.create({
      data: {
        followerId: user.id,
        followingId: userId,
      },
    });

    // Create activity record
    await db.activity.create({
      data: {
        userId: user.id,
        type: "USER_FOLLOWED",
        targetType: "User",
        targetId: userId,
        metadata: JSON.stringify({
          followedUserName: targetUser.name,
        }),
      },
    });

    // Get current user's profile for notification
    const currentUserProfile = await db.user.findUnique({
      where: { id: user.id },
      select: { name: true, image: true },
    });

    // Create notification for the followed user
    await db.notification.create({
      data: {
        userId,
        type: "NEW_FOLLOWER",
        title: "New Follower",
        content: `${currentUserProfile?.name || user.email} started following you`,
        metadata: JSON.stringify({
          followerId: user.id,
          followerName: currentUserProfile?.name || user.email,
          followerImage: currentUserProfile?.image,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully followed user",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    logger.error("Error following user:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/social/follow - Unfollow a user
export async function DELETE(request: NextRequest) {
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
    const { userId } = followSchema.parse(body);

    // Find and delete the follow relationship
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId,
        },
      },
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: "Not following this user" },
        { status: 400 }
      );
    }

    await db.follow.delete({
      where: {
        id: existingFollow.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unfollowed user",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    logger.error("Error unfollowing user:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
