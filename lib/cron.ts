import { logger } from "@/lib/logger";
import { initializeDefaultBadges } from "@/lib/badges";
import {
  createActiveChallenges,
  cleanupExpiredChallenges,
} from "@/lib/challenges";

/**
 * Daily cron job to maintain gamification system
 * This would typically be triggered by a cron service like Vercel Cron or AWS EventBridge
 */
export async function runDailyCronJobs(): Promise<void> {
  try {
    logger.info("Starting daily cron jobs...");

    await Promise.all([
      // Initialize badges if needed (idempotent)
      initializeDefaultBadges(),

      // Create new challenges based on schedule
      createActiveChallenges(),

      // Clean up expired challenges
      cleanupExpiredChallenges(),

      // Update user streaks (we'll implement this)
      updateUserStreaks(),
    ]);

    logger.info("Daily cron jobs completed successfully");
  } catch (error) {
    logger.error("Error running daily cron jobs:", error);
    throw error;
  }
}

/**
 * Update user travel streaks based on recent activity
 */
async function updateUserStreaks(): Promise<void> {
  try {
    const { db } = await import("@/lib/db");

    // Get all active users (had activity in last 30 days)
    const activeUsers = await db.user.findMany({
      where: {
        albums: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      include: {
        albums: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 12, // Last 12 months
        },
      },
    });

    for (const user of activeUsers) {
      const currentStreak = calculateUserStreak(
        user.albums.map((a) => a.createdAt)
      );

      if (currentStreak !== user.currentStreak) {
        await db.user.update({
          where: { id: user.id },
          data: { currentStreak },
        });

        // If streak increased, check for streak badges
        if (currentStreak > (user.currentStreak || 0)) {
          const { checkAndAwardBadges } = await import("@/lib/badges");
          await checkAndAwardBadges({
            userId: user.id,
            triggerType: "STREAK_UPDATED",
            metadata: {
              newStreak: currentStreak,
              oldStreak: user.currentStreak,
            },
          });
        }
      }
    }

    logger.info(`Updated streaks for ${activeUsers.length} users`);
  } catch (error) {
    logger.error("Error updating user streaks:", error);
  }
}

/**
 * Calculate user's current travel streak in months
 */
function calculateUserStreak(albumDates: Date[]): number {
  if (albumDates.length === 0) return 0;

  const sortedDates = albumDates
    .map((date) => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime());

  let currentStreak = 0;
  const currentMonth = new Date();
  currentMonth.setDate(1); // Start of current month

  // Check each month backwards from current
  for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
    const checkMonth = new Date(currentMonth);
    checkMonth.setMonth(checkMonth.getMonth() - monthsBack);

    const nextMonth = new Date(checkMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Check if user has any albums in this month
    const hasActivityInMonth = sortedDates.some(
      (date) => date >= checkMonth && date < nextMonth
    );

    if (hasActivityInMonth) {
      currentStreak++;
    } else {
      // Streak is broken
      break;
    }
  }

  return currentStreak;
}

/**
 * Initialize gamification system for new users
 */
export async function initializeGamificationForUser(
  userId: string
): Promise<void> {
  try {
    const { joinUserToActiveChallenges } = await import("@/lib/challenges");
    const { checkAndAwardBadges } = await import("@/lib/badges");

    await Promise.all([
      // Join user to active challenges
      joinUserToActiveChallenges(userId),

      // Check for any initial badges they might qualify for
      checkAndAwardBadges({
        userId,
        triggerType: "SOCIAL_ACTION",
        metadata: { action: "user_created" },
      }),
    ]);

    logger.info(`Initialized gamification for user ${userId}`);
  } catch (error) {
    logger.error("Error initializing gamification for user:", error);
  }
}

/**
 * Handle activity-based badge and challenge updates
 */
export async function handleUserActivity(
  userId: string,
  activityType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { checkAndAwardBadges } = await import("@/lib/badges");
    const { updateChallengeProgress } = await import("@/lib/challenges");

    await Promise.all([
      // Check for badge awards
      checkAndAwardBadges({
        userId,
        triggerType: activityType as any,
        metadata,
      }),

      // Update challenge progress
      updateChallengeProgress(userId, activityType),
    ]);
  } catch (error) {
    logger.error("Error handling user activity for gamification:", error);
  }
}
