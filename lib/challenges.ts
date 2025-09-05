import { ChallengeType } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface ChallengeDefinition {
  title: string;
  description: string;
  type: ChallengeType;
  target: number;
  durationDays: number;
  rewards: {
    points: number;
    badgeId?: string;
  };
}

// Pre-defined challenge templates
export const CHALLENGE_TEMPLATES: ChallengeDefinition[] = [
  // Monthly challenges
  {
    title: "New Year Explorer",
    description: "Visit 12 countries in one year",
    type: ChallengeType.COUNTRIES_IN_YEAR,
    target: 12,
    durationDays: 365,
    rewards: {
      points: 500,
    },
  },
  {
    title: "Monthly Adventurer",
    description: "Create 4 trips in one month",
    type: ChallengeType.TRIPS_IN_MONTH,
    target: 4,
    durationDays: 30,
    rewards: {
      points: 100,
    },
  },
  {
    title: "Photo Marathon",
    description: "Upload 100 photos in one trip",
    type: ChallengeType.PHOTOS_IN_TRIP,
    target: 100,
    durationDays: 30,
    rewards: {
      points: 150,
    },
  },
  {
    title: "Streak Master",
    description: "Maintain 6-month travel streak",
    type: ChallengeType.STREAK_MAINTAIN,
    target: 6,
    durationDays: 180,
    rewards: {
      points: 300,
    },
  },
  {
    title: "Social Butterfly",
    description: "Get 50 likes and 20 comments this month",
    type: ChallengeType.SOCIAL_ENGAGEMENT,
    target: 70, // Combined likes + comments
    durationDays: 30,
    rewards: {
      points: 200,
    },
  },

  // Weekly challenges
  {
    title: "Weekend Explorer",
    description: "Visit 2 new countries this week",
    type: ChallengeType.COUNTRIES_IN_YEAR,
    target: 2,
    durationDays: 7,
    rewards: {
      points: 50,
    },
  },
  {
    title: "Weekly Storyteller",
    description: "Create 2 albums this week",
    type: ChallengeType.TRIPS_IN_MONTH,
    target: 2,
    durationDays: 7,
    rewards: {
      points: 40,
    },
  },
  {
    title: "Photo Sprint",
    description: "Upload 50 photos this week",
    type: ChallengeType.PHOTOS_IN_TRIP,
    target: 50,
    durationDays: 7,
    rewards: {
      points: 30,
    },
  },

  // Seasonal challenges
  {
    title: "Spring Awakening",
    description: "Visit 6 countries during spring",
    type: ChallengeType.COUNTRIES_IN_YEAR,
    target: 6,
    durationDays: 90,
    rewards: {
      points: 250,
    },
  },
  {
    title: "Summer Wanderer",
    description: "Create 8 albums during summer",
    type: ChallengeType.TRIPS_IN_MONTH,
    target: 8,
    durationDays: 90,
    rewards: {
      points: 200,
    },
  },
];

/**
 * Create active challenges for all users
 */
export async function createActiveChallenges(): Promise<void> {
  try {
    const now = new Date();

    // Create monthly challenges (1st of each month)
    if (now.getDate() === 1) {
      await createMonthlyChallenge(now);
    }

    // Create weekly challenges (every Monday)
    if (now.getDay() === 1) {
      await createWeeklyChallenge(now);
    }

    // Create seasonal challenges (start of each season)
    const month = now.getMonth();
    if ([2, 5, 8, 11].includes(month) && now.getDate() === 21) {
      await createSeasonalChallenge(now, month);
    }

    logger.info("Active challenges created successfully");
  } catch (error) {
    logger.error("Error creating active challenges:", { error: error });
    throw new Error("Failed to create active challenges");
  }
}

/**
 * Create monthly challenge
 */
async function createMonthlyChallenge(startDate: Date): Promise<void> {
  const monthlyTemplates = CHALLENGE_TEMPLATES.filter(
    (t) => t.durationDays === 30
  );
  const template =
    monthlyTemplates[Math.floor(Math.random() * monthlyTemplates.length)];

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + template.durationDays);

  await db.challenge.create({
    data: {
      title: template.title,
      description: template.description,
      type: template.type,
      target: template.target,
      startDate,
      endDate,
      rewards: JSON.stringify(template.rewards),
    },
  });
}

