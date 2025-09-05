// Prisma initialization utilities for Next.js 15.5.0 Turbopack compatibility

import { db } from "./db";
import { logger } from "./logger";

let isInitialized = false;

export async function initializePrisma() {
  if (isInitialized) {
    return db;
  }

  try {
    // Test the connection
    await db.$connect();
    logger.info("✅ Prisma client connected successfully");
    isInitialized = true;
    return db;
  } catch (error) {
    logger.error("❌ Failed to initialize Prisma client:", { error: error });
    throw new Error(`Database connection failed: ${(error as Error).message}`);
  }
}

// Graceful shutdown
export async function closePrisma() {
  try {
    await db.$disconnect();
    isInitialized = false;
    logger.info("✅ Prisma client disconnected");
  } catch (error) {
    logger.error("❌ Error disconnecting Prisma client:", { error: error });
  }
}

// Health check function
export async function checkPrismaHealth() {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "healthy", connected: true };
  } catch (error) {
    return {
      status: "unhealthy",
      connected: false,
      error: (error as Error).message,
    };
  }
}
