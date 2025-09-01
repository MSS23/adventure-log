import { BadgeCategory, BadgeRequirementType } from "@prisma/client";

import { db } from "@/lib/db";

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
      const currentProgress = await getUserBadgeProgress(userId, badge.id);
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
    console.error("Error checking badges:", error);
    return [];
  }
}

async function getUserBadgeProgress(
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
      rarity: "COMMON" as const,
      points: 10,
    },
    {
      name: "Explorer",
      description: "Visit 5 different countries",
      icon: "🗺️",
      category: BadgeCategory.COUNTRIES,
      requirement: 5,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: "COMMON" as const,
      points: 25,
    },
    {
      name: "Globetrotter",
      description: "Visit 15 countries",
      icon: "✈️",
      category: BadgeCategory.COUNTRIES,
      requirement: 15,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: "RARE" as const,
      points: 50,
    },
    {
      name: "World Traveler",
      description: "Visit 30 countries",
      icon: "🌎",
      category: BadgeCategory.COUNTRIES,
      requirement: 30,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: "EPIC" as const,
      points: 100,
    },
    {
      name: "Master Explorer",
      description: "Visit 50 countries",
      icon: "👑",
      category: BadgeCategory.COUNTRIES,
      requirement: 50,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
      rarity: "LEGENDARY" as const,
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
      rarity: "COMMON" as const,
      points: 10,
    },
    {
      name: "Storyteller",
      description: "Create 10 albums",
      icon: "📚",
      category: BadgeCategory.TRIPS,
      requirement: 10,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
      rarity: "RARE" as const,
      points: 50,
    },
    {
      name: "Chronicle Master",
      description: "Create 25 albums",
      icon: "🏆",
      category: BadgeCategory.TRIPS,
      requirement: 25,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
      rarity: "EPIC" as const,
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
      rarity: "COMMON" as const,
      points: 25,
    },
    {
      name: "Photographer",
      description: "Upload 250 photos",
      icon: "🎭",
      category: BadgeCategory.PHOTOS,
      requirement: 250,
      requirementType: BadgeRequirementType.PHOTOS_UPLOADED,
      rarity: "RARE" as const,
      points: 75,
    },
    {
      name: "Photo Master",
      description: "Upload 1000 photos",
      icon: "🎨",
      category: BadgeCategory.PHOTOS,
      requirement: 1000,
      requirementType: BadgeRequirementType.PHOTOS_UPLOADED,
      rarity: "EPIC" as const,
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
      rarity: "RARE" as const,
      points: 50,
    },
    {
      name: "Travel Celebrity",
      description: "Get 100 followers",
      icon: "💎",
      category: BadgeCategory.SOCIAL,
      requirement: 100,
      requirementType: BadgeRequirementType.FOLLOWERS_COUNT,
      rarity: "LEGENDARY" as const,
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
      rarity: "RARE" as const,
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

  console.log(`Initialized ${defaultBadges.length} default badges`);
}
