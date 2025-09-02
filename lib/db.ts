import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a mock PrismaClient for build time
function createMockPrismaClient(): any {
  const mockHandler = {
    get(_target: any, prop: string) {
      if (prop === "$connect" || prop === "$disconnect") {
        return () => Promise.resolve();
      }
      // Return a proxy for nested properties (like db.user.findMany)
      return new Proxy(
        () => Promise.reject(new Error("Database not available during build")),
        mockHandler
      );
    },
  };

  return new Proxy({}, mockHandler);
}

// Create Prisma client with enhanced error handling for Turbopack and build-time
function createPrismaClient(): PrismaClient {
  try {
    // During build time or when Prisma client is not available, return a mock
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      logger.warn(
        "Database URL not available during build, using mock Prisma client"
      );
      return createMockPrismaClient();
    }

    return new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
      errorFormat: "pretty",
    });
  } catch (error) {
    logger.warn(
      "Failed to initialize Prisma Client, using mock client:",
      error
    );
    return createMockPrismaClient();
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Ensure client is connected
export async function ensurePrismaConnection() {
  try {
    await db.$connect();
    return true;
  } catch (error) {
    logger.error("Failed to connect to database:", error);
    throw error;
  }
}

// Helper function to check if database is available for API routes
export function isDatabaseAvailable(): boolean {
  return process.env.DATABASE_URL !== undefined;
}
