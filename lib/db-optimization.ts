import { db } from "./db";
import { logger } from "./logger";

/**
 * Database performance optimization utilities
 */

/**
 * Optimized query for getting user's albums with minimal data
 */
export async function getUserAlbumsOptimized(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    includePhotos?: boolean;
    privacy?: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  } = {}
) {
  const { page = 1, limit = 10, includePhotos = false, privacy } = options;
  const skip = (page - 1) * limit;

  const whereClause = {
    userId,
    deletedAt: null,
    ...(privacy && { privacy }),
  };

  // Use Promise.all to run queries in parallel
  const [albums, totalCount] = await Promise.all([
    db.album.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], // Secondary sort for consistency
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        country: true,
        city: true,
        date: true,
        privacy: true,
        createdAt: true,
        viewCount: true,
        coverPhotoId: true,
        ...(includePhotos
          ? {
              photos: {
                select: {
                  id: true,
                  url: true,
                  caption: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "asc" },
                take: 5, // Limit photos to reduce data transfer
              },
            }
          : {
              _count: {
                select: { photos: true },
              },
            }),
        coverPhoto: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    }),
    db.album.count({ where: whereClause }),
  ]);

  return {
    albums,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  };
}

/**
 * Optimized query for social feed with minimal joins
 */
export async function getSocialFeedOptimized(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    includeFollowing?: boolean;
  } = {}
) {
  const { page = 1, limit = 20, includeFollowing = true } = options;
  const skip = (page - 1) * limit;

  let userIds = [userId];

  if (includeFollowing) {
    // Get users that current user follows
    const following = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    userIds = [userId, ...following.map((f) => f.followingId)];
  }

  const activities = await db.activity.findMany({
    where: {
      userId: { in: userIds },
      type: {
        in: ["ALBUM_CREATED", "BADGE_EARNED", "CHALLENGE_COMPLETED"],
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take: limit,
    select: {
      id: true,
      type: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
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
}

/**
 * Optimized leaderboard query with minimal data transfer
 */
export async function getLeaderboardOptimized(
  type: "countries" | "albums" | "photos" | "followers",
  limit: number = 20
) {
  const orderByField = {
    countries: "totalCountriesVisited",
    albums: "totalAlbumsCount",
    photos: "totalPhotosCount",
    followers: "_count.followers",
  }[type];

  if (type === "followers") {
    return db.user.findMany({
      where: { deletedAt: null, isPublic: true },
      orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        location: true,
        _count: {
          select: { followers: true },
        },
      },
    });
  } else {
    return db.user.findMany({
      where: { deletedAt: null, isPublic: true },
      orderBy: [{ [orderByField]: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        location: true,
        totalCountriesVisited: type === "countries",
        totalAlbumsCount: type === "albums",
        totalPhotosCount: type === "photos",
      },
    });
  }
}

/**
 * Batch operations for better performance
 */
export class BatchOperations {
  private updates: Array<{ table: string; id: string; data: any }> = [];
  private readonly BATCH_SIZE = 100;

  addUpdate(table: string, id: string, data: any) {
    this.updates.push({ table, id, data });

    if (this.updates.length >= this.BATCH_SIZE) {
      return this.flush();
    }
  }

  async flush() {
    if (this.updates.length === 0) return;

    const groupedUpdates = this.updates.reduce(
      (acc, update) => {
        if (!acc[update.table]) acc[update.table] = [];
        acc[update.table].push(update);
        return acc;
      },
      {} as Record<string, typeof this.updates>
    );

    const promises: Promise<any>[] = [];

    for (const [table, updates] of Object.entries(groupedUpdates)) {
      // Use transactions for batch updates
      const promise = db.$transaction(
        updates.map(({ id, data }) => {
          switch (table) {
            case "user":
              return db.user.update({ where: { id }, data });
            case "album":
              return db.album.update({ where: { id }, data });
            case "albumPhoto":
              return db.albumPhoto.update({ where: { id }, data });
            default:
              throw new Error(`Unsupported table: ${table}`);
          }
        })
      );
      promises.push(promise);
    }

    try {
      await Promise.all(promises);
      logger.info("Batch operations completed", {
        totalUpdates: this.updates.length,
        tables: Object.keys(groupedUpdates),
      });
    } catch (error) {
      logger.error("Batch operations failed", {
        error: error instanceof Error ? error.message : String(error),
        updates: this.updates.length,
      });
      throw error;
    } finally {
      this.updates = [];
    }
  }
}

/**
 * Database health check and performance monitoring
 */
export async function checkDatabaseHealth() {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    const userCount = await db.user.count();
    const connectionTime = Date.now() - startTime;

    // Check for slow queries (simulation)
    const slowQueryStart = Date.now();
    await db.album.findMany({
      take: 1,
      include: { photos: true, user: true, favorites: true },
    });
    const complexQueryTime = Date.now() - slowQueryStart;

    const health = {
      status: "healthy" as const,
      connectionTime,
      complexQueryTime,
      userCount,
      timestamp: new Date().toISOString(),
      warnings: [] as string[],
    };

    if (connectionTime > 1000) {
      health.warnings.push("Slow database connection");
    }

    if (complexQueryTime > 500) {
      health.warnings.push("Complex queries are slow");
    }

    if (health.warnings.length > 0) {
      logger.warn("Database performance issues detected", { health });
    }

    return health;
  } catch (error) {
    logger.error("Database health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "unhealthy" as const,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Cleanup old data to maintain performance
 */
export async function cleanupOldData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  try {
    // Clean up old activities (keep last 90 days)
    const deletedActivities = await db.activity.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        type: {
          in: ["DATA_EXPORT", "CLEANUP_COMPLETED"], // Only cleanup non-critical activities
        },
      },
    });

    // Clean up old notifications (keep last 30 days for read notifications)
    const deletedNotifications = await db.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        isRead: true,
      },
    });

    // Clean up expired verification tokens
    const deletedTokens = await db.verificationToken.deleteMany({
      where: {
        expires: { lt: new Date() },
      },
    });

    logger.info("Database cleanup completed", {
      deletedActivities: deletedActivities.count,
      deletedNotifications: deletedNotifications.count,
      deletedTokens: deletedTokens.count,
    });

    return {
      deletedActivities: deletedActivities.count,
      deletedNotifications: deletedNotifications.count,
      deletedTokens: deletedTokens.count,
    };
  } catch (error) {
    logger.error("Database cleanup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
