import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/social/feed - Get activity feed from followed users and public content
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get users that the current user is following
    const followedUsers = await db.follow.findMany({
      where: {
        followerId: session.user.id,
      },
      select: {
        followingId: true,
      },
    });

    const followedUserIds = followedUsers.map((f) => f.followingId);

    // Get recent albums from followed users and public albums
    const albums = await db.album.findMany({
      where: {
        OR: [
          // Albums from followed users (any privacy level if following)
          {
            userId: {
              in: followedUserIds,
            },
          },
          // Public albums from everyone (excluding own albums)
          {
            privacy: "PUBLIC",
            userId: {
              not: session.user.id,
            },
          },
          // Own albums
          {
            userId: session.user.id,
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        photos: {
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            url: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Get likes and comments count for each album
    const albumIds = albums.map((album) => album.id);

    const likesCount = await db.like.groupBy({
      by: ["targetId"],
      where: {
        targetType: "Album",
        targetId: {
          in: albumIds,
        },
      },
      _count: {
        id: true,
      },
    });

    const commentsCount = await db.comment.groupBy({
      by: ["targetId"],
      where: {
        targetType: "Album",
        targetId: {
          in: albumIds,
        },
      },
      _count: {
        id: true,
      },
    });

    // Check which albums the current user has liked
    const userLikes = await db.like.findMany({
      where: {
        userId: session.user.id,
        targetType: "Album",
        targetId: {
          in: albumIds,
        },
      },
      select: {
        targetId: true,
      },
    });

    const likedAlbumIds = new Set(userLikes.map((like) => like.targetId));

    // Create activity feed format
    const feedItems = albums.map((album) => {
      const likesForAlbum =
        likesCount.find((lc) => lc.targetId === album.id)?._count.id || 0;
      const commentsForAlbum =
        commentsCount.find((cc) => cc.targetId === album.id)?._count.id || 0;
      const isLikedByUser = likedAlbumIds.has(album.id);

      // Determine action based on creation time and user
      let action = "created a new album";
      if (album.userId === session.user.id) {
        action = "created an album";
      } else if (followedUserIds.includes(album.userId)) {
        action = "shared a new album";
      } else {
        action = "created a public album";
      }

      return {
        id: album.id,
        type: "album",
        action,
        content: album.title,
        user: {
          id: album.user.id,
          name: album.user.name,
          username: album.user.username,
          image: album.user.image,
        },
        location: album.city
          ? `${album.city}, ${album.country}`
          : album.country,
        photosCount: album._count.photos,
        privacy: album.privacy,
        coverPhoto: album.photos[0]?.url || null,
        createdAt: album.createdAt,
        likes: likesForAlbum,
        comments: commentsForAlbum,
        isLikedByUser,
        // Calculate time ago
        time: getTimeAgo(album.createdAt),
      };
    });

    const total = await db.album.count({
      where: {
        OR: [
          {
            userId: {
              in: followedUserIds,
            },
          },
          {
            privacy: "PUBLIC",
            userId: {
              not: session.user.id,
            },
          },
          {
            userId: session.user.id,
          },
        ],
      },
    });

    return NextResponse.json({
      feedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths < 12) return `${diffMonths} months ago`;

  return past.toLocaleDateString();
}
