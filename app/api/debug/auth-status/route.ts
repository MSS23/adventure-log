import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, isDatabaseAvailable } from "@/lib/db";
import { getEnvironmentStatus } from "@/lib/env";

/**
 * GET /api/debug/auth-status
 *
 * Debug endpoint to test authentication status and database connectivity in production
 */
export async function GET(_request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: getEnvironmentStatus(),
    database: {
      available: isDatabaseAvailable(),
      connectionTest: null as any,
    },
    session: {
      raw: null as any,
      hasSession: false,
      userId: null as string | null,
      userEmail: null as string | null,
    },
    tests: [] as any[],
  };

  // Test 1: Database Connection
  try {
    if (isDatabaseAvailable()) {
      const userCount = await db.user.count();
      results.database.connectionTest = {
        status: "success",
        userCount,
        message: "Database connection successful",
      };
      results.tests.push({
        name: "Database Connection",
        status: "success",
        details: { userCount },
      });
    } else {
      results.database.connectionTest = {
        status: "error",
        message: "Database not configured",
      };
      results.tests.push({
        name: "Database Connection",
        status: "error",
        details: "Database URL not available",
      });
    }
  } catch (error) {
    results.database.connectionTest = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
    results.tests.push({
      name: "Database Connection",
      status: "error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 2: Session Check
  try {
    const session = await getServerSession(authOptions);
    results.session.raw = session
      ? { ...session, user: { ...session.user } }
      : null;
    results.session.hasSession = !!session;
    results.session.userId = session?.user?.id || null;
    results.session.userEmail = session?.user?.email || null;

    results.tests.push({
      name: "Session Check",
      status: session ? "success" : "warning",
      details: {
        hasSession: !!session,
        sessionExists: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
      },
    });
  } catch (error) {
    results.tests.push({
      name: "Session Check",
      status: "error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 3: NextAuth Environment Check
  const authEnvCheck = {
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  };

  results.tests.push({
    name: "NextAuth Environment",
    status:
      authEnvCheck.hasNextAuthUrl &&
      authEnvCheck.hasNextAuthSecret &&
      authEnvCheck.hasGoogleClientId &&
      authEnvCheck.hasGoogleClientSecret
        ? "success"
        : "error",
    details: authEnvCheck,
  });

  // Calculate overall status
  const hasErrors = results.tests.some((test) => test.status === "error");
  const overallStatus = hasErrors ? "error" : "success";

  return NextResponse.json({
    status: overallStatus,
    message: hasErrors
      ? "Some authentication tests failed"
      : "Authentication system appears healthy",
    ...results,
  });
}
