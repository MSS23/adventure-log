import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET /api/user/stats - Get current user's statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data with computed stats
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        albums: {
          include: {
            photos: true,
            _count: {
              select: {
                favorites: true,
              },
            },
          },
        },
        badges: {
          where: { completed: true },
          include: {
            badge: true,
          },
        },
        _count: {
          select: {
            albums: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate statistics
    const totalAlbums = user.albums.length;
    const totalPhotos = user.albums.reduce(
      (sum, album) => sum + album.photos.length,
      0
    );
    const totalFavorites = user.albums.reduce(
      (sum, album) => sum + album._count.favorites,
      0
    );

    // Count unique countries visited
    const uniqueCountries = new Set(
      user.albums.map((album) => album.country.toLowerCase().trim())
    );
    const totalCountriesVisited = uniqueCountries.size;

    // Get badges info
    const completedBadges = user.badges.filter((ub) => ub.completed);
    const totalBadgesEarned = completedBadges.length;

    // Get recent albums (last 5)
    const recentAlbums = user.albums
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((album) => ({
        id: album.id,
        title: album.title,
        country: album.country,
        city: album.city,
        photosCount: album.photos.length,
        favoritesCount: album._count.favorites,
        coverPhotoUrl: album.photos[0]?.url || null,
        createdAt: album.createdAt,
      }));

    // Calculate travel streak (albums created in consecutive months/weeks)
    const albumsByDate = user.albums
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((album) => new Date(album.createdAt));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (albumsByDate.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Calculate current streak (albums in recent weeks)
      for (const albumDate of albumsByDate) {
        const daysDiff = Math.floor(
          (today.getTime() - albumDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 30) {
          // Within last 30 days
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate longest streak
      let lastDate = albumsByDate[0];
      tempStreak = 1;

      for (let i = 1; i < albumsByDate.length; i++) {
        const currentDate = albumsByDate[i];
        const daysDiff = Math.floor(
          (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff <= 60) {
          // Within 60 days of each other
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        lastDate = currentDate;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Update user stats in database (this helps keep the computed stats up to date)
    await db.user.update({
      where: { id: session.user.id },
      data: {
        totalCountriesVisited,
        totalAlbumsCount: totalAlbums,
        totalPhotosCount: totalPhotos,
        currentStreak,
        longestStreak,
        lastAlbumDate: albumsByDate.length > 0 ? albumsByDate[0] : null,
      },
    });

    const stats = {
      totalCountriesVisited,
      totalAlbumsCount: totalAlbums,
      totalPhotosCount: totalPhotos,
      totalBadgesEarned,
      currentStreak,
      longestStreak,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      totalFavoritesReceived: totalFavorites,
      recentAlbums,
      completedBadges: completedBadges.map((ub) => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        category: ub.badge.category,
        rarity: ub.badge.rarity,
        unlockedAt: ub.unlockedAt,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
