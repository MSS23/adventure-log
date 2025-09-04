import {
  BadgeCategory,
  BadgeRequirementType,
  BadgeRarity,
} from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "./logger";

export interface BadgeCheckContext {
  userId: string;
  triggerType:
    | "ALBUM_CREATED"
    | "PHOTO_UPLOADED"
    | "COUNTRY_VISITED"
    | "SOCIAL_ACTION"
    | "STREAK_UPDATED";
  metadata?: Record<string, unknown>;
}

<<<<<<< HEAD
=======
/**
 * Calculate consecutive months with album creation
 */
function calculateConsecutiveMonths(albums: { createdAt: Date }[]): number {
  if (albums.length === 0) return 0;

  // Sort albums by creation date (newest first)
  const sortedAlbums = albums.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Group albums by month/year
  const monthsWithAlbums = new Set<string>();

  for (const album of sortedAlbums) {
    const monthKey = `${album.createdAt.getFullYear()}-${album.createdAt.getMonth()}`;
    monthsWithAlbums.add(monthKey);
  }

  // Convert to sorted array of dates
  const sortedMonths = Array.from(monthsWithAlbums)
    .map((monthKey) => {
      const [year, month] = monthKey.split("-").map(Number);
      return new Date(year, month, 1);
    })
    .sort((a, b) => b.getTime() - a.getTime());

  // Calculate consecutive months from current month backward
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let streak = 0;
  const checkMonth = new Date(currentMonth);

  for (let i = 0; i < sortedMonths.length; i++) {
    const albumMonth = sortedMonths[i];

    if (albumMonth.getTime() === checkMonth.getTime()) {
      streak++;
      // Move to previous month
      checkMonth.setMonth(checkMonth.getMonth() - 1);
    } else if (albumMonth.getTime() < checkMonth.getTime()) {
      // Gap found, streak ends
      break;
    }
  }

  return streak;
}

>>>>>>> oauth-upload-fixes
export async function checkAndAwardBadges(context: BadgeCheckContext) {
  const {
    userId,
    triggerType: _triggerType,
    metadata: _metadata = {},
  } = context;

  try {
    // Get user's current stats
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        albums: true,
        badges: { where: { completed: false } },
        _count: {
          select: {
            albums: true,
            followers: true,
          },
        },
      },
    });

    if (!user) return [];

    // Calculate current achievements
    const stats = {
      countriesVisited: user.totalCountriesVisited,
      albumsCount: user.totalAlbumsCount,
      photosCount: user.totalPhotosCount,
      followersCount: user._count.followers,
      currentStreak: user.currentStreak,
    };

    // Get all eligible badges that user hasn't completed
    const eligibleBadges = await db.badge.findMany({
      where: {
        isActive: true,
        userBadges: {
          none: {
            userId,
            completed: true,
          },
        },
      },
    });

    const newlyEarnedBadges = [];

    for (const badge of eligibleBadges) {
      const currentProgress = await getInternalBadgeProgress(userId, badge.id);
      let newProgress = currentProgress;

      // Calculate progress based on requirement type
      switch (badge.requirementType) {
        case "COUNTRIES_VISITED":
          newProgress = stats.countriesVisited;
          break;
        case "TRIPS_COMPLETED":
          newProgress = stats.albumsCount;
          break;
        case "PHOTOS_UPLOADED":
          newProgress = stats.photosCount;
          break;
        case "FOLLOWERS_COUNT":
          newProgress = stats.followersCount;
          break;
        case "CONSECUTIVE_MONTHS":
          newProgress = stats.currentStreak;
          break;
        case "LIKES_RECEIVED":
          // Calculate total likes across all user's content
          const totalLikes = await db.like.count({
            where: {
              OR: [
                {
                  targetType: "Album",
                  targetId: {
                    in: user.albums.map((a) => a.id),
                  },
                },
                {
                  targetType: "AlbumPhoto",
                  // Need to join through album photos
                },
              ],
            },
          });
          newProgress = totalLikes;
          break;
      }

      // Update progress if changed
      if (newProgress !== currentProgress) {
        const isCompleted = newProgress >= badge.requirement;

        await db.userBadge.upsert({
          where: {
            userId_badgeId: {
              userId,
              badgeId: badge.id,
            },
          },
          update: {
            progress: newProgress,
            completed: isCompleted,
            unlockedAt: isCompleted ? new Date() : undefined,
          },
          create: {
            userId,
            badgeId: badge.id,
            progress: newProgress,
            completed: isCompleted,
            unlockedAt: isCompleted ? new Date() : undefined,
          },
        });

        // If badge was just completed
        if (isCompleted && currentProgress < badge.requirement) {
          newlyEarnedBadges.push(badge);

          // Create activity record
          await db.activity.create({
            data: {
              userId,
              type: "BADGE_EARNED",
              targetType: "Badge",
              targetId: badge.id,
              metadata: JSON.stringify({
                badgeName: badge.name,
                badgeIcon: badge.icon,
                badgeRarity: badge.rarity,
                badgePoints: badge.points,
              }),
            },
          });

          // Create notification
          await db.notification.create({
            data: {
              userId,
              type: "BADGE_EARNED",
              title: "Badge Unlocked! 🏆",
              content: `You've earned the "${badge.name}" badge!`,
              metadata: JSON.stringify({
                badgeId: badge.id,
                badgeName: badge.name,
                badgeIcon: badge.icon,
                badgeRarity: badge.rarity,
                badgePoints: badge.points,
              }),
            },
          });
        }
      }
    }

    return newlyEarnedBadges;
  } catch (error) {
    logger.error("Error checking badges:", error);
    return [];
  }
}

