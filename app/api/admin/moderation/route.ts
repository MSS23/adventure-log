import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { handleApiError, ok, badRequest, forbidden } from "@/lib/http";
import { logModerationAction } from "@/lib/moderation";
import { z } from "zod";

const moderationActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  contentType: z.enum(["Album", "AlbumPhoto", "Comment", "User"]),
  contentId: z.string(),
  reason: z.string().optional(),
});

/**
 * GET /api/admin/moderation - Get content that requires review
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Check if user is admin
    if (user.role !== "ADMIN") {
      return forbidden("Admin access required");
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const contentType = searchParams.get("contentType") as
      | "Album"
      | "AlbumPhoto"
      | "Comment"
      | "User"
      | null;
    const skip = (page - 1) * limit;

    // Get flagged content that requires review
    const flaggedContent: any[] = [];

    // Get flagged albums
    if (!contentType || contentType === "Album") {
      const queryOptions = {
        where: {
          requiresReview: true,
          deletedAt: null,
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
            select: {
              id: true,
              url: true,
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" } as const,
        skip: contentType === "Album" ? skip : 0,
        take: contentType === "Album" ? limit : 10,
      };

      const flaggedAlbums = await db.album.findMany(queryOptions);

      flaggedContent.push(
        ...flaggedAlbums.map((album) => ({
          type: "Album",
          id: album.id,
          title: album.title,
          description: album.description,
          content: {
            title: album.title,
            description: album.description,
            location: `${album.city || ""} ${album.country || ""}`.trim(),
          },
          user: album.user,
          coverPhoto: album.photos[0]?.url,
          createdAt: album.createdAt,
          flaggedAt: album.updatedAt,
        }))
      );
    }

    // Get flagged photos
    if (!contentType || contentType === "AlbumPhoto") {
      const photoQueryOptions = {
        where: {
          requiresReview: true,
          deletedAt: null,
        },
        include: {
          album: {
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
          },
        },
        orderBy: { createdAt: "desc" } as const,
        skip: contentType === "AlbumPhoto" ? skip : 0,
        take: contentType === "AlbumPhoto" ? limit : 10,
      };

      const flaggedPhotos = await db.albumPhoto.findMany(photoQueryOptions);

      flaggedContent.push(
        ...flaggedPhotos.map((photo) => ({
          type: "AlbumPhoto",
          id: photo.id,
          title: `Photo from ${photo.album.title}`,
          content: {
            url: photo.url,
            caption: photo.caption,
            location:
              photo.latitude && photo.longitude
                ? `${photo.latitude}, ${photo.longitude}`
                : null,
          },
          user: photo.album.user,
          albumId: photo.album.id,
          albumTitle: photo.album.title,
          createdAt: photo.createdAt,
          flaggedAt: photo.updatedAt,
        }))
      );
    }

    // Get flagged comments
    if (!contentType || contentType === "Comment") {
      const commentQueryOptions = {
        where: {
          requiresReview: true,
          deletedAt: null,
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
        orderBy: { createdAt: "desc" } as const,
        skip: contentType === "Comment" ? skip : 0,
        take: contentType === "Comment" ? limit : 10,
      };

      const flaggedComments = await db.comment.findMany(commentQueryOptions);

      flaggedContent.push(
        ...flaggedComments.map((comment) => ({
          type: "Comment",
          id: comment.id,
          title: `Comment on ${comment.targetType}`,
          content: {
            text: comment.content,
            targetType: comment.targetType,
            targetId: comment.targetId,
          },
          user: comment.user,
          createdAt: comment.createdAt,
          flaggedAt: comment.updatedAt,
        }))
      );
    }

    // Get flagged users (if they have inappropriate profile content)
    if (!contentType || contentType === "User") {
      const userQueryOptions = {
        where: {
          requiresReview: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" } as const,
        skip: contentType === "User" ? skip : 0,
        take: contentType === "User" ? limit : 5,
      };

      const flaggedUsers = await db.user.findMany(userQueryOptions);

      flaggedContent.push(
        ...flaggedUsers.map((user) => ({
          type: "User",
          id: user.id,
          title: `User: ${user.name || user.username}`,
          content: {
            name: user.name,
            username: user.username,
            bio: user.bio,
          },
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.image,
          },
          createdAt: user.createdAt,
          flaggedAt: user.updatedAt,
        }))
      );
    }

    // Sort by flagged date (most recent first)
    flaggedContent.sort(
      (a, b) =>
        new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()
    );

    // Apply pagination if not filtered by content type
    const paginatedContent = contentType
      ? flaggedContent
      : flaggedContent.slice(skip, skip + limit);

    // Get total counts for each type
    const [albumCount, photoCount, commentCount, userCount] = await Promise.all(
      [
        db.album.count({ where: { requiresReview: true, deletedAt: null } }),
        db.albumPhoto.count({
          where: { requiresReview: true, deletedAt: null },
        }),
        db.comment.count({ where: { requiresReview: true, deletedAt: null } }),
        db.user.count({ where: { requiresReview: true, deletedAt: null } }),
      ]
    );

    const totalCount = albumCount + photoCount + commentCount + userCount;

    return ok({
      flaggedContent: paginatedContent,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      counts: {
        albums: albumCount,
        photos: photoCount,
        comments: commentCount,
        users: userCount,
        total: totalCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/moderation - Take moderation action on flagged content
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Check if user is admin
    if (user.role !== "ADMIN") {
      return forbidden("Admin access required");
    }

    const body = await request.json();
    const { action, contentType, contentId, reason } =
      moderationActionSchema.parse(body);

    let targetUser: any = null;
    let actionTaken = false;

    // Take action based on content type
    switch (contentType) {
      case "Album":
        const album = await db.album.findUnique({
          where: { id: contentId },
          include: { user: true },
        });

        if (!album) {
          return badRequest("Album not found");
        }

        targetUser = album.user;

        if (action === "approve") {
          await db.album.update({
            where: { id: contentId },
            data: { requiresReview: false },
          });
        } else {
          await db.album.update({
            where: { id: contentId },
            data: {
              requiresReview: false,
              deletedAt: new Date(),
            },
          });
        }
        actionTaken = true;
        break;

      case "AlbumPhoto":
        const photo = await db.albumPhoto.findUnique({
          where: { id: contentId },
          include: { album: { include: { user: true } } },
        });

        if (!photo) {
          return badRequest("Photo not found");
        }

        targetUser = photo.album.user;

        if (action === "approve") {
          await db.albumPhoto.update({
            where: { id: contentId },
            data: { requiresReview: false },
          });
        } else {
          await db.albumPhoto.update({
            where: { id: contentId },
            data: {
              requiresReview: false,
              deletedAt: new Date(),
            },
          });
        }
        actionTaken = true;
        break;

      case "Comment":
        const comment = await db.comment.findUnique({
          where: { id: contentId },
          include: { user: true },
        });

        if (!comment) {
          return badRequest("Comment not found");
        }

        targetUser = comment.user;

        if (action === "approve") {
          await db.comment.update({
            where: { id: contentId },
            data: { requiresReview: false },
          });
        } else {
          await db.comment.update({
            where: { id: contentId },
            data: {
              requiresReview: false,
              deletedAt: new Date(),
            },
          });
        }
        actionTaken = true;
        break;

      case "User":
        const targetUserRecord = await db.user.findUnique({
          where: { id: contentId },
        });

        if (!targetUserRecord) {
          return badRequest("User not found");
        }

        targetUser = targetUserRecord;

        if (action === "approve") {
          await db.user.update({
            where: { id: contentId },
            data: { requiresReview: false },
          });
        } else {
          // Don't delete user account, just flag for further action
          await db.user.update({
            where: { id: contentId },
            data: {
              requiresReview: false,
              // Could add a 'restricted' or 'suspended' status here
            },
          });
        }
        actionTaken = true;
        break;
    }

    if (actionTaken) {
      // Log the moderation action
      await logModerationAction(
        targetUser.id,
        contentType,
        contentId,
        {
          result: action === "approve" ? "SAFE" : "BLOCKED",
          confidence: 1,
          categories: ["admin_review"],
          reason,
        },
        action === "approve" ? "approved" : "rejected"
      );

      // Create notification for the content owner
      await db.notification.create({
        data: {
          userId: targetUser.id,
          type: "CONTENT_MODERATED",
          title: action === "approve" ? "Content Approved" : "Content Removed",
          content:
            action === "approve"
              ? "Your content has been reviewed and approved."
              : `Your content has been removed. ${reason || "It violated our community guidelines."}`,
          metadata: JSON.stringify({
            contentType,
            contentId,
            action,
            reason,
            moderatedBy: user.id,
            moderatedAt: new Date().toISOString(),
          }),
        },
      });
    }

    return ok({
      message: `Content ${action === "approve" ? "approved" : "rejected"} successfully`,
      action,
      contentType,
      contentId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
