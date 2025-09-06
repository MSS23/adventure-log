import { createClient } from "@/lib/supabase/server";
import { db } from "./db";
import type { Privacy } from "@prisma/client";

/**
 * Get the current user from session (server-side)
 * Throws an error if user is not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: No valid session");
  }

  return {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.name || "",
    image: user.user_metadata?.avatar_url || null,
  };
}

/**
 * Get the current user or return null if not authenticated
 */
export async function getCurrentUserOptional() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || "",
      image: user.user_metadata?.avatar_url || null,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user has admin role
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

/**
 * Authorization helper for Album/Photo/Comment based on privacy rules
 * PUBLIC: visible to all
 * FRIENDS_ONLY: visible only if requester is friend (FriendRequest accepted either direction)
 * PRIVATE: only owner
 */
export async function assertOwnerOrFriend(
  resourceOwnerId: string,
  privacy: Privacy
) {
  const currentUser = await getCurrentUserOptional();

  // For PUBLIC content, everyone can access (even unauthenticated)
  if (privacy === "PUBLIC") {
    return true;
  }

  // For FRIENDS_ONLY and PRIVATE, user must be authenticated
  if (!currentUser) {
    throw new Error("Unauthorized: Authentication required");
  }

  // Owner can always access their own content
  if (currentUser.id === resourceOwnerId) {
    return true;
  }

  // For PRIVATE content, only owner can access
  if (privacy === "PRIVATE") {
    throw new Error("Forbidden: Private content - owner access only");
  }

  // For FRIENDS_ONLY, check if users are friends
  if (privacy === "FRIENDS_ONLY") {
    const friendship = await db.friendRequest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: currentUser.id, receiverId: resourceOwnerId },
          { senderId: resourceOwnerId, receiverId: currentUser.id },
        ],
      },
    });

    if (!friendship) {
      throw new Error("Forbidden: Friends only content - friendship required");
    }
  }

  return true;
}

/**
 * Assert that the current user owns a resource
 */
export async function assertOwnership(resourceOwnerId: string) {
  const currentUser = await getCurrentUser();

  if (currentUser.id !== resourceOwnerId) {
    throw new Error("Forbidden: Resource ownership required");
  }

  return true;
}

/**
 * Check if two users are friends (accepted friend request either direction)
 */
export async function areUsersFriends(
  userId1: string,
  userId2: string
): Promise<boolean> {
  if (userId1 === userId2) return true; // Same user

  const friendship = await db.friendRequest.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
  });

  return !!friendship;
}

/**
 * Get user's visible albums based on privacy settings and friendship
 */
export async function getUserVisibleAlbums(
  targetUserId: string,
  limit: number = 10,
  offset: number = 0
) {
  const currentUser = await getCurrentUserOptional();

  // Build privacy filter
  const privacyFilter: any = { userId: targetUserId };

  if (!currentUser || currentUser.id !== targetUserId) {
    // Not the owner - need to filter by privacy
    const visibilityConditions: any[] = [
      { privacy: "PUBLIC" }, // Always include public
    ];

    if (currentUser) {
      // Check if current user is friends with target user
      const areFriends = await areUsersFriends(currentUser.id, targetUserId);
      if (areFriends) {
        visibilityConditions.push({ privacy: "FRIENDS_ONLY" });
      }
    }

    privacyFilter.OR = visibilityConditions;
  }

  return await db.album.findMany({
    where: privacyFilter,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
      _count: {
        select: {
          photos: true,
          favorites: true,
        },
      },
    },
  });
}

// Re-export rate limiting from the centralized module
export { enforceRateLimit as rateLimit } from "./rate-limit";
