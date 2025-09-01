import { NextResponse } from "next/server";

// Debug endpoint to check OAuth configuration (safe for production)
export async function GET() {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    // Mask sensitive values for safe display
    const maskValue = (value: string | undefined) => {
      if (!value) return "❌ NOT SET";
      return value.length > 10 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` 
        : `${value.substring(0, 4)}...`;
    };

    const config = {
      environment: process.env.NODE_ENV,
      oauth: {
        googleClientId: googleClientId ? {
          present: !!googleClientId,
          masked: maskValue(googleClientId),
          length: googleClientId.length,
          startsWithExpected: googleClientId.startsWith('357172282578-'),
        } : { present: false },
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? {
          present: !!process.env.GOOGLE_CLIENT_SECRET,
          masked: maskValue(process.env.GOOGLE_CLIENT_SECRET),
          length: process.env.GOOGLE_CLIENT_SECRET.length,
          startsWithExpected: process.env.GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-'),
        } : { present: false },
        nextAuthUrl: nextAuthUrl ? {
          present: !!nextAuthUrl,
          value: nextAuthUrl, // Safe to show full URL
          isProduction: nextAuthUrl.includes('vercel.app'),
        } : { present: false },
        nextAuthSecret: {
          present: !!nextAuthSecret,
          masked: maskValue(nextAuthSecret),
          length: nextAuthSecret ? nextAuthSecret.length : 0,
        },
      },
      expectedCallbackUrl: nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/google` : '❌ Cannot construct - NEXTAUTH_URL missing',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to check OAuth configuration",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}