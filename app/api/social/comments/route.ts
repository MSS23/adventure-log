import { NextRequest } from "next/server";
import { getCurrentUser, rateLimit } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { handleApiError, ok, created, badRequest } from "@/lib/http";
import { commentCreateSchema } from "@/lib/validations";
import { activityHelpers } from "@/lib/activity";

/**
 * GET /api/social/comments - Get comments for a target (album or photo)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const targetType = searchParams.get("targetType") as "Album" | "AlbumPhoto";
    const targetId = searchParams.get("targetId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    if (!targetType || !targetId) {
      return badRequest("targetType and targetId are required");
    }

    // Verify target exists and user has permission to view comments
    if (targetType === "Album") {
      const album = await db.album.findUnique({
        where: { id: targetId },
        include: { user: true },
      });

      if (!album) {
        return handleApiError(new Error("Album not found"));
      }

      // Check privacy permissions for album comments
      if (album.privacy === "PRIVATE" && album.userId !== user.id) {
        return handleApiError(new Error("Forbidden: Private album"));
      }

      if (album.privacy === "FRIENDS_ONLY" && album.userId !== user.id) {
        const friendship = await db.friendRequest.findFirst({
          where: {
            status: "ACCEPTED",
            OR: [
              { senderId: user.id, receiverId: album.userId },
              { senderId: album.userId, receiverId: user.id },
            ],
          },
        });

        if (!friendship) {
          return handleApiError(new Error("Forbidden: Friends only album"));
        }
      }
    } else if (targetType === "AlbumPhoto") {
      const photo = await db.albumPhoto.findUnique({
        where: { id: targetId },
        include: {
          album: {
            include: { user: true },
          },
        },
      });

      if (!photo) {
        return handleApiError(new Error("Photo not found"));
      }

      // Same privacy checks as album
      if (photo.album.privacy === "PRIVATE" && photo.album.userId !== user.id) {
        return handleApiError(new Error("Forbidden: Private photo"));
      }

      if (
        photo.album.privacy === "FRIENDS_ONLY" &&
        photo.album.userId !== user.id
      ) {
        const friendship = await db.friendRequest.findFirst({
          where: {
            status: "ACCEPTED",
            OR: [
              { senderId: user.id, receiverId: photo.album.userId },
              { senderId: photo.album.userId, receiverId: user.id },
            ],
          },
        });

        if (!friendship) {
          return handleApiError(new Error("Forbidden: Friends only photo"));
        }
      }
    }

    // Get comments with user info and replies
    const comments = await db.comment.findMany({
      where: {
        targetType,
        targetId,
        parentId: null, // Only top-level comments
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
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await db.comment.count({
      where: {
        targetType,
        targetId,
        parentId: null,
      },
    });

    return ok({
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/social/comments - Create a new comment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Rate limiting - 20 comments per minute per user
    await rateLimit("comments", user.id);

    const body = await request.json();
    const validatedData = commentCreateSchema.parse(body);

    // Verify target exists and get owner info
    let targetOwner: { id: string; name: string | null } | null = null;
    let targetTitle = "";

    if (validatedData.targetType === "Album") {
      const album = await db.album.findUnique({
        where: { id: validatedData.targetId },
        include: { user: { select: { id: true, name: true } } },
      });

      if (!album) {
        return badRequest("Album not found");
      }

      targetOwner = album.user;
      targetTitle = album.title;

      // Check privacy permissions
      if (album.privacy === "PRIVATE" && album.userId !== user.id) {
        return handleApiError(
          new Error("Forbidden: Cannot comment on private album")
        );
      }

      if (album.privacy === "FRIENDS_ONLY" && album.userId !== user.id) {
        const friendship = await db.friendRequest.findFirst({
          where: {
            status: "ACCEPTED",
            OR: [
              { senderId: user.id, receiverId: album.userId },
              { senderId: album.userId, receiverId: user.id },
            ],
          },
        });

        if (!friendship) {
          return handleApiError(
            new Error("Forbidden: Cannot comment on friends-only album")
          );
        }
      }
    } else if (validatedData.targetType === "AlbumPhoto") {
      const photo = await db.albumPhoto.findUnique({
        where: { id: validatedData.targetId },
        include: {
          album: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });

      if (!photo) {
        return badRequest("Photo not found");
      }

      targetOwner = photo.album.user;
      targetTitle = photo.album.title;

      // Same privacy checks as album
      if (photo.album.privacy === "PRIVATE" && photo.album.userId !== user.id) {
        return handleApiError(
          new Error("Forbidden: Cannot comment on private photo")
        );
      }

      if (
        photo.album.privacy === "FRIENDS_ONLY" &&
        photo.album.userId !== user.id
      ) {
        const friendship = await db.friendRequest.findFirst({
          where: {
            status: "ACCEPTED",
            OR: [
              { senderId: user.id, receiverId: photo.album.userId },
              { senderId: photo.album.userId, receiverId: user.id },
            ],
          },
        });

        if (!friendship) {
          return handleApiError(
            new Error("Forbidden: Cannot comment on friends-only photo")
          );
        }
      }
    }

    // Verify parent comment exists if this is a reply
    if (validatedData.parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentComment) {
        return badRequest("Parent comment not found");
      }

      // Ensure parent comment is for the same target
      if (
        parentComment.targetType !== validatedData.targetType ||
        parentComment.targetId !== validatedData.targetId
      ) {
        return badRequest("Invalid parent comment");
      }
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        content: validatedData.content.trim(),
        userId: user.id,
        targetType: validatedData.targetType,
        targetId: validatedData.targetId,
        parentId: validatedData.parentId || null,
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
      },
    });

    // Log activity
    await activityHelpers.contentCommented(
      user.id,
      comment.id,
      validatedData.targetType,
      validatedData.targetId
    );

    // Create notification for content owner (if not self and not a reply to own comment)
    if (targetOwner && targetOwner.id !== user.id) {
      await db.notification.create({
        data: {
          userId: targetOwner.id,
          type: "CONTENT_COMMENTED",
          title: "New Comment",
          content: `${user.name} commented on your ${validatedData.targetType.toLowerCase()}: "${targetTitle}"`,
          metadata: JSON.stringify({
            commentId: comment.id,
            commenterId: user.id,
            commenterName: user.name,
            commenterImage: user.image,
            targetType: validatedData.targetType,
            targetId: validatedData.targetId,
            targetTitle,
            isReply: !!validatedData.parentId,
          }),
        },
      });
    }

    return created(comment, { message: "Comment created successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/social/comments - Delete a comment
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return badRequest("commentId is required");
    }

    // Find comment and verify ownership
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!comment) {
      return handleApiError(new Error("Comment not found"));
    }

    // Only comment owner can delete (or admin - future feature)
    if (comment.userId !== user.id) {
      return handleApiError(
        new Error("Forbidden: You can only delete your own comments")
      );
    }

    // Delete comment and all replies
    await db.comment.deleteMany({
      where: {
        OR: [
          { id: commentId },
          { parentId: commentId }, // Delete all replies
        ],
      },
    });

    return ok({ message: "Comment deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
