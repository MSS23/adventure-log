import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import { isProduction, isDevelopment, isDatabaseConfigured } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a mock PrismaClient for build time
function createMockPrismaClient(): PrismaClient {
  const mockHandler: ProxyHandler<object> = {
    get(_target: object, prop: string | symbol) {
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

  return new Proxy({}, mockHandler) as PrismaClient;
}

// Create Prisma client with enhanced error handling for Turbopack and build-time
function createPrismaClient(): PrismaClient {
  try {
    // During build time or when Prisma client is not available, return a mock
    if (isProduction && !isDatabaseConfigured()) {
      logger.warn("Database URL not available during build, { using mock Prisma client" });
      return createMockPrismaClient();
    }

    return new PrismaClient({
      log: isDevelopment ? ["query", "error", "warn"] : ["error"],
      errorFormat: "pretty",
    });
  } catch (error) {
    logger.warn("Failed to initialize Prisma Client, { using mock client:",
      error });
    return createMockPrismaClient();
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = db;
}

// Ensure client is connected
export async function ensurePrismaConnection() {
  try {
    await db.$connect();
    return true;
  } catch (error) {
    logger.error("Failed to connect to database:", { error: error });
    throw error;
  }
}

// Helper function to check if database is available for API routes
export function isDatabaseAvailable(): boolean {
  return isDatabaseConfigured();
}
