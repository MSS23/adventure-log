import { NextRequest, NextResponse } from "next/server";

/**
 * Debug API Endpoint - Environment Variables
 *
 * Returns all environment variables in a masked format for security
 * Helps diagnose configuration issues without exposing sensitive data
 */
export async function GET(_request: NextRequest) {
  // Only allow debug endpoints in development and preview environments
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_DEBUG) {
    return NextResponse.json(
      { error: "Debug endpoints are disabled in production" },
      { status: 404 }
    );
  }

  try {
    // Function to mask sensitive values
    const maskValue = (value: string | undefined, visibleChars = 4): string => {
      if (!value) return "❌ MISSING";
      if (value.length <= visibleChars) return "***";
      return (
        value.substring(0, visibleChars) +
        "***" +
        value.substring(value.length - visibleChars)
      );
    };

    // Client-side environment variables (available in browser)
    const clientEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET:
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
      NEXT_PUBLIC_DEV_TOOLS: process.env.NEXT_PUBLIC_DEV_TOOLS,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Server-side environment variables (not available in browser)
    const serverEnv = {
      DATABASE_URL: process.env.DATABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    };

    // Mask all values for security
    const maskedClientEnv = Object.fromEntries(
      Object.entries(clientEnv).map(([key, value]) => [key, maskValue(value)])
    );

    const maskedServerEnv = Object.fromEntries(
      Object.entries(serverEnv).map(([key, value]) => [key, maskValue(value)])
    );

    // Count missing variables
    const missingClientVars = Object.entries(clientEnv)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    const missingServerVars = Object.entries(serverEnv)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    // Check critical variables
    const criticalVars = {
      supabase: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      cloudinary: {
        cloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        apiKey: !!process.env.CLOUDINARY_API_KEY,
        apiSecret: !!process.env.CLOUDINARY_API_SECRET,
      },
      auth: {
        googleClientId: !!process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      },
      database: {
        databaseUrl: !!process.env.DATABASE_URL,
      },
    };

    // Service readiness check
    const serviceStatus = {
      supabase: criticalVars.supabase.url && criticalVars.supabase.anonKey,
      cloudinary:
        criticalVars.cloudinary.cloudName &&
        criticalVars.cloudinary.uploadPreset,
      googleAuth:
        criticalVars.auth.googleClientId &&
        criticalVars.auth.googleClientSecret,
      database: criticalVars.database.databaseUrl,
    };

    const response = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      platform: process.platform,

      // Environment variables (masked)
      clientEnvironment: maskedClientEnv,
      serverEnvironment: maskedServerEnv,

      // Missing variables
      missing: {
        client: missingClientVars,
        server: missingServerVars,
        total: missingClientVars.length + missingServerVars.length,
      },

      // Critical service configuration
      services: criticalVars,

      // Overall service status
      status: {
        ...serviceStatus,
        overall: Object.values(serviceStatus).every((status) => status),
      },

      // Recommendations
      recommendations: [] as string[],
    };

    // Add recommendations based on missing variables
    if (!serviceStatus.supabase) {
      response.recommendations.push(
        "⚠️ Supabase configuration incomplete - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    if (!serviceStatus.cloudinary) {
      response.recommendations.push(
        "⚠️ Cloudinary configuration incomplete - check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"
      );
    }
    if (!serviceStatus.googleAuth) {
      response.recommendations.push(
        "⚠️ Google OAuth configuration incomplete - check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
      );
    }
    if (!serviceStatus.database) {
      response.recommendations.push(
        "⚠️ Database configuration incomplete - check DATABASE_URL"
      );
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Debug API error:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve environment information",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also handle POST requests for additional debugging
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json({
      message: "Debug API - POST endpoint",
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
