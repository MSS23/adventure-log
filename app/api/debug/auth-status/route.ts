import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    auth: {
      user: null as any,
      hasUser: false,
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

  // Test 2: Supabase Auth Check
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    results.auth.user = user
      ? {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        }
      : null;
    results.auth.hasUser = !!user;
    results.auth.userId = user?.id || null;
    results.auth.userEmail = user?.email || null;

    results.tests.push({
      name: "Supabase Auth Check",
      status: user ? "success" : "warning",
      details: {
        hasUser: !!user,
        userExists: !!user,
        userId: user?.id || null,
        email: user?.email || null,
        authError: authError?.message || null,
      },
    });
  } catch (error) {
    results.tests.push({
      name: "Supabase Auth Check",
      status: "error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 3: Supabase Environment Check
  const supabaseEnvCheck = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  results.tests.push({
    name: "Supabase Environment",
    status:
      supabaseEnvCheck.hasSupabaseUrl &&
      supabaseEnvCheck.hasSupabaseAnonKey &&
      supabaseEnvCheck.hasServiceRoleKey
        ? "success"
        : "error",
    details: supabaseEnvCheck,
  });

  // Calculate overall status
  const hasErrors = results.tests.some((test) => test.status === "error");
  const overallStatus = hasErrors ? "error" : "success";

  return NextResponse.json({
    status: overallStatus,
    message: hasErrors
      ? "Some Supabase auth tests failed"
      : "Supabase authentication system appears healthy",
    ...results,
  });
}
