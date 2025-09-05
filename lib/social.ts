import { db } from "./db";
import { logger } from "./logger";

/**
 * Calculate mutual friends between current user and target users
 */
export async function calculateMutualFriends(
  currentUserId: string,
  targetUserIds: string[]
): Promise<Map<string, number>> {
  try {
    if (targetUserIds.length === 0) {
      return new Map();
    }

    // Get all users that the current user is following
    const currentUserFollowing = await db.follow.findMany({
      where: {
        followerId: currentUserId,
      },
      select: {
        followingId: true,
      },
    });

    const currentUserFollowingSet = new Set(
      currentUserFollowing.map((f) => f.followingId)
    );

    // Get all users that each target user is following
    const targetUsersFollowing = await db.follow.findMany({
      where: {
        followerId: {
          in: targetUserIds,
        },
      },
      select: {
        followerId: true,
        followingId: true,
      },
    });

    // Group by target user
    const followingByUser = new Map<string, Set<string>>();

    for (const follow of targetUsersFollowing) {
      if (!followingByUser.has(follow.followerId)) {
        followingByUser.set(follow.followerId, new Set());
      }
      followingByUser.get(follow.followerId)!.add(follow.followingId);
    }

    // Calculate mutual friends for each target user
    const mutualFriends = new Map<string, number>();

    for (const targetUserId of targetUserIds) {
      const targetFollowing = followingByUser.get(targetUserId) || new Set();

      // Count intersections (excluding self and the target user)
      let mutualCount = 0;
      for (const followingId of targetFollowing) {
        if (
          followingId !== currentUserId &&
          followingId !== targetUserId &&
          currentUserFollowingSet.has(followingId)
        ) {
          mutualCount++;
        }
      }

      mutualFriends.set(targetUserId, mutualCount);
    }

    return mutualFriends;
  } catch (error) {
    logger.error("Error calculating mutual friends", {
      currentUserId,
      targetUserIds: targetUserIds.length,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return empty map on error
    const errorMap = new Map<string, number>();
    for (const userId of targetUserIds) {
      errorMap.set(userId, 0);
    }
    return errorMap;
  }
}

/**
 * Get mutual friends list between two users
 */
export async function getMutualFriendsList(
  currentUserId: string,
  targetUserId: string
): Promise<
  Array<{
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  }>
> {
  try {
    // Get users that both current user and target user are following
    const mutualFriends = await db.user.findMany({
      where: {
        id: {
          in: await db.follow
            .findMany({
              where: { followerId: currentUserId },
              select: { followingId: true },
            })
            .then((follows) => follows.map((f) => f.followingId)),
        },
        followers: {
          some: {
            followerId: targetUserId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
    });

    return mutualFriends;
  } catch (error) {
    logger.error("Error getting mutual friends list", {
      currentUserId,
      targetUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get user's social connections summary
 */
export async function getUserSocialSummary(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      followersCount: user._count.followers,
      followingCount: user._count.following,
    };
  } catch (error) {
    logger.error("Error getting user social summary", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      followersCount: 0,
      followingCount: 0,
    };
  }
}

/**
 * Check if user A follows user B
 */
export async function checkFollowStatus(
  followerId: string,
  followingId: string
): Promise<boolean> {
  try {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  } catch (error) {
    logger.error("Error checking follow status", {
      followerId,
      followingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get follow status for multiple users
 */
export async function getFollowStatusForUsers(
  currentUserId: string,
  targetUserIds: string[]
): Promise<Map<string, boolean>> {
  try {
    const follows = await db.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: {
          in: targetUserIds,
        },
      },
      select: {
        followingId: true,
      },
    });

    const followingSet = new Set(follows.map((f) => f.followingId));

    const statusMap = new Map<string, boolean>();
    for (const userId of targetUserIds) {
      statusMap.set(userId, followingSet.has(userId));
    }

    return statusMap;
  } catch (error) {
    logger.error("Error getting follow status for users", {
      currentUserId,
      targetUserIds: targetUserIds.length,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return false for all users on error
    const errorMap = new Map<string, boolean>();
    for (const userId of targetUserIds) {
      errorMap.set(userId, false);
    }
    return errorMap;
  }
}

/**
 * Get suggested users to follow based on mutual connections
 */
export async function getSuggestedUsers(
  currentUserId: string,
  limit: number = 10
) {
  try {
    // Get users followed by people that the current user follows
    // (friends of friends logic)
    const suggestions = await db.user.findMany({
      where: {
        AND: [
          // Not the current user
          { id: { not: currentUserId } },
          // Not already followed by current user
          {
            followers: {
              none: {
                followerId: currentUserId,
              },
            },
          },
          // Has mutual connections
          {
            followers: {
              some: {
                follower: {
                  followers: {
                    some: {
                      followerId: currentUserId,
                    },
                  },
                },
              },
            },
          },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        location: true,
        totalCountriesVisited: true,
        totalAlbumsCount: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    // Calculate mutual friends for suggestions
    const userIds = suggestions.map((u) => u.id);
    const mutualFriendsMap = await calculateMutualFriends(
      currentUserId,
      userIds
    );

    return suggestions.map((user) => ({
      ...user,
      mutualFriends: mutualFriendsMap.get(user.id) || 0,
    }));
  } catch (error) {
    logger.error("Error getting suggested users", {
      currentUserId,
      limit,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
