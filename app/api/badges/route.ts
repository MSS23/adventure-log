import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/badges - Get all badges and user's progress
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active badges
    const badges = await db.badge.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { requirement: "asc" }],
    });

    // Get user's badge progress
    const userBadges = await db.userBadge.findMany({
      where: { userId: session.user.id },
      include: { badge: true },
    });

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
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