async function getInternalBadgeProgress(
  userId: string,
  badgeId: string
): Promise<number> {
  const userBadge = await db.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId,
      },
    },
  });

  return userBadge?.progress || 0;
}

// Initialize default badges in the database
export async function initializeDefaultBadges() {
  const defaultBadges = [
    // Countries badges
    {
      name: "First Steps",
      description: "Visit your first country",
      icon: "🌍",
      category: BadgeCategory.COUNTRIES,
      requirement: 1,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: BadgeRarity.COMMON,
      points: 10,
    },
    {
      name: "Explorer",
      description: "Visit 5 different countries",
      icon: "🗺️",
      category: BadgeCategory.COUNTRIES,
      requirement: 5,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: BadgeRarity.COMMON,
      points: 25,
    },
    {
      name: "Globetrotter",
      description: "Visit 15 countries",
      icon: "✈️",
      category: BadgeCategory.COUNTRIES,
      requirement: 15,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: BadgeRarity.RARE,
      points: 50,
    },
    {
      name: "World Traveler",
      description: "Visit 30 countries",
      icon: "🌎",
      category: BadgeCategory.COUNTRIES,
      requirement: 30,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: BadgeRarity.EPIC,
      points: 100,
    },
    {
      name: "Master Explorer",
      description: "Visit 50 countries",
      icon: "👑",
      category: BadgeCategory.COUNTRIES,
      requirement: 50,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: BadgeRarity.LEGENDARY,
      points: 200,
    },

    // Album badges
    {
      name: "Memory Keeper",
      description: "Create your first album",
      icon: "📸",
      category: BadgeCategory.TRIPS,
      requirement: 1,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
      rarity: BadgeRarity.COMMON,
      points: 10,
    },
    {
      name: "Storyteller",
      description: "Create 10 albums",
      icon: "📚",
      category: BadgeCategory.TRIPS,
      requirement: 10,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
      rarity: BadgeRarity.RARE,
      points: 50,
    },
    {
      name: "Chronicle Master",
      description: "Create 25 albums",
      icon: "🏆",
      category: BadgeCategory.TRIPS,
      requirement: 25,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
      rarity: BadgeRarity.EPIC,
      points: 100,
    },

    // Photo badges
    {
      name: "Shutterbug",
      description: "Upload 50 photos",
      icon: "📷",
      category: BadgeCategory.PHOTOS,
      requirement: 50,
      requirementType: BadgeRequirementType.PHOTOS_UPLOADED,
      rarity: BadgeRarity.COMMON,
      points: 25,
    },
    {
      name: "Photographer",
      description: "Upload 250 photos",
      icon: "🎭",
      category: BadgeCategory.PHOTOS,
      requirement: 250,
      requirementType: BadgeRequirementType.PHOTOS_UPLOADED,
      rarity: BadgeRarity.RARE,
      points: 75,
    },
    {
      name: "Photo Master",
      description: "Upload 1000 photos",
      icon: "🎨",
      category: BadgeCategory.PHOTOS,
      requirement: 1000,
      requirementType: BadgeRequirementType.PHOTOS_UPLOADED,
      rarity: BadgeRarity.EPIC,
      points: 150,
    },

    // Social badges
    {
      name: "Influencer",
      description: "Get 10 followers",
      icon: "🌟",
      category: BadgeCategory.SOCIAL,
      requirement: 10,
      requirementType: BadgeRequirementType.FOLLOWERS_COUNT,
      rarity: BadgeRarity.RARE,
      points: 50,
    },
    {
      name: "Travel Celebrity",
      description: "Get 100 followers",
      icon: "💎",
      category: BadgeCategory.SOCIAL,
      requirement: 100,
      requirementType: BadgeRequirementType.FOLLOWERS_COUNT,
      rarity: BadgeRarity.LEGENDARY,
      points: 200,
    },

    // Streak badges
    {
      name: "Consistent Traveler",
      description: "Maintain a 3-month travel streak",
      icon: "🔥",
      category: BadgeCategory.STREAKS,
      requirement: 3,
      requirementType: BadgeRequirementType.CONSECUTIVE_MONTHS,
      rarity: BadgeRarity.RARE,
      points: 75,
    },
  ];

  // Insert badges if they don't exist
  for (const badgeData of defaultBadges) {
    await db.badge.upsert({
      where: { name: badgeData.name },
      update: {}, // Don't update existing badges
      create: badgeData,
    });
  }

  logger.info(`Initialized ${defaultBadges.length} default badges`);
}

