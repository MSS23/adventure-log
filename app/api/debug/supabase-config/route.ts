import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Debug endpoint to check Supabase configuration
 * GET /api/debug/supabase-config
 */
export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;

    // Basic configuration check
    const config = {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
      hasBucket: !!supabaseBucket,
      url: supabaseUrl,
      bucket: supabaseBucket,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    // Test client creation
    let clientTest = null;
    try {
      const supabase = await createClient();
      clientTest = {
        clientCreated: !!supabase,
        canCreateClient: true,
      };
    } catch (error) {
      clientTest = {
        clientCreated: false,
        canCreateClient: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test authentication endpoint availability
    let authTest: any = null;
    try {
      if (supabaseUrl && supabaseAnonKey) {
        const authEndpoint = `${supabaseUrl}/auth/v1/settings`;
        const response = await fetch(authEndpoint, {
          method: "GET",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        });

        authTest = {
          endpointReachable: response.ok,
          status: response.status,
          statusText: response.statusText,
        };

        if (response.ok) {
          try {
            const settings = await response.json();
            authTest.settings = {
              external_email_enabled: settings.external?.email?.enabled,
              external_phone_enabled: settings.external?.phone?.enabled,
              external_providers: Object.keys(settings.external || {}).filter(
                (key) =>
                  key !== "email" &&
                  key !== "phone" &&
                  settings.external[key]?.enabled
              ),
            };
          } catch (e) {
            authTest.settingsParseError =
              e instanceof Error ? e.message : "Unknown error";
          }
        }
      }
    } catch (error) {
      authTest = {
        endpointReachable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    return NextResponse.json({
      success: true,
      debug: {
        configuration: config,
        clientTest,
        authTest,
        recommendations: generateRecommendations(config, clientTest, authTest),
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  config: any,
  clientTest: any,
  authTest: any
): string[] {
  const recommendations: string[] = [];

  if (!config.hasUrl) {
    recommendations.push("❌ NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  if (!config.hasAnonKey) {
    recommendations.push("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  }

  if (!config.hasServiceRoleKey) {
    recommendations.push(
      "⚠️ SUPABASE_SERVICE_ROLE_KEY is missing (needed for admin operations)"
    );
  }

  if (!config.hasBucket) {
    recommendations.push(
      "⚠️ NEXT_PUBLIC_SUPABASE_BUCKET is missing (needed for file uploads)"
    );
  }

  if (!clientTest?.canCreateClient) {
    recommendations.push(
      "❌ Cannot create Supabase client - check URL and keys"
    );
  }

  if (authTest && !authTest.endpointReachable) {
    recommendations.push(
      "❌ Cannot reach Supabase auth endpoint - check network/URL"
    );
  }

  if (authTest?.settings && !authTest.settings.external_email_enabled) {
    recommendations.push(
      "⚠️ Email authentication may not be enabled in Supabase dashboard"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ All basic configuration checks passed");
    recommendations.push("ℹ️ If you're still experiencing auth issues, check:");
    recommendations.push(
      "  - Email/password provider is enabled in Supabase dashboard"
    );
    recommendations.push(
      "  - Row Level Security (RLS) policies are configured"
    );
    recommendations.push("  - Supabase project is active and not paused");
  }

  return recommendations;
}

/**
 * POST /api/debug/supabase-config
 * Test authentication with provided credentials
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required for auth test",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Test sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const result = {
      success: !error,
      timestamp: new Date().toISOString(),
      test: {
        email,
        passwordLength: password.length,
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userConfirmed: data?.user?.email_confirmed_at ? true : false,
      },
      error: error
        ? {
            message: error.message,
            status: error.status,
            code: (error as any).__isAuthError ? "AUTH_ERROR" : "UNKNOWN_ERROR",
          }
        : null,
    };

    // Sign out after test
    if (data?.session) {
      await supabase.auth.signOut();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Auth test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
