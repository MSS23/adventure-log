import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user statistics in parallel for better performance
    const [
      albumStats,
      photoCount,
      locationStats,
      socialStats,
      badgeStats,
    ] = await Promise.all([
      // Album statistics
      db.album.aggregate({
        where: { userId },
        _count: { id: true },
      }),

      // Photo count across all albums
      db.albumPhoto.count({
        where: {
          album: { userId },
        },
      }),

      // Location statistics (countries and cities)
      Promise.all([
        db.album.findMany({
          where: { userId },
          select: { country: true },
        }),
        db.album.findMany({
          where: { userId },
          select: { city: true },
        }),
      ]),

      // Social statistics (followers/following)
      Promise.all([
        db.follow.count({
          where: { followerId: userId },
        }),
        db.follow.count({
          where: { followingId: userId },
        }),
      ]),

      // Badge statistics (earned badges)
      db.userBadge.count({
        where: { userId },
      }),
    ]);

    // Album privacy breakdown
    const albumPrivacyStats = await db.album.groupBy({
      by: ["privacy"],
      where: { userId },
      _count: { id: true },
    });

    const privacyBreakdown = {
      PUBLIC: 0,
      FRIENDS_ONLY: 0,
      PRIVATE: 0,
    };

    albumPrivacyStats.forEach((stat) => {
      if (stat.privacy in privacyBreakdown) {
        privacyBreakdown[stat.privacy as keyof typeof privacyBreakdown] = stat._count.id;
      }
    });

    const [countries, cities] = locationStats;
    const [followingCount, followersCount] = socialStats;

    // Filter and count unique non-null, non-empty locations
    const uniqueCountries = new Set(
      countries
        .map(c => c.country)
        .filter(country => country && country.trim() !== "")
    );
    const uniqueCities = new Set(
      cities
        .map(c => c.city)
        .filter(city => city && city.trim() !== "")
    );

    const stats = {
      totalAlbums: albumStats._count.id || 0,
      totalPhotos: photoCount || 0,
      countriesVisited: uniqueCountries.size,
      citiesVisited: uniqueCities.size,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
      badgesEarned: badgeStats || 0,
      publicAlbums: privacyBreakdown.PUBLIC,
      privateAlbums: privacyBreakdown.PRIVATE,
      friendsOnlyAlbums: privacyBreakdown.FRIENDS_ONLY,
    };

    logger.debug("Dashboard stats calculated:", stats);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}