/**
 * Get user's badge progress for display
 */
export async function getUserBadgeProgress(userId: string) {
  try {
    const [badges, userBadges, userStats] = await Promise.all([
      db.badge.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { requirement: "asc" }],
      }),
      db.userBadge.findMany({
        where: { userId },
        include: { badge: true },
      }),
      getUserStats(userId),
    ]);

    const userBadgeMap = new Map(userBadges.map((ub) => [ub.badgeId, ub]));

    return badges.map((badge) => {
      const userBadge = userBadgeMap.get(badge.id);
      let currentProgress = 0;

      // Calculate current progress based on requirement type
      switch (badge.requirementType) {
        case BadgeRequirementType.COUNTRIES_VISITED:
          currentProgress = userStats.countriesVisited;
          break;
        case BadgeRequirementType.TRIPS_COMPLETED:
          currentProgress = userStats.tripsCompleted;
          break;
        case BadgeRequirementType.PHOTOS_UPLOADED:
          currentProgress = userStats.photosUploaded;
          break;
        case BadgeRequirementType.FOLLOWERS_COUNT:
          currentProgress = userStats.followersCount;
          break;
        case BadgeRequirementType.LIKES_RECEIVED:
          currentProgress = userStats.likesReceived;
          break;
        case BadgeRequirementType.CONSECUTIVE_MONTHS:
          currentProgress = userStats.consecutiveMonths;
          break;
        default:
          currentProgress = userBadge?.progress || 0;
      }

      const progressPercentage = Math.min(
        100,
        (currentProgress / badge.requirement) * 100
      );

      return {
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        points: badge.points,
        currentProgress,
        requirement: badge.requirement,
        completed: userBadge?.completed || false,
        unlockedAt: userBadge?.unlockedAt || undefined,
        progressPercentage,
      };
    });
  } catch (error) {
    logger.error("Error getting user badge progress:", error);
    return [];
  }
}

