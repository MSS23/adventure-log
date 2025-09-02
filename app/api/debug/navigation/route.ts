import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

// GET /api/debug/navigation - Navigation and session diagnostics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      session: {
        exists: !!session,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        userName: session?.user?.name || null,
      },
      routes: {
        protectedRoutes: [
          '/dashboard',
          '/albums', 
          '/globe',
          '/social',
          '/profile',
          '/settings',
          '/badges'
        ],
        publicRoutes: [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/error'
        ]
      },
      recommendations: [] as string[]
    };

    // Add recommendations based on session state
    if (!session) {
      diagnostics.recommendations.push("No active session - user should sign in");
    } else if (!session.user?.id) {
      diagnostics.recommendations.push("Session exists but no user ID - possible session corruption");
    } else {
      diagnostics.recommendations.push("Session appears healthy - navigation should work");
    }

    return NextResponse.json(diagnostics);
    
  } catch (error) {
    return NextResponse.json({
      error: "Failed to generate navigation diagnostics",
      details: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}