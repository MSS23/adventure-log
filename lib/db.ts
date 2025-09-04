import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
<<<<<<< HEAD
import { isProduction, isDevelopment, isDatabaseConfigured } from "../src/env";
=======
import { isProduction, isDevelopment, isDatabaseConfigured } from "./env";
>>>>>>> oauth-upload-fixes

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a mock PrismaClient for build time
<<<<<<< HEAD
function createMockPrismaClient(): any {
  const mockHandler = {
    get(_target: any, prop: string) {
=======
function createMockPrismaClient(): PrismaClient {
  const mockHandler: ProxyHandler<object> = {
    get(_target: object, prop: string | symbol) {
>>>>>>> oauth-upload-fixes
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

<<<<<<< HEAD
  return new Proxy({}, mockHandler);
=======
  return new Proxy({}, mockHandler) as PrismaClient;
>>>>>>> oauth-upload-fixes
}

// Create Prisma client with enhanced error handling for Turbopack and build-time
function createPrismaClient(): PrismaClient {
  try {
    // During build time or when Prisma client is not available, return a mock
    if (isProduction && !isDatabaseConfigured()) {
      logger.warn(
        "Database URL not available during build, using mock Prisma client"
      );
      return createMockPrismaClient();
    }

    return new PrismaClient({
      log: isDevelopment ? ["query", "error", "warn"] : ["error"],
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

if (!isProduction) {
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
  return isDatabaseConfigured();
}
