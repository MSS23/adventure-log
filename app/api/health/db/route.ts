import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// GET /api/health/db - Database health check and setup verification
export async function GET() {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      tablesExist: false,
      seeded: false,
      error: null as string | null,
    },
    tables: {
      User: { exists: false, count: 0 },
      Account: { exists: false, count: 0 },
      Session: { exists: false, count: 0 },
      Badge: { exists: false, count: 0 },
      Album: { exists: false, count: 0 },
      UserBadge: { exists: false, count: 0 },
    },
    recommendations: [] as string[],
  };

  try {
    // Test database connection
    try {
      await db.$connect();
      healthCheck.database.connected = true;
      logger.debug("✅ Database connection successful");
    } catch (error) {
      healthCheck.database.connected = false;
      healthCheck.database.error = `Connection failed: ${error}`;
      logger.error("❌ Database connection failed:", { error });

      healthCheck.recommendations.push(
        "Database connection failed. Check DATABASE_URL environment variable."
      );

      return NextResponse.json(healthCheck);
    }

    // Check if core tables exist and get counts
    const tableChecks = [
      { name: "User", countFn: () => db.user.count() },
      { name: "Account", countFn: () => db.account.count() },
      { name: "Session", countFn: () => db.session.count() },
      { name: "Badge", countFn: () => db.badge.count() },
      { name: "Album", countFn: () => db.album.count() },
      { name: "UserBadge", countFn: () => db.userBadge.count() },
    ];

    let tablesExist = 0;
    let totalRecords = 0;

    for (const table of tableChecks) {
      try {
        const count = await table.countFn();
        healthCheck.tables[table.name as keyof typeof healthCheck.tables] = {
          exists: true,
          count,
        };
        tablesExist++;
        totalRecords += count;
        logger.debug(`✅ Table ${table.name}: ${count} records`);
      } catch (error) {
        logger.warn(`❌ Table ${table.name} check failed:`, { error });
        healthCheck.tables[table.name as keyof typeof healthCheck.tables] = {
          exists: false,
          count: 0,
        };
      }
    }

    healthCheck.database.tablesExist = tablesExist === tableChecks.length;

    // Check if database is properly seeded
    const badgeCount = healthCheck.tables.Badge.count;
    if (badgeCount > 0) {
      healthCheck.database.seeded = true;
      logger.debug("✅ Database appears to be seeded");
    } else {
      healthCheck.database.seeded = false;
      logger.debug("⚠️ Database may not be seeded (no badges found)");
    }

    // Generate recommendations based on health check
    if (!healthCheck.database.tablesExist) {
      healthCheck.recommendations.push(
        "Database schema not deployed. Run: npx prisma db push"
      );
    }

    if (!healthCheck.database.seeded) {
      healthCheck.recommendations.push(
        "Database not seeded. Run: npm run db:seed"
      );
    }

    if (healthCheck.tables.User.count === 0) {
      healthCheck.recommendations.push(
        "No users found. Try signing up or signing in to create a user."
      );
    }

    if (healthCheck.recommendations.length === 0) {
      healthCheck.recommendations.push("Database is healthy and ready to use!");
    }
  } catch (error) {
    logger.error("Health check failed:", { error });
    healthCheck.database.error = `Health check failed: ${error}`;
    healthCheck.recommendations.push(
      "Unexpected error during health check. Check server logs for details."
    );
  } finally {
    try {
      await db.$disconnect();
    } catch (error) {
      logger.warn("Failed to disconnect from database:", { error });
    }
  }

  // Set appropriate HTTP status based on health
  const isHealthy =
    healthCheck.database.connected &&
    healthCheck.database.tablesExist &&
    healthCheck.database.seeded;

  const status = isHealthy ? 200 : 503;

  return NextResponse.json(healthCheck, { status });
}

// POST /api/health/db - Trigger database seeding (for emergency fixes)
export async function POST() {
  try {
    // Import seeding function
    const { seedDatabase } = await import("@/scripts/seed-database");

    logger.info("🌱 Manual database seeding triggered via API");
    await seedDatabase();

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("❌ Manual database seeding failed:", { error });
    return NextResponse.json(
      {
        success: false,
        error: `Seeding failed: ${error}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
