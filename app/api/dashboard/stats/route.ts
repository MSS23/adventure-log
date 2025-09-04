import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  // Default stats in case of database issues
  const defaultStats = {
    totalAlbums: 0,
    totalPhotos: 0,
    countriesVisited: 0,
    citiesVisited: 0,
    followersCount: 0,
    followingCount: 0,
    badgesEarned: 0,
    publicAlbums: 0,
    privateAlbums: 0,
    friendsOnlyAlbums: 0,
  };

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
      // Test database connection first
      await db.$connect();
<<<<<<< HEAD
      
      // Fetch user statistics with error handling for each query
      const [
        albumStats,
        photoCount,
        locationStats,
        socialStats,
        badgeStats,
      ] = await Promise.allSettled([
        // Album statistics
        db.album.aggregate({
          where: { userId },
          _count: { id: true },
        }).catch((error) => {
          logger.warn("Album stats query failed:", error);
          return { _count: { id: 0 } };
        }),

        // Photo count across all albums
        db.albumPhoto.count({
          where: {
            album: { userId },
          },
        }).catch((error) => {
          logger.warn("Photo count query failed:", error);
          return 0;
        }),

        // Location statistics (countries and cities)
        Promise.all([
          db.album.findMany({
            where: { userId },
            select: { country: true },
          }).catch(() => []),
          db.album.findMany({
            where: { userId },
            select: { city: true },
          }).catch(() => []),
        ]).catch((error) => {
          logger.warn("Location stats query failed:", error);
          return [[], []];
        }),

        // Social statistics (followers/following)
        Promise.all([
          db.follow.count({
            where: { followerId: userId },
          }).catch(() => 0),
          db.follow.count({
            where: { followingId: userId },
          }).catch(() => 0),
        ]).catch((error) => {
          logger.warn("Social stats query failed:", error);
          return [0, 0];
        }),

        // Badge statistics (earned badges)
        db.userBadge.count({
          where: { userId },
        }).catch((error) => {
          logger.warn("Badge count query failed:", error);
          return 0;
        }),
      ]);

      // Handle Promise.allSettled results with fallbacks
      const albumStatsResult = albumStats.status === 'fulfilled' 
        ? albumStats.value 
        : { _count: { id: 0 } };
      
      const photoCountResult = photoCount.status === 'fulfilled' 
        ? photoCount.value 
        : 0;
        
      const locationStatsResult = locationStats.status === 'fulfilled' 
        ? locationStats.value 
        : [[], []];
        
      const socialStatsResult = socialStats.status === 'fulfilled' 
        ? socialStats.value 
        : [0, 0];
        
      const badgeStatsResult = badgeStats.status === 'fulfilled' 
        ? badgeStats.value 
        : 0;
=======

      // Fetch user statistics with error handling for each query
      const [albumStats, photoCount, locationStats, socialStats, badgeStats] =
        await Promise.allSettled([
          // Album statistics
          db.album
            .aggregate({
              where: { userId },
              _count: { id: true },
            })
            .catch((error) => {
              logger.warn("Album stats query failed:", error);
              return { _count: { id: 0 } };
            }),

          // Photo count across all albums
          db.albumPhoto
            .count({
              where: {
                album: { userId },
              },
            })
            .catch((error) => {
              logger.warn("Photo count query failed:", error);
              return 0;
            }),

          // Location statistics (countries and cities)
          Promise.all([
            db.album
              .findMany({
                where: { userId },
                select: { country: true },
              })
              .catch(() => []),
            db.album
              .findMany({
                where: { userId },
                select: { city: true },
              })
              .catch(() => []),
          ]).catch((error) => {
            logger.warn("Location stats query failed:", error);
            return [[], []];
          }),

          // Social statistics (followers/following)
          Promise.all([
            db.follow
              .count({
                where: { followerId: userId },
              })
              .catch(() => 0),
            db.follow
              .count({
                where: { followingId: userId },
              })
              .catch(() => 0),
          ]).catch((error) => {
            logger.warn("Social stats query failed:", error);
            return [0, 0];
          }),

          // Badge statistics (earned badges)
          db.userBadge
            .count({
              where: { userId },
            })
            .catch((error) => {
              logger.warn("Badge count query failed:", error);
              return 0;
            }),
        ]);

      // Handle Promise.allSettled results with fallbacks
      const albumStatsResult =
        albumStats.status === "fulfilled"
          ? albumStats.value
          : { _count: { id: 0 } };

      const photoCountResult =
        photoCount.status === "fulfilled" ? photoCount.value : 0;

      const locationStatsResult =
        locationStats.status === "fulfilled" ? locationStats.value : [[], []];

      const socialStatsResult =
        socialStats.status === "fulfilled" ? socialStats.value : [0, 0];

      const badgeStatsResult =
        badgeStats.status === "fulfilled" ? badgeStats.value : 0;
>>>>>>> oauth-upload-fixes

      // Album privacy breakdown with error handling
      const privacyBreakdown = {
        PUBLIC: 0,
        FRIENDS_ONLY: 0,
        PRIVATE: 0,
      };

      try {
        const albumPrivacyStats = await db.album.groupBy({
          by: ["privacy"],
          where: { userId },
          _count: { id: true },
        });

        albumPrivacyStats.forEach((stat) => {
          if (stat.privacy in privacyBreakdown) {
<<<<<<< HEAD
            privacyBreakdown[stat.privacy as keyof typeof privacyBreakdown] = stat._count.id;
=======
            privacyBreakdown[stat.privacy as keyof typeof privacyBreakdown] =
              stat._count.id;
>>>>>>> oauth-upload-fixes
          }
        });
      } catch (error) {
        logger.warn("Privacy stats query failed:", error);
        // Keep default values
      }

      const [countries, cities] = locationStatsResult;
      const [followingCount, followersCount] = socialStatsResult;

      // Filter and count unique non-null, non-empty locations
      const uniqueCountries = new Set(
        countries
          .map((c: any) => c.country)
          .filter((country: string) => country && country.trim() !== "")
      );
      const uniqueCities = new Set(
        cities
          .map((c: any) => c.city)
          .filter((city: string) => city && city.trim() !== "")
      );

      const stats = {
        totalAlbums: albumStatsResult._count?.id || 0,
        totalPhotos: photoCountResult || 0,
        countriesVisited: uniqueCountries.size,
        citiesVisited: uniqueCities.size,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        badgesEarned: badgeStatsResult || 0,
        publicAlbums: privacyBreakdown.PUBLIC,
        privateAlbums: privacyBreakdown.PRIVATE,
        friendsOnlyAlbums: privacyBreakdown.FRIENDS_ONLY,
      };

      logger.debug("Dashboard stats calculated:", stats);
      return NextResponse.json(stats);
<<<<<<< HEAD
      
=======
>>>>>>> oauth-upload-fixes
    } catch (dbError) {
      logger.error("Database connection failed:", dbError);
      // Return default stats if database is unavailable
      return NextResponse.json({
        ...defaultStats,
        _databaseUnavailable: true,
      });
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
    // Return default stats with error flag
    return NextResponse.json({
      ...defaultStats,
      _error: true,
    });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> oauth-upload-fixes
