import { db } from "./db";
import { logger } from "./logger";

/**
 * Points system configuration
 */
export const POINTS_CONFIG = {
  // Core activities
  ALBUM_CREATED: 50,
  PHOTO_UPLOADED: 5,
  COUNTRY_VISITED: 100,

  // Social activities
  FOLLOWER_GAINED: 10,
  LIKE_RECEIVED: 2,
  COMMENT_RECEIVED: 5,
  CONTENT_SHARED: 3,

  // Gamification
  BADGE_EARNED_COMMON: 20,
  BADGE_EARNED_RARE: 50,
  BADGE_EARNED_EPIC: 100,
  BADGE_EARNED_LEGENDARY: 200,
  CHALLENGE_COMPLETED: 75,

  // Streak bonuses
  STREAK_WEEK_1: 10,
  STREAK_WEEK_2: 25,
  STREAK_MONTH_1: 50,
  STREAK_MONTH_3: 150,
  STREAK_MONTH_6: 300,
  STREAK_MONTH_12: 600,

  // Quality bonuses
  ALBUM_WITH_DESCRIPTION: 10,
  ALBUM_WITH_LOCATION: 10,
  PHOTO_WITH_CAPTION: 3,
  PUBLIC_ALBUM_BONUS: 5,
} as const;

/**
 * Calculate total points for a user based on their activities and achievements
 */
export async function calculateUserPoints(userId: string): Promise<number> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        albums: {
          include: {
            photos: true,
            _count: {
              select: {
                favorites: true,
              },
            },
          },
        },
        badges: {
          include: {
            badge: true,
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let totalPoints = 0;

    // Core activity points
    const albumsCount = user.totalAlbumsCount || 0;
    const photosCount = user.totalPhotosCount || 0;
    const countriesCount = user.totalCountriesVisited || 0;

    totalPoints += albumsCount * POINTS_CONFIG.ALBUM_CREATED;
    totalPoints += photosCount * POINTS_CONFIG.PHOTO_UPLOADED;
    totalPoints += countriesCount * POINTS_CONFIG.COUNTRY_VISITED;

    // Social activity points
    const followersCount = user._count.followers;
    totalPoints += followersCount * POINTS_CONFIG.FOLLOWER_GAINED;

    // Album quality bonuses
    for (const album of user.albums) {
      if (album.description && album.description.length > 20) {
        totalPoints += POINTS_CONFIG.ALBUM_WITH_DESCRIPTION;
      }

      if (
        album.shareLocation &&
        album.latitude !== 0 &&
        album.longitude !== 0
      ) {
        totalPoints += POINTS_CONFIG.ALBUM_WITH_LOCATION;
      }

      if (album.privacy === "PUBLIC") {
        totalPoints += POINTS_CONFIG.PUBLIC_ALBUM_BONUS;
      }

      // Photo caption bonuses
      for (const photo of album.photos) {
        if (photo.caption && photo.caption.length > 10) {
          totalPoints += POINTS_CONFIG.PHOTO_WITH_CAPTION;
        }
      }

      // Likes received (favorites)
      totalPoints += album._count.favorites * POINTS_CONFIG.LIKE_RECEIVED;
    }

    // Badge points
    for (const userBadge of user.badges) {
      if (userBadge.completed) {
        const badge = userBadge.badge;
        switch (badge.rarity) {
          case "COMMON":
            totalPoints += POINTS_CONFIG.BADGE_EARNED_COMMON;
            break;
          case "RARE":
            totalPoints += POINTS_CONFIG.BADGE_EARNED_RARE;
            break;
          case "EPIC":
            totalPoints += POINTS_CONFIG.BADGE_EARNED_EPIC;
            break;
          case "LEGENDARY":
            totalPoints += POINTS_CONFIG.BADGE_EARNED_LEGENDARY;
            break;
        }
      }
    }

    // Streak bonuses
    const currentStreak = user.currentStreak || 0;
    const longestStreak = user.longestStreak || 0;

    if (currentStreak >= 12) {
      totalPoints += POINTS_CONFIG.STREAK_MONTH_12;
    } else if (currentStreak >= 6) {
      totalPoints += POINTS_CONFIG.STREAK_MONTH_6;
    } else if (currentStreak >= 3) {
      totalPoints += POINTS_CONFIG.STREAK_MONTH_3;
    } else if (currentStreak >= 1) {
      totalPoints += POINTS_CONFIG.STREAK_MONTH_1;
    }

    // Longest streak bonus (additional)
    if (longestStreak >= 12) {
      totalPoints += Math.floor(longestStreak / 12) * 100; // Extra 100 points per year
    }

    return totalPoints;
  } catch (error) {
    logger.error("Error calculating user points", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Update user points in database
 */
export async function updateUserPoints(userId: string): Promise<number> {
  try {
    const newPoints = await calculateUserPoints(userId);

    await db.user.update({
      where: { id: userId },
      data: {
        // We could add a points field to the user schema
        // For now, we'll calculate points on-the-fly
      },
    });

    return newPoints;
  } catch (error) {
    logger.error("Error updating user points", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Get points leaderboard with proper calculation
 */
export async function getPointsLeaderboard(limit: number = 20) {
  try {
    // Get top users by various metrics
    const users = await db.user.findMany({
      take: limit * 2, // Get more than needed to calculate points
      orderBy: [
        { totalCountriesVisited: "desc" },
        { totalAlbumsCount: "desc" },
        { totalPhotosCount: "desc" },
      ],
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        totalAlbumsCount: true,
        totalPhotosCount: true,
        totalCountriesVisited: true,
        currentStreak: true,
        longestStreak: true,
        badges: {
          where: { completed: true },
          include: {
            badge: {
              select: {
                rarity: true,
                points: true,
              },
            },
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    // Calculate points for each user
    const usersWithPoints = await Promise.all(
      users.map(async (user) => {
        const points = await calculateUserPoints(user.id);
        return {
          ...user,
          points,
        };
      })
    );

    // Sort by points and take top results
    const sortedUsers = usersWithPoints
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return sortedUsers.map((user, index) => ({
      rank: index + 1,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      points: user.points,
      stats: {
        albums: user.totalAlbumsCount,
        photos: user.totalPhotosCount,
        countries: user.totalCountriesVisited,
        followers: user._count.followers,
        badges: user.badges.length,
        currentStreak: user.currentStreak,
      },
    }));
  } catch (error) {
    logger.error("Error getting points leaderboard", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Award points for specific actions
 */
export async function awardPoints(
  userId: string,
  action: keyof typeof POINTS_CONFIG,
  multiplier: number = 1
): Promise<void> {
  try {
    const points = POINTS_CONFIG[action] * multiplier;

    // Log the points award for tracking
    logger.info("Points awarded", {
      userId,
      action,
      points,
      multiplier,
    });

    // You could store point transactions in a separate table if needed
    // For now, we'll just trigger a recalculation on demand
  } catch (error) {
    logger.error("Error awarding points", {
      userId,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
