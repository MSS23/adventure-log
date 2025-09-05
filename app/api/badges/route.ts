import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET /api/badges - Get all badges and user's progress
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Test database connection
      await db.$connect();

      // Get all active badges with error handling
      let badges: any[] = [];
      try {
        badges = await db.badge.findMany({
          where: { isActive: true },
          orderBy: [{ category: "asc" }, { requirement: "asc" }],
        });
      } catch (error) {
        logger.warn("Failed to fetch badges from database:", { error });
        // If badges table is empty or doesn't exist, return empty but valid response
        badges = [];
      }

      // Get user's badge progress with error handling
      let userBadges: any[] = [];
      try {
        userBadges = await db.userBadge.findMany({
          where: { userId: session.user.id },
          include: { badge: true },
        });
      } catch (error) {
        logger.warn("Failed to fetch user badges:", { error });
        userBadges = [];
      }

      // Handle case where no badges exist in database (not seeded yet)
      if (badges.length === 0) {
        logger.info("No badges found in database - may need seeding");
        return NextResponse.json({
          badges: [], { badgesByCategory: {},
          totalBadges: 0,
          unlockedBadges: 0,
          _needsSeeding: true,
          message: "Badges system is being set up. Please check back soon!",
        } });
      }

      // Create map of user progress
      const progressMap = new Map(userBadges.map((ub) => [ub.badgeId, ub]));

      // Combine badge info with user progress
      const badgesWithProgress = badges.map((badge) => {
        const userProgress = progressMap.get(badge.id);
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          requirement: badge.requirement,
          requirementType: badge.requirementType,
          rarity: badge.rarity,
          points: badge.points,
          progress: userProgress?.progress || 0,
          completed: userProgress?.completed || false,
          unlockedAt: userProgress?.unlockedAt || null,
        };
      });

      // Group by category
      const badgesByCategory = badgesWithProgress.reduce(
        (acc, badge) => {
          if (!acc[badge.category]) {
            acc[badge.category] = [];
          }
          acc[badge.category].push(badge);
          return acc;
        },
        {} as Record<string, typeof badgesWithProgress>
      );

      return NextResponse.json({
        badges: badgesWithProgress,
        badgesByCategory,
        totalBadges: badges.length,
        unlockedBadges: badgesWithProgress.filter((b) => b.completed).length,
      });
    } catch (dbError) {
      logger.error("Database connection failed for badges:", { error: dbError });

      // Return empty but valid structure when database is unavailable
      return NextResponse.json({
        badges: [],
        badgesByCategory: {},
        totalBadges: 0,
        unlockedBadges: 0,
        _databaseUnavailable: true,
        message: "Unable to load badges. Database connection issue.",
      });
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    logger.error("Error fetching badges:", { error });

    // Return empty but valid structure for any other errors
    return NextResponse.json({
      badges: [],
      badgesByCategory: {},
      totalBadges: 0,
      unlockedBadges: 0,
      _error: true,
      message: "Failed to load badges. Please try again later.",
    });
  }
}
