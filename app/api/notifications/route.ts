import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { handleApiError, ok, badRequest } from "@/lib/http";
import { notificationUpdateSchema } from "@/lib/validations";

/**
 * GET /api/notifications - Get user's notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const skip = (page - 1) * limit;

    const whereClause = {
      userId: user.id,
      ...(unreadOnly && { isRead: false }),
    };

    // Get notifications with pagination
    const notifications = await db.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Get total count
    const total = await db.notification.count({
      where: whereClause,
    });

    // Get unread count
    const unreadCount = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return ok({
      notifications: notifications.map((notification) => ({
        ...notification,
        metadata: notification.metadata
          ? JSON.parse(notification.metadata)
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/notifications - Mark notifications as read/unread
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const validatedData = notificationUpdateSchema.parse(body);

    // Verify all notifications belong to the user
    const notificationCheck = await db.notification.findMany({
      where: {
        id: { in: validatedData.notificationIds },
        userId: { not: user.id },
      },
      select: { id: true },
    });

    if (notificationCheck.length > 0) {
      return badRequest("Some notifications do not belong to you");
    }

    // Update notifications
    const updated = await db.notification.updateMany({
      where: {
        id: { in: validatedData.notificationIds },
        userId: user.id,
      },
      data: {
        isRead: validatedData.markAsRead,
        readAt: validatedData.markAsRead ? new Date() : null,
      },
    });

    const action = validatedData.markAsRead
      ? "marked as read"
      : "marked as unread";
    return ok({
      message: `${updated.count} notifications ${action}`,
      updated: updated.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/notifications/mark-all-read - Mark all notifications as read
 */
export async function POST() {
  try {
    const user = await getCurrentUser();

    const updated = await db.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return ok({
      message: `All ${updated.count} notifications marked as read`,
      updated: updated.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/notifications - Delete notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const notificationId = searchParams.get("notificationId");
    const deleteAll = searchParams.get("deleteAll") === "true";
    const deleteRead = searchParams.get("deleteRead") === "true";

    if (deleteAll) {
      // Delete all notifications for user
      const deleted = await db.notification.deleteMany({
        where: { userId: user.id },
      });

      return ok({
        message: `All ${deleted.count} notifications deleted`,
        deleted: deleted.count,
      });
    }

    if (deleteRead) {
      // Delete all read notifications for user
      const deleted = await db.notification.deleteMany({
        where: {
          userId: user.id,
          isRead: true,
        },
      });

      return ok({
        message: `${deleted.count} read notifications deleted`,
        deleted: deleted.count,
      });
    }

    if (notificationId) {
      // Delete specific notification
      const notification = await db.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return badRequest("Notification not found");
      }

      if (notification.userId !== user.id) {
        return badRequest("You can only delete your own notifications");
      }

      await db.notification.delete({
        where: { id: notificationId },
      });

      return ok({ message: "Notification deleted" });
    }

    return badRequest(
      "Must specify notificationId, deleteAll=true, or deleteRead=true"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
