import { NextResponse } from "next/server";

// OAuth test endpoint to simulate the flow and capture errors
export async function GET() {
  try {
    // Test environment variables
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    // Basic validation
    const issues = [];
    
    if (!googleClientId) issues.push("GOOGLE_CLIENT_ID is missing");
    if (!googleClientSecret) issues.push("GOOGLE_CLIENT_SECRET is missing");
    if (!nextAuthUrl) issues.push("NEXTAUTH_URL is missing");
    if (!nextAuthSecret) issues.push("NEXTAUTH_SECRET is missing");

    if (googleClientId && !googleClientId.includes('.apps.googleusercontent.com')) {
      issues.push("GOOGLE_CLIENT_ID has invalid format");
    }

    if (googleClientSecret && !googleClientSecret.startsWith('GOCSPX-')) {
      issues.push("GOOGLE_CLIENT_SECRET has invalid format");
    }

    // Test Google OAuth endpoints accessibility
    const testResults = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      validation: {
        issues: issues.length > 0 ? issues : null,
        allValid: issues.length === 0,
      },

      oauth: {
        clientIdPresent: !!googleClientId,
        clientIdLength: googleClientId?.length || 0,
        clientIdStart: googleClientId?.substring(0, 20) || 'N/A',
        
        clientSecretPresent: !!googleClientSecret,
        clientSecretLength: googleClientSecret?.length || 0,
        clientSecretStart: googleClientSecret?.substring(0, 8) || 'N/A',
        
        nextAuthUrlPresent: !!nextAuthUrl,
        nextAuthUrl: nextAuthUrl || 'N/A',
        
        nextAuthSecretPresent: !!nextAuthSecret,
        nextAuthSecretLength: nextAuthSecret?.length || 0,
      },

      urls: {
        authSignIn: nextAuthUrl ? `${nextAuthUrl}/api/auth/signin/google` : 'N/A',
        authCallback: nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/google` : 'N/A',
        authError: nextAuthUrl ? `${nextAuthUrl}/auth/error` : 'N/A',
      },

      debugging: {
        message: issues.length > 0 
          ? "Environment validation failed - fix these issues first" 
          : "Environment validation passed - OAuth should work if Google Console is configured correctly",
        
        nextSteps: issues.length > 0 ? [
          "Fix the environment variable issues listed above",
          "Redeploy the application",
          "Test again"
        ] : [
          "Environment variables look correct",
          "Check Google Cloud Console configuration",
          "Verify redirect URIs match exactly",
          "Check that Google APIs are enabled",
          "Try the OAuth flow and check Vercel logs for errors"
        ]
      }
    };

    return NextResponse.json(testResults, { 
      status: issues.length > 0 ? 400 : 200 
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: "OAuth test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    );
  }
}