#!/usr/bin/env tsx

/**
 * Production Database Setup Script
 *
 * This script ensures the database is properly set up for production deployment.
 * It should be run after the database is created but before the app starts.
 *
 * Usage:
 * - npm run db:setup-production  (add to package.json)
 * - tsx scripts/setup-production-db.ts
 * - Can be called from build process or deployment scripts
 */

import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "./seed-database";

const db = new PrismaClient();

async function setupProductionDatabase() {
  console.log("🚀 Setting up production database...");

  let isHealthy = false;
  let retries = 0;
  const maxRetries = 5;

  // Wait for database to be ready with retries
  while (!isHealthy && retries < maxRetries) {
    try {
      console.log(
        `📡 Testing database connection (attempt ${retries + 1}/${maxRetries})...`
      );

      // Test connection
      await db.$connect();
      await db.$queryRaw`SELECT 1 as test`;

      console.log("✅ Database connection successful");
      isHealthy = true;
    } catch (error) {
      retries++;
      console.warn(`❌ Connection attempt ${retries} failed:`, error);

      if (retries < maxRetries) {
        console.log(`⏳ Waiting 5 seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  if (!isHealthy) {
    throw new Error("❌ Failed to connect to database after all retries");
  }

  try {
    // Check if database is already seeded
    console.log("🔍 Checking database setup status...");

    const badgeCount = await db.badge.count();
    const userCount = await db.user.count();

    console.log(`📊 Found ${userCount} users, ${badgeCount} badges`);

    if (badgeCount === 0) {
      console.log("🌱 Database not seeded, running seed script...");
      await seedDatabase();
      console.log("✅ Database seeded successfully");
    } else {
      console.log("✅ Database already seeded, skipping seed step");
    }

    // Verify essential tables exist and are accessible
    console.log("🔍 Verifying database tables...");
    const tables = [
      { name: "User", countFn: () => db.user.count() },
      { name: "Account", countFn: () => db.account.count() },
      { name: "Session", countFn: () => db.session.count() },
      { name: "Badge", countFn: () => db.badge.count() },
      { name: "Album", countFn: () => db.album.count() },
    ];

    for (const table of tables) {
      try {
        const count = await table.countFn();
        console.log(`✅ ${table.name} table: ${count} records`);
      } catch (error) {
        console.error(`❌ Failed to verify ${table.name} table:`, error);
        throw new Error(`Database table ${table.name} is not accessible`);
      }
    }

    console.log("🎉 Production database setup completed successfully!");

    // Return status for deployment scripts
    return {
      success: true,
      badgeCount: await db.badge.count(),
      userCount: await db.user.count(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("💥 Production database setup failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Health check function that can be imported
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  seeded: boolean;
  tablesExist: boolean;
  error?: string;
}> {
  try {
    await db.$connect();

    const badgeCount = await db.badge.count();

    await db.$disconnect();

    return {
      connected: true,
      seeded: badgeCount > 0,
      tablesExist: true,
    };
  } catch (error) {
    return {
      connected: false,
      seeded: false,
      tablesExist: false,
      error: String(error),
    };
  }
}

// Main execution
if (require.main === module) {
  setupProductionDatabase()
    .then((result) => {
      console.log("🎯 Setup result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Setup failed:", error);
      process.exit(1);
    });
}

export { setupProductionDatabase };
