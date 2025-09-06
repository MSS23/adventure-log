import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    // Test server-side authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[Auth Test API] User error:", userError);
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          details: userError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "No authenticated user found",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Test database access
    const { data: photos, error: dbError } = await supabase
      .from("photos")
      .select("id, filename, created_at")
      .limit(5);

    const response = {
      success: true,
      message: "Authentication test successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        database: {
          connected: !dbError,
          error: dbError?.message || null,
          photoCount: photos?.length || 0,
          samplePhotos: photos || [],
        },
        server: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "unknown",
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Auth Test API] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
