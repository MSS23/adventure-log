import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { handleApiError, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { getUserBadgePoints } from "@/lib/badges";
import { getUserChallenges } from "@/lib/challenges";

/**
 * GET /api/gamification/stats - Get comprehensive user achievement statistics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview"; // overview, detailed, leaderboard

    switch (type) {
      case "overview":
        return ok(await getUserOverviewStats(user.id));

      case "detailed":
        return ok(await getUserDetailedStats(user.id));

      case "leaderboard":
        const category = searchParams.get("category") || "points";
        return ok(await getGlobalLeaderboard(category));

      default:
        return ok(await getUserOverviewStats(user.id));
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get user overview statistics for dashboard
 */
async function getUserOverviewStats(userId: string) {
  const [
    user,
    badgePoints,
    activeChallenges,
    completedBadges,
    recentActivities,
  ] = await Promise.all([
    // Basic user stats
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
            following: true,
          },
        },
      },
    }),

    // Badge points
    getUserBadgePoints(userId),

    // Active challenges
    getUserChallenges(userId),

    // Completed badges count
    db.userBadge.count({
      where: {
        userId,
        completed: true,
      },
    }),

    // Recent badge/challenge activities
    db.activity.findMany({
      where: {
        userId,
        type: {
          in: ["BADGE_EARNED", "CHALLENGE_COMPLETED"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate rank in various categories
  const [pointsRank, countriesRank, albumsRank] = await Promise.all([
    getUserRank(userId, "points"),
    getUserRank(userId, "countries"),
    getUserRank(userId, "albums"),
  ]);

  return {
    overview: {
      totalPoints: badgePoints,
      completedBadges,
      activeChallenges: activeChallenges.length,
      currentStreak: user.currentStreak || 0,
    },
    stats: {
      countriesVisited: user.totalCountriesVisited || 0,
      albumsCreated: user.totalAlbumsCount || 0,
      photosUploaded: user.totalPhotosCount || 0,
      followers: user._count.followers,
      following: user._count.following,
    },
    rankings: {
      pointsRank,
      countriesRank,
      albumsRank,
    },
    recentAchievements: recentActivities.map((activity) => ({
      type: activity.type,
      createdAt: activity.createdAt,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    })),
  };
}

/**
 * Get detailed user statistics with trends
 */
async function getUserDetailedStats(userId: string) {
  const [
    monthlyAlbums,
    monthlyCountries,
    badgesByCategory,
    challengeHistory,
    socialStats,
  ] = await Promise.all([
    // Monthly album creation trend (last 12 months)
    getMonthlyTrend(userId, "albums"),

    // Monthly country visits trend
    getMonthlyTrend(userId, "countries"),

    // Badges by category
    db.userBadge.findMany({
      where: {
        userId,
        completed: true,
      },
      include: {
        badge: true,
      },
    }),

    // Challenge completion history
    db.userChallenge.findMany({
      where: {
        userId,
        completed: true,
      },
      include: {
        challenge: true,
      },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),

    // Social engagement stats
    getSocialEngagementStats(userId),
  ]);

  // Group badges by category
  const badgeCategories = badgesByCategory.reduce(
    (acc, userBadge) => {
      const category = userBadge.badge.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        name: userBadge.badge.name,
        icon: userBadge.badge.icon,
        rarity: userBadge.badge.rarity,
        points: userBadge.badge.points,
        unlockedAt: userBadge.unlockedAt,
      });
      return acc;
    },
    {} as Record<string, any[]>
  );

  return {
    trends: {
      albumsPerMonth: monthlyAlbums,
      countriesPerMonth: monthlyCountries,
    },
    badges: {
      byCategory: badgeCategories,
      total: badgesByCategory.length,
      totalPoints: badgesByCategory.reduce(
        (sum, ub) => sum + ub.badge.points,
        0
      ),
    },
    challenges: {
      completed: challengeHistory.map((uc) => ({
        title: uc.challenge.title,
        type: uc.challenge.type,
        completedAt: uc.completedAt,
        target: uc.challenge.target,
        rewards: uc.challenge.rewards ? JSON.parse(uc.challenge.rewards) : null,
      })),
      total: challengeHistory.length,
    },
    social: socialStats,
  };
}

/**
 * Get global leaderboards
 */
async function getGlobalLeaderboard(category: string) {
  switch (category) {
    case "points":
      return getPointsLeaderboard();
    case "countries":
      return getCountriesLeaderboard();
    case "albums":
      return getAlbumsLeaderboard();
    case "streaks":
      return getStreaksLeaderboard();
    default:
      return getPointsLeaderboard();
  }
}

/**
 * Get points leaderboard
 */
async function getPointsLeaderboard() {
<<<<<<< HEAD
  // TODO: Implement proper points leaderboard with join
  const topUsers = await db.user.findMany({
    take: 20,
    orderBy: {
      totalAlbumsCount: "desc",
    },
    select: {
      id: true,
      name: true,
      image: true,
      totalAlbumsCount: true,
    },
  });

  return topUsers.map((user, index) => ({
    rank: index + 1,
    user: user,
    points: user.totalAlbumsCount * 10, // TODO: Implement proper points calculation
  }));
=======
  const { getPointsLeaderboard: getLeaderboard } = await import("@/lib/points");
  return await getLeaderboard(20);
>>>>>>> oauth-upload-fixes
}

/**
 * Get countries leaderboard
 */
async function getCountriesLeaderboard() {
  const topUsers = await db.user.findMany({
    orderBy: {
      totalCountriesVisited: "desc",
    },
    take: 20,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      totalCountriesVisited: true,
    },
  });

  return topUsers.map((user, index) => ({
    rank: index + 1,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
    },
    countries: user.totalCountriesVisited || 0,
  }));
}

/**
 * Get albums leaderboard
 */
async function getAlbumsLeaderboard() {
  const topUsers = await db.user.findMany({
    orderBy: {
      totalAlbumsCount: "desc",
    },
    take: 20,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      totalAlbumsCount: true,
    },
  });

  return topUsers.map((user, index) => ({
    rank: index + 1,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
    },
    albums: user.totalAlbumsCount || 0,
  }));
}