/**
 * Get comprehensive user statistics for badge calculation
 */
async function getUserStats(userId: string) {
  try {
    const [user, likesReceived, albumsData] = await Promise.all([
      // Get basic user stats
      db.user.findUnique({
        where: { id: userId },
        select: {
          totalCountriesVisited: true,
          totalAlbumsCount: true,
          totalPhotosCount: true,
          currentStreak: true,
          _count: {
            select: {
              followers: true,
            },
          },
        },
      }),

      // Get total likes received on user's content
      db.like.count({
        where: {
          OR: [
            {
              targetType: "Album",
              targetId: {
                in: await db.album
                  .findMany({
                    where: { userId },
                    select: { id: true },
                  })
                  .then((albums) => albums.map((a) => a.id)),
              },
            },
            {
              targetType: "AlbumPhoto",
              targetId: {
                in: await db.albumPhoto
                  .findMany({
                    where: { album: { userId } },
                    select: { id: true },
                  })
                  .then((photos) => photos.map((p) => p.id)),
              },
            },
          ],
        },
      }),

      // Calculate consecutive months (get albums from recent months)
      db.album.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

<<<<<<< HEAD
    // Calculate consecutive months with albums (use user's current streak as fallback)
    const consecutiveMonths = user.currentStreak || 0;

    // TODO: Use albumsData for future streak calculation if needed
    void albumsData; // Prevent unused variable warning
=======
    // Calculate consecutive months with albums based on actual album creation dates
    const consecutiveMonths = calculateConsecutiveMonths(albumsData);

    // Update user's current streak if it changed
    if (consecutiveMonths !== user.currentStreak) {
      await db.user.update({
        where: { userId },
        data: {
          currentStreak: consecutiveMonths,
          longestStreak: Math.max(user.longestStreak || 0, consecutiveMonths),
        },
      });
    }
>>>>>>> oauth-upload-fixes

    return {
      countriesVisited: user.totalCountriesVisited || 0,
      tripsCompleted: user.totalAlbumsCount || 0,
      photosUploaded: user.totalPhotosCount || 0,
      followersCount: user._count.followers,
      likesReceived,
      consecutiveMonths,
    };
  } catch (error) {
    logger.error("Error getting user stats:", error);
    throw new Error("Failed to get user stats");
  }
}

/**
 * Get user's total badge points
 */
export async function getUserBadgePoints(userId: string): Promise<number> {
  try {
    const completedBadges = await db.userBadge.findMany({
      where: {
        userId,
        completed: true,
      },
      include: {
        badge: {
          select: {
            points: true,
          },
        },
      },
    });

    return completedBadges.reduce(
      (total, userBadge) => total + userBadge.badge.points,
      0
    );
  } catch (error) {
    logger.error("Error getting user badge points:", error);
    return 0;
  }
}

/**
 * Get badge leaderboard
 */
export async function getBadgeLeaderboard(limit: number = 10) {
  try {
    // Get users with their completed badges and calculate points
    const usersWithBadges = await db.user.findMany({
      include: {
        badges: {
          where: { completed: true },
          include: { badge: true },
        },
      },
      take: 50, // Get more users to sort properly
    });

    // Calculate total points and badge count for each user
    const leaderboard = usersWithBadges
      .map((user) => {
        const totalPoints = user.badges.reduce(
          (sum, userBadge) => sum + userBadge.badge.points,
          0
        );
        const badgeCount = user.badges.length;

        return {
          userId: user.id,
          username: user.username,
          name: user.name,
          image: user.image,
          totalPoints,
          badgeCount,
        };
      })
      .filter((user) => user.totalPoints > 0) // Only users with badges
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    return leaderboard;
  } catch (error) {
    logger.error("Error getting badge leaderboard:", error);
    return [];
  }
}
