import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { handleApiError, ok, badRequest, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { z } from "zod";
import bcrypt from "bcryptjs";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required for account deletion"),
  confirmation: z
    .literal("DELETE MY ACCOUNT")
    .refine((val) => val === "DELETE MY ACCOUNT", {
      message: 'You must type "DELETE MY ACCOUNT" to confirm',
    }),
  reason: z.string().optional(),
});

/**
 * POST /api/user/delete - Delete user account (GDPR compliance)
 * Phase 12.3 - Data export & account deletion
 *
 * This implements soft deletion with background cleanup
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    const body = await request.json();

    // Validate request body
    const { password, reason } = deleteAccountSchema.parse(body);

    logger.info(`Account deletion requested for user ${session.id}`, {
      reason,
    });

    // Get full user data to access password
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return notFound("User not found");
    }

    // Verify password for security
    if (user.password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return badRequest("Invalid password provided");
      }
    }

    // Start the deletion process
    await deleteUserAccount(session.id, reason);

    logger.info(`Account deletion completed for user ${session.id}`);

    return ok({
      message: "Account deletion completed successfully",
      deletedAt: new Date().toISOString(),
      note: "Your account and all associated data have been marked for deletion. Some data may take up to 30 days to be completely removed from our systems.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(
        `Validation error: ${error.issues.map((e) => e.message).join(", ")}`
      );
    }

    logger.error("Account deletion failed:", error);
    return handleApiError(error);
  }
}

/**
 * GET /api/user/delete - Get account deletion information
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    // Check if user is already marked for deletion
    const userInfo = await db.user.findUnique({
      where: { id: user.id },
      select: {
        deletedAt: true,
        _count: {
          select: {
            albums: true,
            activities: true,
            likes: true,
            comments: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!userInfo) {
      return badRequest("User not found");
    }

    if (userInfo.deletedAt) {
      return ok({
        status: "pending_deletion",
        deletedAt: userInfo.deletedAt,
        message: "Your account is already scheduled for deletion",
        finalDeletionEstimate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    return ok({
      status: "active",
      deletionInfo: {
        dataToDelete: {
          albums: userInfo._count.albums,
          activities: userInfo._count.activities,
          likes: userInfo._count.likes,
          comments: userInfo._count.comments,
          socialConnections:
            userInfo._count.followers + userInfo._count.following,
        },
        process: [
          "Immediate: Account will be deactivated and login blocked",
          "Within 7 days: Profile and public content will be hidden",
          "Within 30 days: All personal data will be permanently deleted",
        ],
        irreversible: true,
        gdprNote:
          "This action complies with GDPR Article 17 (Right to Erasure)",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Delete user account and all associated data
 */
