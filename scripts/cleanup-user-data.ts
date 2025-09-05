#!/usr/bin/env tsx

/**
 * User Data Cleanup Script
 *
 * This script completely removes all data associated with a specific user email
 * from the Adventure Log database. Useful for testing and account cleanup.
 *
 * Usage:
 * - tsx scripts/cleanup-user-data.ts <email>
 * - npm run db:cleanup-user -- <email>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CleanupResult {
  step: string;
  status: "success" | "error" | "skipped";
  deletedCount?: number;
  error?: string;
}

class UserDataCleanup {
  private email: string;
  private userId: string | null = null;
  private results: CleanupResult[] = [];

  constructor(email: string) {
    this.email = email.toLowerCase().trim();
  }

  private addResult(
    step: string,
    status: "success" | "error" | "skipped",
    deletedCount?: number,
    error?: string
  ) {
    const result: CleanupResult = { step, status };
    if (deletedCount !== undefined) result.deletedCount = deletedCount;
    if (error) result.error = error;

    this.results.push(result);

    const emoji =
      status === "success" ? "✅" : status === "error" ? "❌" : "⏭️";
    const countInfo =
      deletedCount !== undefined ? ` (${deletedCount} records)` : "";
    console.log(`${emoji} ${step}${countInfo}`);

    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  async findUser(): Promise<boolean> {
    try {
      console.log(`🔍 Looking up user: ${this.email}`);

      const user = await prisma.user.findUnique({
        where: { email: this.email },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          totalAlbumsCount: true,
          totalPhotosCount: true,
        },
      });

      if (!user) {
        this.addResult("Find User", "skipped", 0, "User not found");
        return false;
      }

      this.userId = user.id;
      console.log(`📋 Found user:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        albums: user.totalAlbumsCount,
        photos: user.totalPhotosCount,
      });

      this.addResult("Find User", "success", 1);
      return true;
    } catch (error) {
      this.addResult(
        "Find User",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }

  async cleanupUserGeneratedContent(): Promise<void> {
    if (!this.userId) return;

    console.log("\n📁 Cleaning up user-generated content...");

    // Delete album photos first (child records)
    try {
      const albumPhotos = await prisma.albumPhoto.deleteMany({
        where: {
          album: {
            userId: this.userId,
          },
        },
      });
      this.addResult("Delete Album Photos", "success", albumPhotos.count);
    } catch (error) {
      this.addResult(
        "Delete Album Photos",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete album favorites
    try {
      const albumFavorites = await prisma.albumFavorite.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Album Favorites", "success", albumFavorites.count);
    } catch (error) {
      this.addResult(
        "Delete Album Favorites",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete albums (parent records)
    try {
      const albums = await prisma.album.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Albums", "success", albums.count);
    } catch (error) {
      this.addResult(
        "Delete Albums",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete comments
    try {
      const comments = await prisma.comment.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Comments", "success", comments.count);
    } catch (error) {
      this.addResult(
        "Delete Comments",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete likes
    try {
      const likes = await prisma.like.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Likes", "success", likes.count);
    } catch (error) {
      this.addResult(
        "Delete Likes",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async cleanupSocialData(): Promise<void> {
    if (!this.userId) return;

    console.log("\n👥 Cleaning up social data...");

    // Delete follow relationships (as follower)
    try {
      const followsAsFollower = await prisma.follow.deleteMany({
        where: { followerId: this.userId },
      });
      this.addResult(
        "Delete Follows (as follower)",
        "success",
        followsAsFollower.count
      );
    } catch (error) {
      this.addResult(
        "Delete Follows (as follower)",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete follow relationships (as following)
    try {
      const followsAsFollowing = await prisma.follow.deleteMany({
        where: { followingId: this.userId },
      });
      this.addResult(
        "Delete Follows (as following)",
        "success",
        followsAsFollowing.count
      );
    } catch (error) {
      this.addResult(
        "Delete Follows (as following)",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete friend requests (sent)
    try {
      const friendRequestsSent = await prisma.friendRequest.deleteMany({
        where: { senderId: this.userId },
      });
      this.addResult(
        "Delete Friend Requests (sent)",
        "success",
        friendRequestsSent.count
      );
    } catch (error) {
      this.addResult(
        "Delete Friend Requests (sent)",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete friend requests (received)
    try {
      const friendRequestsReceived = await prisma.friendRequest.deleteMany({
        where: { receiverId: this.userId },
      });
      this.addResult(
        "Delete Friend Requests (received)",
        "success",
        friendRequestsReceived.count
      );
    } catch (error) {
      this.addResult(
        "Delete Friend Requests (received)",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async cleanupActivityData(): Promise<void> {
    if (!this.userId) return;

    console.log("\n📊 Cleaning up activity and notification data...");

    // Delete activities
    try {
      const activities = await prisma.activity.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Activities", "success", activities.count);
    } catch (error) {
      this.addResult(
        "Delete Activities",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete notifications
    try {
      const notifications = await prisma.notification.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Notifications", "success", notifications.count);
    } catch (error) {
      this.addResult(
        "Delete Notifications",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async cleanupGamificationData(): Promise<void> {
    if (!this.userId) return;

    console.log("\n🏆 Cleaning up gamification data...");

    // Delete user badges
    try {
      const userBadges = await prisma.userBadge.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete User Badges", "success", userBadges.count);
    } catch (error) {
      this.addResult(
        "Delete User Badges",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete user challenges
    try {
      const userChallenges = await prisma.userChallenge.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete User Challenges", "success", userChallenges.count);
    } catch (error) {
      this.addResult(
        "Delete User Challenges",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async cleanupAuthenticationData(): Promise<void> {
    if (!this.userId) return;

    console.log("\n🔐 Cleaning up authentication data...");

    // Delete sessions
    try {
      const sessions = await prisma.session.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete Sessions", "success", sessions.count);
    } catch (error) {
      this.addResult(
        "Delete Sessions",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Delete OAuth accounts
    try {
      const accounts = await prisma.account.deleteMany({
        where: { userId: this.userId },
      });
      this.addResult("Delete OAuth Accounts", "success", accounts.count);
    } catch (error) {
      this.addResult(
        "Delete OAuth Accounts",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async deleteUserAccount(): Promise<void> {
    if (!this.userId) return;

    console.log("\n👤 Deleting user account...");

    try {
      const deletedUser = await prisma.user.delete({
        where: { id: this.userId },
      });
      this.addResult("Delete User Account", "success", 1);
      console.log(`✅ User account deleted: ${deletedUser.email}`);
    } catch (error) {
      this.addResult(
        "Delete User Account",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async verifyCleanup(): Promise<void> {
    console.log("\n🔍 Verifying cleanup...");

    try {
      const user = await prisma.user.findUnique({
        where: { email: this.email },
      });

      if (user) {
        this.addResult(
          "Verify Cleanup",
          "error",
          0,
          "User still exists in database"
        );
      } else {
        this.addResult(
          "Verify Cleanup",
          "success",
          0,
          "User completely removed"
        );
      }
    } catch (error) {
      this.addResult(
        "Verify Cleanup",
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  generateReport(): void {
    console.log("\n📊 Cleanup Report");
    console.log("=".repeat(50));

    const successCount = this.results.filter(
      (r) => r.status === "success"
    ).length;
    const errorCount = this.results.filter((r) => r.status === "error").length;
    const skippedCount = this.results.filter(
      (r) => r.status === "skipped"
    ).length;

    const totalDeleted = this.results
      .filter((r) => r.status === "success")
      .reduce((sum, r) => sum + (r.deletedCount || 0), 0);

    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    console.log(`⏭️ Skipped operations: ${skippedCount}`);
    console.log(`🗑️ Total records deleted: ${totalDeleted}`);

    if (errorCount === 0 && skippedCount <= 1) {
      console.log(`\n🎉 User data cleanup completed successfully!`);
      console.log(`Account ${this.email} has been completely removed.`);
    } else if (errorCount > 0) {
      console.log(`\n⚠️ Cleanup completed with ${errorCount} errors.`);
      console.log("Please review the errors above and retry if necessary.");
    }
  }

  async runCleanup(): Promise<boolean> {
    console.log(`🚀 Starting user data cleanup for: ${this.email}`);
    console.log(`⚠️ This will permanently delete ALL data for this user!`);

    const userFound = await this.findUser();
    if (!userFound) {
      this.generateReport();
      return false;
    }

    try {
      // Execute cleanup in proper order to handle foreign key constraints
      await this.cleanupUserGeneratedContent();
      await this.cleanupSocialData();
      await this.cleanupActivityData();
      await this.cleanupGamificationData();
      await this.cleanupAuthenticationData();
      await this.deleteUserAccount();
      await this.verifyCleanup();

      this.generateReport();
      return this.results.filter((r) => r.status === "error").length === 0;
    } catch (error) {
      console.error("💥 Cleanup failed with unexpected error:", error);
      this.generateReport();
      return false;
    }
  }
}

// Main execution
async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Please provide an email address:");
    console.error("Usage: tsx scripts/cleanup-user-data.ts <email>");
    process.exit(1);
  }

  if (!email.includes("@")) {
    console.error("❌ Invalid email address format");
    process.exit(1);
  }

  console.log(`⚠️ WARNING: This will permanently delete ALL data for ${email}`);
  console.log("Press Ctrl+C to cancel, or wait 3 seconds to proceed...");

  // Give user 3 seconds to cancel
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const cleanup = new UserDataCleanup(email);
    const success = await cleanup.runCleanup();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

export { UserDataCleanup };