/**
 * Create weekly challenge
 */
async function createWeeklyChallenge(startDate: Date): Promise<void> {
  const weeklyTemplates = CHALLENGE_TEMPLATES.filter(
    (t) => t.durationDays === 7
  );
  const template =
    weeklyTemplates[Math.floor(Math.random() * weeklyTemplates.length)];

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + template.durationDays);

  await db.challenge.create({
    data: {
      title: template.title,
      description: template.description,
      type: template.type,
      target: template.target,
      startDate,
      endDate,
      rewards: JSON.stringify(template.rewards),
    },
  });
}

/**
 * Create seasonal challenge
 */
async function createSeasonalChallenge(
  startDate: Date,
  month: number
): Promise<void> {
  const seasonalTemplates = CHALLENGE_TEMPLATES.filter(
    (t) => t.durationDays === 90
  );
  const template =
    seasonalTemplates[Math.floor(Math.random() * seasonalTemplates.length)];

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + template.durationDays);

  // Customize title based on season
  const seasons = [
    "Spring Awakening",
    "Summer Wanderer",
    "Autumn Explorer",
    "Winter Adventurer",
  ];
  const seasonIndex = Math.floor(month / 3);
  const seasonalTitle =
    template.title.includes("Spring") || template.title.includes("Summer")
      ? template.title
      : `${seasons[seasonIndex]} - ${template.description.split(" ").slice(0, 2).join(" ")}`;

  await db.challenge.create({
    data: {
      title: seasonalTitle,
      description: template.description,
      type: template.type,
      target: template.target,
      startDate,
      endDate,
      rewards: JSON.stringify(template.rewards),
    },
  });
}

/**
 * Join user to active challenges
 */
export async function joinUserToActiveChallenges(
  userId: string
): Promise<void> {
  try {
    const activeChallenges = await db.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    for (const challenge of activeChallenges) {
      // Check if user is already in this challenge
      const existingParticipation = await db.userChallenge.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId: challenge.id,
          },
        },
      });

      if (!existingParticipation) {
        await db.userChallenge.create({
          data: {
            userId,
            challengeId: challenge.id,
          },
        });
      }
    }

    logger.info(`User ${userId} joined active challenges`);
  } catch (error) {
    logger.error("Error joining user to challenges:", { error: error });
  }
}

/**
 * Update user challenge progress
 */
