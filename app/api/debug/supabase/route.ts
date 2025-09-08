import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Connection Test API
 *
 * Tests both server-side and client-side Supabase connections
 * Provides detailed diagnostics for Supabase configuration issues
 */
export async function GET(request: NextRequest) {
  // Only allow debug endpoints in development and preview environments
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_DEBUG) {
    return NextResponse.json(
      { error: "Debug endpoints are disabled in production" },
      { status: 404 }
    );
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    tests: {} as any,
    summary: {
      passed: 0,
      failed: 0,
      errors: [] as string[],
    },
  };

  // Helper function to run tests safely
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    try {
      console.log(`[Supabase Debug] Running test: ${testName}`);
      const result = await testFn();
      results.tests[testName] = {
        status: "✅ PASS",
        result,
        error: null,
      };
      results.summary.passed++;
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[Supabase Debug] Test failed: ${testName}`, error);

      results.tests[testName] = {
        status: "❌ FAIL",
        result: null,
        error: errorMessage,
      };
      results.summary.failed++;
      results.summary.errors.push(`${testName}: ${errorMessage}`);
      return null;
    }
  };

  // Test 1: Environment Variables
  await runTest("environment_variables", async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "✅ Present" : "❌ Missing",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey
        ? "✅ Present"
        : "❌ Missing",
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey
        ? "✅ Present"
        : "❌ Missing",
      url_format: supabaseUrl?.includes("supabase.co")
        ? "✅ Valid format"
        : "❌ Invalid format",
      anon_key_format: supabaseAnonKey?.startsWith("eyJ")
        ? "✅ Valid JWT format"
        : "❌ Invalid format",
    };
  });

  // Test 2: Server-side Supabase Client Creation
  await runTest("server_client_creation", async () => {
    const supabase = await createClient();

    return {
      client_created: !!supabase,
      client_type: "server",
      auth_available: !!supabase.auth,
      from_available: !!supabase.from,
    };
  });

  // Test 3: Browser Client Creation (simulate)
  await runTest("browser_client_creation", async () => {
    // This simulates browser client creation on server
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing required environment variables for browser client"
      );
    }

    // Simulate the createBrowserClient function
    const mockBrowserClient = {
      url: supabaseUrl,
      key: supabaseAnonKey,
      created: true,
    };

    return {
      url_accessible: !!supabaseUrl,
      anon_key_accessible: !!supabaseAnonKey,
      would_create: true,
      config: mockBrowserClient,
    };
  });

  // Test 4: Basic Connection Test
  await runTest("connection_test", async () => {
    const supabase = await createClient();

    // Simple connection test - just try to get session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    return {
      connection_established: !sessionError,
      session_accessible: !!sessionData,
      auth_working: !sessionError,
      error: sessionError?.message || null,
    };
  });

  // Test 5: Database Query Test (if possible)
  await runTest("database_query_test", async () => {
    const supabase = await createClient();

    try {
      // Try a simple query that should work regardless of RLS
      // Using rpc to call a function that returns basic info
      const { data, error, status } = await supabase
        .from("profiles") // assuming profiles table exists
        .select("count")
        .limit(0); // Don't return any data, just test connection

      return {
        query_executed: true,
        status_code: status,
        has_error: !!error,
        error_message: error?.message || null,
        error_code: error?.code || null,
        data_structure: data ? typeof data : null,
      };
    } catch (err) {
      // If profiles table doesn't exist, try auth.users (admin only)
      const { error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      return {
        query_executed: true,
        profiles_table_accessible: false,
        admin_auth_accessible: !error,
        admin_error: error?.message || null,
      };
    }
  });

  // Test 6: Auth Configuration Test
  await runTest("auth_configuration", async () => {
    const supabase = await createClient();

    // Test auth configuration
    const { data, error } = await supabase.auth.getUser();

    return {
      auth_client_accessible: !!supabase.auth,
      get_user_works: !error,
      user_data_structure: data ? Object.keys(data) : null,
      auth_error: error?.message || null,
      session_handling: "accessible",
    };
  });

  // Test 7: Storage Configuration Test
  await runTest("storage_configuration", async () => {
    const supabase = await createClient();

    try {
      // Test storage client
      const { data: buckets, error } = await supabase.storage.listBuckets();

      return {
        storage_client_accessible: !!supabase.storage,
        list_buckets_works: !error,
        buckets_found: buckets ? buckets.length : 0,
        bucket_names: buckets ? buckets.map((b) => b.name) : [],
        storage_error: error?.message || null,
      };
    } catch (err) {
      return {
        storage_client_accessible: !!supabase.storage,
        storage_error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // Overall assessment
  const overallStatus =
    results.summary.failed === 0
      ? "✅ HEALTHY"
      : results.summary.failed < results.summary.passed
        ? "⚠️ PARTIAL"
        : "❌ UNHEALTHY";

  results.summary.status = overallStatus;
  results.summary.total_tests = results.summary.passed + results.summary.failed;

  // Add recommendations
  const recommendations = [];

  if (results.tests.environment_variables?.error) {
    recommendations.push(
      "Check that all required Supabase environment variables are set"
    );
  }

  if (results.tests.connection_test?.error) {
    recommendations.push("Verify Supabase URL and API keys are correct");
  }

  if (results.tests.database_query_test?.error) {
    recommendations.push("Check database permissions and RLS policies");
  }

  results.summary.recommendations = recommendations;

  return NextResponse.json(results, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}

// POST endpoint for interactive testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { test, query } = body;

    if (test === "custom_query" && query) {
      const supabase = await createClient();

      // WARNING: This is for debugging only - be careful with custom queries
      try {
        const result = await supabase.rpc(query);

        return NextResponse.json({
          test: "custom_query",
          query,
          result: result.data,
          error: result.error?.message || null,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return NextResponse.json({
          test: "custom_query",
          query,
          result: null,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      error: "Invalid test request",
      available_tests: ["custom_query"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}
