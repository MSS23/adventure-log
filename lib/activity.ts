import { db } from "./db";
import type { ActivityType } from "@prisma/client";

export interface LogActivityParams {
  userId: string;
  type: ActivityType;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log user activity to the Activity table
 * This helper creates an Activity row for any mutating action
 * Used for audit trail, analytics, and activity feeds
 */
export async function logActivity({
  userId,
  type,
  targetType,
  targetId,
  metadata,
}: LogActivityParams) {
  try {
    const activity = await db.activity.create({
      data: {
        userId,
        type,
        targetType: targetType || null,
        targetId: targetId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date(),
      },
    });

    // Trigger gamification updates asynchronously (don't await to avoid blocking)
    triggerGamificationUpdates(userId, type, metadata).catch((error) => {
      console.error("Failed to trigger gamification updates:", error);
    });

    return activity;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
    return null;
  }
}

/**
 * Trigger badge and challenge updates based on activity
 */
async function triggerGamificationUpdates(
  userId: string,
  activityType: ActivityType,
  metadata?: Record<string, any>
) {
  try {
    // Only trigger for certain activity types
    const gamificationTriggers = [
      "ALBUM_CREATED",
      "PHOTO_UPLOADED",
      "COUNTRY_VISITED",
      "CONTENT_LIKED",
      "CONTENT_COMMENTED",
      "USER_FOLLOWED",
    ];

    if (!gamificationTriggers.includes(activityType)) {
      return;
    }

    // Dynamic import to avoid circular dependencies
    const { handleUserActivity } = await import("./cron");
    await handleUserActivity(userId, activityType, metadata);
  } catch (error) {
    console.error("Gamification update failed:", error);
    // Don't throw - gamification failures shouldn't break the main flow
  }
}

/**
 * Activity helper functions for common actions
 */
export const activityHelpers = {
  // Album activities
  async albumCreated(userId: string, albumId: string, albumTitle: string) {
    return logActivity({
      userId,
      type: "ALBUM_CREATED",
      targetType: "Album",
      targetId: albumId,
      metadata: { albumTitle },
    });
  },

  async photoUploaded(userId: string, photoId: string, albumId: string) {
    return logActivity({
      userId,
      type: "PHOTO_UPLOADED",
      targetType: "AlbumPhoto",
      targetId: photoId,
      metadata: { albumId },
    });
  },

  async albumShared(userId: string, albumId: string, platform?: string) {
    return logActivity({
      userId,
      type: "ALBUM_SHARED",
      targetType: "Album",
      targetId: albumId,
      metadata: { platform },
    });
  },

  // Social activities
  async userFollowed(userId: string, followedUserId: string) {
    return logActivity({
      userId,
      type: "USER_FOLLOWED",
      targetType: "User",
      targetId: followedUserId,
    });
  },

  async contentLiked(userId: string, targetType: string, targetId: string) {
    return logActivity({
      userId,
      type: "CONTENT_LIKED",
      targetType,
      targetId,
    });
  },

  async contentCommented(
    userId: string,
    commentId: string,
    targetType: string,
    targetId: string
  ) {
    return logActivity({
      userId,
      type: "CONTENT_COMMENTED",
      targetType: "Comment",
      targetId: commentId,
      metadata: { originalTargetType: targetType, originalTargetId: targetId },
    });
  },

  // Gamification activities
  async badgeEarned(userId: string, badgeId: string, badgeName: string) {
    return logActivity({
      userId,
      type: "BADGE_EARNED",
      targetType: "Badge",
      targetId: badgeId,
      metadata: { badgeName },
    });
  },

  async challengeCompleted(
    userId: string,
    challengeId: string,
    challengeTitle: string
  ) {
    return logActivity({
      userId,
      type: "CHALLENGE_COMPLETED",
      targetType: "Challenge",
      targetId: challengeId,
      metadata: { challengeTitle },
    });
  },

  // Travel activities
  async countryVisited(
    userId: string,
    countryCode: string,
    countryName: string
  ) {
    return logActivity({
      userId,
      type: "COUNTRY_VISITED",
      targetType: "Country",
      targetId: countryCode,
      metadata: { countryName },
    });
  },

  async locationTagged(
    userId: string,
    albumId: string,
    latitude: number,
    longitude: number,
    locationName?: string
  ) {
    return logActivity({
      userId,
      type: "LOCATION_TAGGED",
      targetType: "Album",
      targetId: albumId,
      metadata: { latitude, longitude, locationName },
    });
  },
};

/**
 * Get activities for a user (for activity feeds)
 */
export async function getUserActivities(
  userId: string,
  limit = 10,
  offset = 0
) {
  try {
    const activities = await db.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
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

    return activities;
  } catch (error) {
    console.error("Failed to get user activities:", error);
    return [];
  }
}

/**
 * Get activities from followed users (for social feed)
 */
export async function getFollowingActivities(
  userId: string,
  limit = 20,
  offset = 0
) {
  try {
    // Get users that the current user follows
    const followingIds = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingUserIds = followingIds.map((follow) => follow.followingId);

    if (followingUserIds.length === 0) {
      return [];
    }

    const activities = await db.activity.findMany({
      where: {
        userId: { in: followingUserIds },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
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

    return activities;
  } catch (error) {
    console.error("Failed to get following activities:", error);
    return [];
  }
}

/**
 * Get activity statistics for analytics
 */
export async function getActivityStats(userId: string, days = 30) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await db.activity.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: since },
      },
      _count: {
        type: true,
      },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.type] = stat._count.type;
        return acc;
      },
      {} as Record<ActivityType, number>
    );
  } catch (error) {
    console.error("Failed to get activity stats:", error);
    return {};
  }
}