export async function updateChallengeProgress(
  userId: string,
  activityType: string
): Promise<void> {
  try {
    const userChallenges = await db.userChallenge.findMany({
      where: {
        userId,
        completed: false,
        challenge: {
          isActive: true,
          endDate: { gte: new Date() },
        },
      },
      include: {
        challenge: true,
      },
    });

    for (const userChallenge of userChallenges) {
      const challenge = userChallenge.challenge;
      let progressIncrement = 0;

      // Determine progress increment based on activity type and challenge type
      switch (challenge.type) {
        case ChallengeType.COUNTRIES_IN_YEAR:
          if (activityType === "COUNTRY_VISITED") {
            progressIncrement = 1;
          }
          break;
        case ChallengeType.TRIPS_IN_MONTH:
          if (activityType === "ALBUM_CREATED") {
            progressIncrement = 1;
          }
          break;
        case ChallengeType.PHOTOS_IN_TRIP:
          if (activityType === "PHOTO_UPLOADED") {
            progressIncrement = 1;
          }
          break;
        case ChallengeType.SOCIAL_ENGAGEMENT:
          if (
            activityType === "CONTENT_LIKED" ||
            activityType === "CONTENT_COMMENTED"
          ) {
            progressIncrement = 1;
          }
          break;
        case ChallengeType.STREAK_MAINTAIN:
          // Streak is maintained differently, updated separately
          break;
      }

      if (progressIncrement > 0) {
        const newProgress = userChallenge.progress + progressIncrement;
        const isCompleted = newProgress >= challenge.target;

        await db.userChallenge.update({
          where: { id: userChallenge.id },
          data: {
            progress: newProgress,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });

        // If challenge completed, award rewards
        if (isCompleted && !userChallenge.completed) {
          await awardChallengeRewards(userId, challenge);
        }
      }
    }
  } catch (error) {
    logger.error("Error updating challenge progress:", { error: error });
  }
}

/**
 * Award rewards for completed challenges
 */
async function awardChallengeRewards(
  userId: string,
  challenge: any
): Promise<void> {
  try {
    const rewards = challenge.rewards
      ? JSON.parse(challenge.rewards)
      : { points: 0 };

    // Create activity record
    await db.activity.create({
      data: {
        userId,
        type: "CHALLENGE_COMPLETED",
        targetType: "Challenge",
        targetId: challenge.id,
        metadata: JSON.stringify({
          challengeTitle: challenge.title,
          pointsEarned: rewards.points,
          targetAchieved: challenge.target,
        }),
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId,
        type: "CHALLENGE_COMPLETED",
        title: "Challenge Complete! 🎉",
        content: `You've completed the "${challenge.title}" challenge and earned ${rewards.points} points!`,
        metadata: JSON.stringify({
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          pointsEarned: rewards.points,
          badgeId: rewards.badgeId,
        }),
      },
    });

    logger.info(`Challenge completed: ${challenge.title} by user ${userId}`);
  } catch (error) {
    logger.error("Error awarding challenge rewards:", { error: error });
  }
}

/**
 * Get user's active challenges
 */
export async function getUserChallenges(userId: string): Promise<any[]> {
  try {
    const userChallenges = await db.userChallenge.findMany({
      where: {
        userId,
        challenge: {
          isActive: true,
          endDate: { gte: new Date() },
        },
      },
      include: {
        challenge: true,
      },
      orderBy: {
        challenge: {
          endDate: "asc",
        },
      },
    });

    return userChallenges.map((uc) => {
      const rewards = uc.challenge.rewards
        ? JSON.parse(uc.challenge.rewards)
        : { points: 0 };
      const progressPercentage = Math.min(
        100,
        (uc.progress / uc.challenge.target) * 100
      );
      const timeRemaining = Math.max(
        0,
        uc.challenge.endDate.getTime() - Date.now()
      );
      const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));

      return {
        id: uc.id,
        challengeId: uc.challenge.id,
        title: uc.challenge.title,
        description: uc.challenge.description,
        type: uc.challenge.type,
        target: uc.challenge.target,
        progress: uc.progress,
        progressPercentage,
        completed: uc.completed,
        completedAt: uc.completedAt,
        endDate: uc.challenge.endDate,
        daysRemaining,
        rewards,
      };
    });
  } catch (error) {
    logger.error("Error getting user challenges:", { error: error });
    return [];
  }
}

/**
 * Get global challenge leaderboard
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const participants = await db.userChallenge.findMany({
      where: {
        challengeId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        challenge: true,
      },
      orderBy: [
        { completed: "desc" }, // Completed challenges first
        { progress: "desc" }, // Then by progress
        { completedAt: "asc" }, // Then by completion time (earlier is better)
      ],
      take: limit,
    });

    return participants.map((p, index) => ({
      rank: index + 1,
      userId: p.user.id,
      username: p.user.username,
      name: p.user.name,
      image: p.user.image,
      progress: p.progress,
      target: p.challenge.target,
      completed: p.completed,
      completedAt: p.completedAt,
      progressPercentage: Math.min(
        100,
        (p.progress / p.challenge.target) * 100
      ),
    }));
  } catch (error) {
    logger.error("Error getting challenge leaderboard:", { error: error });
    return [];
  }
}

/**
 * Clean up expired challenges
 */
export async function cleanupExpiredChallenges(): Promise<void> {
  try {
    const expiredChallenges = await db.challenge.findMany({
      where: {
        endDate: { lt: new Date() },
        isActive: true,
      },
    });

    for (const challenge of expiredChallenges) {
      await db.challenge.update({
        where: { id: challenge.id },
        data: { isActive: false },
      });
    }

    logger.info(`Cleaned up ${expiredChallenges.length} expired challenges`);
  } catch (error) {
    logger.error("Error cleaning up expired challenges:", { error: error });
  }
}
