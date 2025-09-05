import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseAvailable } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getEnvironmentStatus } from "@/lib/env";
import { checkPrismaHealth } from "@/lib/prisma-init";

/**
 * GET /api/health
 *
 * Comprehensive health check endpoint for monitoring system status
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  const results = {
    status: "unknown",
    timestamp: new Date().toISOString(),
    version: "2.3.0",
    environment: getEnvironmentStatus(),
    services: {} as any,
    performance: {
      responseTime: 0,
    },
  };

  // Service 1: Database Health (using existing checkPrismaHealth)
  try {
    const healthCheck = await checkPrismaHealth();
    const dbStart = Date.now();

    if (isDatabaseAvailable() && healthCheck.status === "healthy") {
      const [userCount, albumCount] = await Promise.all([
        db.user.count(),
        db.album.count(),
      ]);
      const dbTime = Date.now() - dbStart;

      results.services.database = {
        status: "healthy",
        responseTime: dbTime,
        details: {
          userCount,
          albumCount,
          connectionPool: "active",
          prismaHealth: healthCheck,
        },
      };
    } else {
      results.services.database = {
        status: healthCheck.status === "healthy" ? "unavailable" : "error",
        error:
          healthCheck.status === "healthy"
            ? "Database URL not configured"
            : healthCheck.error,
        details: healthCheck,
      };
    }
  } catch (error) {
    results.services.database = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Service 2: Supabase Storage Health
  try {
    const storageStart = Date.now();
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    const storageTime = Date.now() - storageStart;

    if (error) {
      results.services.storage = {
        status: "error",
        error: error.message,
      };
    } else {
      const adventureBucket = buckets?.find(
        (b) => b.name === "adventure-photos"
      );
      results.services.storage = {
        status: adventureBucket ? "healthy" : "warning",
        responseTime: storageTime,
        details: {
          bucketExists: !!adventureBucket,
          totalBuckets: buckets?.length || 0,
          bucket: adventureBucket || null,
        },
      };
    }
  } catch (error) {
    results.services.storage = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Service 3: NextAuth Configuration Check
  try {
    const authConfig = {
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    };

    const authHealthy =
      authConfig.hasNextAuthUrl &&
      authConfig.hasNextAuthSecret &&
      authConfig.hasGoogleClientId &&
      authConfig.hasGoogleClientSecret;

    results.services.authentication = {
      status: authHealthy ? "healthy" : "error",
      details: authConfig,
    };
  } catch (error) {
    results.services.authentication = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Calculate overall status
  const serviceStatuses = Object.values(results.services).map(
    (service: any) => service.status
  );
  const hasError = serviceStatuses.includes("error");
  const hasWarning = serviceStatuses.includes("warning");

  results.status = hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy";
  results.performance.responseTime = Date.now() - startTime;

  const statusCode = hasError ? 503 : hasWarning ? 200 : 200;

  return NextResponse.json(results, { status: statusCode });
}
