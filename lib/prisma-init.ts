// Prisma initialization utilities for Next.js 15.5.0 Turbopack compatibility

import { db } from "./db";

let isInitialized = false;

export async function initializePrisma() {
  if (isInitialized) {
    return db;
  }

  try {
    // Test the connection
    await db.$connect();
    console.log("✅ Prisma client connected successfully");
    isInitialized = true;
    return db;
  } catch (error) {
    console.error("❌ Failed to initialize Prisma client:", error);
    throw new Error(`Database connection failed: ${(error as Error).message}`);
  }
}

// Graceful shutdown
export async function closePrisma() {
  try {
    await db.$disconnect();
    isInitialized = false;
    console.log("✅ Prisma client disconnected");
  } catch (error) {
    console.error("❌ Error disconnecting Prisma client:", error);
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
