import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/http";
import { logger } from "@/lib/logger";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/user/export - Export all user data (GDPR compliance)
 * Phase 12.3 - Data export & account deletion
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const exportId = uuidv4();

    logger.info(`Starting data export for user ${user.id}`, { exportId });

    // Get all user data
    const userData = await getUserData(user.id);

    // Create ZIP file with all data
    const zipBuffer = await createDataExport(userData, exportId);

    // Log the export for audit purposes
    await db.activity.create({
      data: {
        userId: user.id,
        type: "DATA_EXPORT",
        targetType: "User",
        targetId: user.id,
        metadata: JSON.stringify({
          exportId,
          exportedAt: new Date().toISOString(),
          dataTypes: Object.keys(userData),
          totalRecords: getTotalRecords(userData),
        }),
      },
    });

    // Create download response
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set(
      "Content-Disposition",
      `attachment; filename="adventure-log-export-${exportId}.zip"`
    );
    headers.set("Content-Length", zipBuffer.length.toString());

    logger.info(`Data export completed for user ${user.id}`, {
      exportId,
      sizeBytes: zipBuffer.length,
      totalRecords: getTotalRecords(userData),
    });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error("Data export failed:", error);
    return handleApiError(error);
  }
}

/**
 * Get all user data for export
 */
async function getUserData(userId: string) {
  try {
    const [
      user,
      albums,
      photos,
      activities,
      badges,
      challenges,
      followers,
      following,
      friendRequests,
      likes,
      comments,
      notifications,
      albumFavorites,
    ] = await Promise.all([
      // User profile data
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          location: true,
          website: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          totalCountriesVisited: true,
          totalAlbumsCount: true,
          totalPhotosCount: true,
          currentStreak: true,
          longestStreak: true,
          lastAlbumDate: true,
          totalDistanceTraveled: true,
        },
      }),

      // Albums with photos
      db.album.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          photos: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Standalone photos (if any)
      db.albumPhoto.findMany({
        where: {
          album: { userId },
          deletedAt: null,
        },
        include: {
          album: {
            select: { title: true, country: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Activity history
      db.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

      // Earned badges
      db.userBadge.findMany({
        where: { userId },
        include: {
          badge: {
            select: {
              name: true,
              description: true,
              icon: true,
              category: true,
              rarity: true,
              points: true,
            },
          },
        },
        orderBy: { unlockedAt: "desc" },
      }),

      // Challenge participation
      db.userChallenge.findMany({
        where: { userId },
        include: {
          challenge: {
            select: {
              title: true,
              description: true,
              type: true,
              target: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      }),

      // Followers
      db.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              username: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Following
      db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              username: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Friend requests (sent and received)
      db.friendRequest.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: {
          sender: {
            select: {
              username: true,
              name: true,
            },
          },
          receiver: {
            select: {
              username: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Likes given
      db.like.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

      // Comments made
      db.comment.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
      }),

      // Notifications
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

      // Album favorites
      db.albumFavorite.findMany({
        where: { userId },
        include: {
          album: {
            select: {
              title: true,
              country: true,
              user: {
                select: {
                  username: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      user,
      albums: albums || [],
      photos: photos || [],
      activities: activities || [],
      badges: badges || [],
      challenges: challenges || [],
      social: {
        followers: followers || [],
        following: following || [],
        friendRequests: friendRequests || [],
      },
      interactions: {
        likes: likes || [],
        comments: comments || [],
        favorites: albumFavorites || [],
      },
      notifications: notifications || [],
    };
  } catch (error) {
    logger.error("Failed to fetch user data for export:", error);
    throw new Error("Failed to retrieve user data");
  }
}

/**
 * Create ZIP file with all user data
 */
async function createDataExport(
  userData: any,
  exportId: string
): Promise<Buffer> {
  const zip = new JSZip();

  // Add export metadata
  const exportMetadata = {
    exportId,
    exportedAt: new Date().toISOString(),
    exportedBy: userData.user?.email || "Unknown",
    version: "1.0",
    format: "Adventure Log Data Export",
    description:
      "Complete user data export including profile, albums, photos, social connections, and activities.",
    gdprCompliant: true,
    dataRetentionInfo:
      "This export contains all personal data we have stored about you.",
    contactInfo:
      "For questions about this export, contact: support@adventurelog.app",
  };

  zip.file("README.txt", generateReadmeText(exportMetadata));
  zip.file("export-metadata.json", JSON.stringify(exportMetadata, null, 2));

  // User profile data
  if (userData.user) {
    zip.file("profile.json", JSON.stringify(userData.user, null, 2));
  }

  // Travel data
  if (userData.albums.length > 0) {
    zip.file("albums.json", JSON.stringify(userData.albums, null, 2));

    // Create CSV for easy viewing
    const albumsCsv = generateAlbumsCsv(userData.albums);
    zip.file("albums.csv", albumsCsv);
  }

  // Photos data
  if (userData.photos.length > 0) {
    zip.file("photos.json", JSON.stringify(userData.photos, null, 2));

    const photosCsv = generatePhotosCsv(userData.photos);
    zip.file("photos.csv", photosCsv);
  }

  // Activity history
  if (userData.activities.length > 0) {
    zip.file("activities.json", JSON.stringify(userData.activities, null, 2));

    const activitiesCsv = generateActivitiesCsv(userData.activities);
    zip.file("activities.csv", activitiesCsv);
  }

  // Gamification data
  if (userData.badges.length > 0) {
    zip.file("badges.json", JSON.stringify(userData.badges, null, 2));
  }

  if (userData.challenges.length > 0) {
    zip.file("challenges.json", JSON.stringify(userData.challenges, null, 2));
  }

  // Social connections
  if (
    userData.social.followers.length > 0 ||
    userData.social.following.length > 0
  ) {
    zip.file(
      "social-connections.json",
      JSON.stringify(userData.social, null, 2)
    );
  }

  // Interactions
  if (
    userData.interactions.likes.length > 0 ||
    userData.interactions.comments.length > 0
  ) {
    zip.file(
      "interactions.json",
      JSON.stringify(userData.interactions, null, 2)
    );
  }

  // Notifications
  if (userData.notifications.length > 0) {
    zip.file(
      "notifications.json",
      JSON.stringify(userData.notifications, null, 2)
    );
  }

  // Generate the ZIP buffer
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

/**
 * Generate README text for the export
 */
function generateReadmeText(metadata: any): string {
  return `
Adventure Log - Personal Data Export
====================================

Export ID: ${metadata.exportId}
Generated: ${metadata.exportedAt}
Format: ${metadata.format}
Version: ${metadata.version}

CONTENTS
--------
This export contains all the personal data we have stored about your Adventure Log account:

📁 PROFILE DATA
- profile.json: Your account information, settings, and statistics

📁 TRAVEL DATA  
- albums.json/csv: All your travel albums with details
- photos.json/csv: Information about your uploaded photos

📁 ACTIVITY DATA
- activities.json/csv: Your complete activity history

📁 GAMIFICATION DATA
- badges.json: Badges you've earned
- challenges.json: Challenges you've participated in

📁 SOCIAL DATA
- social-connections.json: Your followers and people you follow
- interactions.json: Likes, comments, and favorites

📁 NOTIFICATIONS
- notifications.json: Your notification history

📁 METADATA
- export-metadata.json: Technical details about this export

FILE FORMATS
-----------
- JSON files: Machine-readable format containing complete data
- CSV files: Human-readable spreadsheet format for easy viewing
- All dates are in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)

PRIVACY & DATA PROTECTION
------------------------
This export is GDPR compliant and contains:
✅ All personal data we store about you
✅ Data in portable, machine-readable formats
✅ Human-readable explanations
✅ Export audit trail

NOTE: Photo files themselves are not included in this export due to size constraints. 
Photo URLs and metadata are included. To download your actual photo files, 
please visit your albums in the web application.

QUESTIONS?
----------
If you have questions about this data export or our data handling:
- Email: support@adventurelog.app
- Privacy Policy: https://adventurelog.app/privacy
- Terms of Service: https://adventurelog.app/terms

Generated by Adventure Log Data Export System
`.trim();
}

/**
 * Generate CSV for albums
 */
function generateAlbumsCsv(albums: any[]): string {
  const headers = [
    "Title",
    "Country",
    "City",
    "Privacy",
    "Photos Count",
    "Created Date",
    "Description",
  ];
  const rows = albums.map((album) => [
    `"${(album.title || "").replace(/"/g, '""')}"`,
    `"${(album.country || "").replace(/"/g, '""')}"`,
    `"${(album.city || "").replace(/"/g, '""')}"`,
    album.privacy,
    album.photos?.length || 0,
    album.createdAt,
    `"${(album.description || "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate CSV for photos
 */
function generatePhotosCsv(photos: any[]): string {
  const headers = [
    "Album",
    "Caption",
    "Upload Date",
    "Country",
    "Latitude",
    "Longitude",
  ];
  const rows = photos.map((photo) => [
    `"${(photo.album?.title || "Unknown").replace(/"/g, '""')}"`,
    `"${(photo.caption || "").replace(/"/g, '""')}"`,
    photo.createdAt,
    `"${(photo.album?.country || "").replace(/"/g, '""')}"`,
    photo.latitude || "",
    photo.longitude || "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate CSV for activities
 */
function generateActivitiesCsv(activities: any[]): string {
  const headers = ["Activity Type", "Target Type", "Date", "Description"];
  const rows = activities.map((activity) => [
    activity.type,
    activity.targetType,
    activity.createdAt,
    `"${(activity.metadata || "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Count total records in export data
 */
function getTotalRecords(userData: any): number {
  return (
    (userData.albums?.length || 0) +
    (userData.photos?.length || 0) +
    (userData.activities?.length || 0) +
    (userData.badges?.length || 0) +
    (userData.challenges?.length || 0) +
    (userData.social?.followers?.length || 0) +
    (userData.social?.following?.length || 0) +
    (userData.social?.friendRequests?.length || 0) +
    (userData.interactions?.likes?.length || 0) +
    (userData.interactions?.comments?.length || 0) +
    (userData.interactions?.favorites?.length || 0) +
    (userData.notifications?.length || 0)
  );
}