/**
 * Get streaks leaderboard
 */
async function getStreaksLeaderboard() {
  const topUsers = await db.user.findMany({
    where: {
      currentStreak: {
        gt: 0,
      },
    },
    orderBy: {
      currentStreak: "desc",
    },
    take: 20,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      currentStreak: true,
    },
  });

  return topUsers.map((user, index) => ({
    rank: index + 1,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
    },
    streak: user.currentStreak || 0,
  }));
}

/**
 * Get user's rank in a specific category
 */
async function getUserRank(userId: string, category: string): Promise<number> {
  switch (category) {
    case "points":
      const pointsRank = (await db.$queryRaw`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT userId, SUM(b.points) as total_points
          FROM UserBadge ub
          JOIN Badge b ON ub.badgeId = b.id
          WHERE ub.completed = true
          GROUP BY userId
          HAVING total_points > (
            SELECT COALESCE(SUM(b2.points), 0)
            FROM UserBadge ub2
            JOIN Badge b2 ON ub2.badgeId = b2.id
            WHERE ub2.userId = ${userId} AND ub2.completed = true
          )
        ) as ranked_users
      `) as any[];
      return Number(pointsRank[0]?.rank || 1);

    case "countries":
      const countriesRank = await db.user.count({
        where: {
          totalCountriesVisited: {
            gt: await db.user
              .findUnique({
                where: { id: userId },
                select: { totalCountriesVisited: true },
              })
              .then((u) => u?.totalCountriesVisited || 0),
          },
        },
      });
      return countriesRank + 1;

    case "albums":
      const albumsRank = await db.user.count({
        where: {
          totalAlbumsCount: {
            gt: await db.user
              .findUnique({
                where: { id: userId },
                select: { totalAlbumsCount: true },
              })
              .then((u) => u?.totalAlbumsCount || 0),
          },
        },
      });
      return albumsRank + 1;

    default:
      return 1;
  }
}

/**
 * Get monthly trend data
 */
async function getMonthlyTrend(userId: string, type: "albums" | "countries") {
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    };
  }).reverse();

  if (type === "albums") {
    const albumCounts = await Promise.all(
      last12Months.map(async ({ year, month }) => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

        const count = await db.album.count({
          where: {
            userId,
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        });

        return count;
      })
    );

    return last12Months.map((month, index) => ({
      label: month.label,
      value: albumCounts[index],
    }));
  }

  // For countries, this would require more complex tracking
  // For now, return placeholder data
  return last12Months.map((month) => ({
    label: month.label,
    value: Math.floor(Math.random() * 3), // Placeholder
  }));
}

/**
 * Get social engagement statistics
 */
async function getSocialEngagementStats(userId: string) {
  const [likesReceived, commentsReceived, likesGiven, commentsGiven] =
    await Promise.all([
      // Likes received on user's content
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

      // Comments received
      db.comment.count({
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

      // Likes given
      db.like.count({
        where: { userId },
      }),

      // Comments given
      db.comment.count({
        where: { userId },
      }),
    ]);

  return {
    likesReceived,
    commentsReceived,
    likesGiven,
    commentsGiven,
    engagementRatio: likesReceived > 0 ? likesGiven / likesReceived : 0,
  };
}