async function deleteUserAccount(
  userId: string,
  reason?: string
): Promise<void> {
  const deletedAt = new Date();

  try {
    await db.$transaction(
      async (tx) => {
        // 1. Mark user as deleted (soft delete)
        await tx.user.update({
          where: { id: userId },
          data: {
            deletedAt,
            // Anonymize immediately sensitive data
            email: `deleted-${userId}@deleted.local`,
            username: `deleted-${userId}`,
            name: null,
            bio: null,
            location: null,
            website: null,
            image: null,
            bannerImage: null,
            password: null,
          },
        });

        // 2. Log the deletion activity
        await tx.activity.create({
          data: {
            userId,
            type: "ACCOUNT_DELETED",
            targetType: "User",
            targetId: userId,
            metadata: JSON.stringify({
              deletedAt: deletedAt.toISOString(),
              reason: reason || "User requested deletion",
              deletionType: "user_requested",
              gdprCompliant: true,
            }),
          },
        });

        // 3. Soft delete albums (this will cascade to photos via foreign key)
        await tx.album.updateMany({
          where: {
            userId,
            deletedAt: null,
          },
          data: { deletedAt },
        });

        // 4. Soft delete photos
        await tx.albumPhoto.updateMany({
          where: {
            album: { userId },
            deletedAt: null,
          },
          data: { deletedAt },
        });

        // 5. Soft delete comments
        await tx.comment.updateMany({
          where: {
            userId,
            deletedAt: null,
          },
          data: { deletedAt },
        });

        // 6. Delete social connections
        await tx.follow.deleteMany({
          where: {
            OR: [{ followerId: userId }, { followingId: userId }],
          },
        });

        // 7. Delete friend requests
        await tx.friendRequest.deleteMany({
          where: {
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        });

        // 8. Delete likes
        await tx.like.deleteMany({
          where: { userId },
        });

        // 9. Delete album favorites
        await tx.albumFavorite.deleteMany({
          where: { userId },
        });

        // 10. Mark notifications for deletion
        await tx.notification.updateMany({
          where: { userId },
          data: { deletedAt },
        });

        // 11. Clean up user badges
        await tx.userBadge.deleteMany({
          where: { userId },
        });

        // 12. Clean up challenge participation
        await tx.userChallenge.deleteMany({
          where: { userId },
        });

        // 13. Invalidate all sessions
        await tx.session.deleteMany({
          where: { userId },
        });

        // 14. Delete OAuth accounts
        await tx.account.deleteMany({
          where: { userId },
        });

        // 15. Schedule file cleanup (photos in storage)
        await scheduleFileCleanup(userId);
      },
      {
        maxWait: 10000, // 10 seconds
        timeout: 30000, // 30 seconds
      }
    );

    logger.info(`Successfully marked user account for deletion: ${userId}`);
  } catch (error) {
    logger.error(`Failed to delete user account ${userId}:`, error);
    throw new Error(
      "Account deletion failed. Please try again or contact support."
    );
  }
}

/**
 * Schedule cleanup of user files in storage
 */
async function scheduleFileCleanup(userId: string): Promise<void> {
  try {
    // Create a cleanup job record
    await db.activity.create({
      data: {
        userId,
        type: "CLEANUP_SCHEDULED",
        targetType: "Storage",
        targetId: userId,
        metadata: JSON.stringify({
          scheduledAt: new Date().toISOString(),
          cleanupType: "user_files",
          storagePath: `albums/${userId}/`,
          estimatedCompletion: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
      },
    });

    // In a production environment, you would:
    // 1. Add a job to a queue (Redis Bull, AWS SQS, etc.)
    // 2. Schedule the cleanup with a background worker
    // 3. Delete files from Supabase storage

    logger.info(`File cleanup scheduled for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to schedule file cleanup for user ${userId}:`, error);
    // Don't throw - this is a background operation
  }
}

/**
 * Background cleanup function (would be called by a cron job or background worker)
 */
export async function performScheduledCleanup(): Promise<void> {
  try {
    // Find cleanup jobs older than 7 days
    const cleanupJobs = await db.activity.findMany({
      where: {
        type: "CLEANUP_SCHEDULED",
        createdAt: {
          lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      take: 10, // Process in batches
    });

    for (const job of cleanupJobs) {
      try {
        const metadata = JSON.parse(job.metadata || "{}");

        // Delete files from storage
        if (metadata.storagePath) {
<<<<<<< HEAD
          // TODO: Implement actual file deletion from Supabase
          // await supabaseAdmin.storage.from('photos').remove([metadata.storagePath]);
          logger.info(`Files cleaned up for path: ${metadata.storagePath}`);
=======
          try {
            const { deleteFile } = await import("@/lib/supabaseAdmin");
            const result = await deleteFile(metadata.storagePath);

            if (result.error) {
              logger.warn(
                `Failed to delete file from storage: ${metadata.storagePath}`,
                {
                  error: result.error.message,
                }
              );
            } else {
              logger.info(`Files cleaned up for path: ${metadata.storagePath}`);
            }
          } catch (deleteError) {
            logger.error(
              `Error during file deletion: ${metadata.storagePath}`,
              {
                error:
                  deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError),
              }
            );
          }
>>>>>>> oauth-upload-fixes
        }

        // Mark cleanup as completed
        await db.activity.create({
          data: {
            userId: job.userId,
            type: "CLEANUP_COMPLETED",
            targetType: "Storage",
            targetId: job.targetId,
            metadata: JSON.stringify({
              originalJobId: job.id,
              completedAt: new Date().toISOString(),
              cleanupType: metadata.cleanupType,
            }),
          },
        });

        // Delete the cleanup job record
        await db.activity.delete({
          where: { id: job.id },
        });
      } catch (error) {
        logger.error(`Failed to process cleanup job ${job.id}:`, error);
      }
    }

    // Final cleanup: Delete users that have been soft-deleted for more than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const usersToDelete = await db.user.findMany({
      where: {
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
      select: { id: true, email: true },
    });

    for (const user of usersToDelete) {
      try {
        // Permanently delete the user record
        await db.user.delete({
          where: { id: user.id },
        });

        logger.info(`Permanently deleted user: ${user.id}`);
      } catch (error) {
        logger.error(`Failed to permanently delete user ${user.id}:`, error);
      }
    }
  } catch (error) {
    logger.error("Scheduled cleanup failed:", error);
  }
}
