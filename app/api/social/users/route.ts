import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { calculateMutualFriends } from "@/lib/social";

// GET /api/social/users - Search and discover users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "suggested"; // 'search' or 'suggested'
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (type === "search" && query.trim()) {
      // Search users by name or username
      const users = await db.user.findMany({
        where: {
          AND: [
            {
              id: {
                not: session.user.id, // Exclude self
              },
            },
            {
              isPublic: true, // Only show public profiles
            },
            {
              OR: [
                {
                  name: {
                    contains: query,
                  },
                },
                {
                  username: {
                    contains: query,
                  },
                },
              ],
            },
          ],
        },
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
              following: true,
            },
          },
        },
        orderBy: [{ totalCountriesVisited: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      });

      // Check if current user is following these users
      const userIds = users.map((user) => user.id);
      const followingRelations = await db.follow.findMany({
        where: {
          followerId: session.user.id,
          followingId: {
            in: userIds,
          },
        },
        select: {
          followingId: true,
        },
      });

      const followingSet = new Set(
        followingRelations.map((f) => f.followingId)
      );

      // Calculate mutual friends
      const mutualFriendsMap = await calculateMutualFriends(
        session.user.id,
        userIds
      );

      const searchResults = users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        location: user.location,
        countriesVisited: user.totalCountriesVisited,
        albumsCount: user.totalAlbumsCount,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        isFollowing: followingSet.has(user.id),
        mutualFriends: mutualFriendsMap.get(user.id) || 0,
      }));

      return NextResponse.json({
        users: searchResults,
        type: "search",
        query,
      });
    } else {
      // Get suggested users (users with most activity, excluding already followed)
      const currentUserFollowing = await db.follow.findMany({
        where: {
          followerId: session.user.id,
        },
        select: {
          followingId: true,
        },
      });

      const alreadyFollowingIds = currentUserFollowing.map(
        (f) => f.followingId
      );
      alreadyFollowingIds.push(session.user.id); // Exclude self

      const suggestedUsers = await db.user.findMany({
        where: {
          AND: [
            {
              id: {
                notIn: alreadyFollowingIds,
              },
            },
            {
              isPublic: true,
            },
            {
              OR: [
                { totalCountriesVisited: { gt: 0 } },
                { totalAlbumsCount: { gt: 0 } },
              ],
            },
          ],
        },
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
              following: true,
            },
          },
        },
        orderBy: [
          { totalCountriesVisited: "desc" },
          { totalAlbumsCount: "desc" },
        ],
        take: limit,
        skip,
      });

      // Calculate mutual friends (simplified - users who follow the same people)
      const mutualFriendsData = await Promise.all(
        suggestedUsers.map(async (user) => {
          const theirFollowing = await db.follow.findMany({
            where: { followerId: user.id },
            select: { followingId: true },
          });

          const theirFollowingIds = new Set(
            theirFollowing.map((f) => f.followingId)
          );
          const myFollowingIds = new Set(
            currentUserFollowing.map((f) => f.followingId)
          );

          const mutualCount = [...theirFollowingIds].filter((id) =>
            myFollowingIds.has(id)
          ).length;

          return {
            userId: user.id,
            mutualFriends: mutualCount,
          };
        })
      );

      const mutualFriendsMap = new Map(
        mutualFriendsData.map((item) => [item.userId, item.mutualFriends])
      );

      const suggestions = suggestedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        location: user.location,
        countriesVisited: user.totalCountriesVisited,
        albumsCount: user.totalAlbumsCount,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        isFollowing: false, // By definition, these are users not followed
        mutualFriends: mutualFriendsMap.get(user.id) || 0,
      }));

      return NextResponse.json({
        users: suggestions,
        type: "suggested",
      });
    }
  } catch (error) {
    logger.error("Error fetching users:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
