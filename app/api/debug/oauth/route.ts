import { NextResponse } from "next/server";

// Enhanced debug endpoint for OAuth troubleshooting
export async function GET() {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    // Mask sensitive values for safe display
    const maskValue = (value: string | undefined) => {
      if (!value) return "❌ NOT SET";
      return value.length > 10 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` 
        : `${value.substring(0, 4)}...`;
    };

    // Validate environment variable formats
    const validateClientId = (clientId: string | undefined) => {
      if (!clientId) return { valid: false, reason: "Not set" };
      if (!clientId.includes('.apps.googleusercontent.com')) return { valid: false, reason: "Invalid format - missing .apps.googleusercontent.com" };
      if (!clientId.startsWith('51389942334-')) return { valid: false, reason: "Invalid format - doesn't start with current project ID (51389942334-)" };
      return { valid: true, reason: "Valid format" };
    };

    const validateClientSecret = (secret: string | undefined) => {
      if (!secret) return { valid: false, reason: "Not set" };
      if (!secret.startsWith('GOCSPX-')) return { valid: false, reason: "Invalid format - should start with GOCSPX-" };
      if (secret.length !== 35) return { valid: false, reason: `Invalid length - expected 35 characters, got ${secret.length}` };
      return { valid: true, reason: "Valid format" };
    };

    const validateNextAuthUrl = (url: string | undefined) => {
      if (!url) return { valid: false, reason: "Not set" };
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'https:' && !url.includes('localhost')) {
          return { valid: false, reason: "Must use HTTPS for production" };
        }
        return { valid: true, reason: "Valid URL format" };
      } catch {
        return { valid: false, reason: "Invalid URL format" };
      }
    };

    const clientIdValidation = validateClientId(googleClientId);
    const clientSecretValidation = validateClientSecret(googleClientSecret);
    const nextAuthUrlValidation = validateNextAuthUrl(nextAuthUrl);

    const config = {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      
      oauth: {
        googleClientId: {
          present: !!googleClientId,
          masked: maskValue(googleClientId),
          length: googleClientId ? googleClientId.length : 0,
          validation: clientIdValidation,
          expectedStart: '51389942334-',
          actualStart: googleClientId ? googleClientId.substring(0, 12) : 'N/A',
        },
        
        googleClientSecret: {
          present: !!googleClientSecret,
          masked: maskValue(googleClientSecret),
          length: googleClientSecret ? googleClientSecret.length : 0,
          validation: clientSecretValidation,
          expectedStart: 'GOCSPX-',
          actualStart: googleClientSecret ? googleClientSecret.substring(0, 7) : 'N/A',
        },
        
        nextAuthUrl: {
          present: !!nextAuthUrl,
          value: nextAuthUrl, // Safe to show full URL
          validation: nextAuthUrlValidation,
          isProduction: nextAuthUrl ? nextAuthUrl.includes('vercel.app') : false,
          isLocalhost: nextAuthUrl ? nextAuthUrl.includes('localhost') : false,
        },
        
        nextAuthSecret: {
          present: !!nextAuthSecret,
          masked: maskValue(nextAuthSecret),
          length: nextAuthSecret ? nextAuthSecret.length : 0,
          validation: nextAuthSecret ? 
            (nextAuthSecret.length >= 32 ? { valid: true, reason: "Sufficient length" } : { valid: false, reason: "Too short, should be 32+ characters" }) :
            { valid: false, reason: "Not set" }
        },
      },
      
      urls: {
        expectedCallbackUrl: nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/google` : '❌ Cannot construct - NEXTAUTH_URL missing',
        signInUrl: nextAuthUrl ? `${nextAuthUrl}/auth/signin` : '❌ Cannot construct',
        errorUrl: nextAuthUrl ? `${nextAuthUrl}/auth/error` : '❌ Cannot construct',
      },
      
      validation: {
        allRequiredPresent: !!(googleClientId && googleClientSecret && nextAuthUrl && nextAuthSecret),
        allFormatsValid: clientIdValidation.valid && clientSecretValidation.valid && nextAuthUrlValidation.valid,
        readyForProduction: !!(googleClientId && googleClientSecret && nextAuthUrl && nextAuthSecret) &&
                          clientIdValidation.valid && clientSecretValidation.valid && nextAuthUrlValidation.valid,
      },
      
      troubleshooting: {
        commonIssues: [
          !googleClientId && "Missing GOOGLE_CLIENT_ID environment variable",
          !googleClientSecret && "Missing GOOGLE_CLIENT_SECRET environment variable", 
          !nextAuthUrl && "Missing NEXTAUTH_URL environment variable",
          !nextAuthSecret && "Missing NEXTAUTH_SECRET environment variable",
          !clientIdValidation.valid && `Client ID issue: ${clientIdValidation.reason}`,
          !clientSecretValidation.valid && `Client Secret issue: ${clientSecretValidation.reason}`,
          !nextAuthUrlValidation.valid && `NextAuth URL issue: ${nextAuthUrlValidation.reason}`,
        ].filter(Boolean),
        
        nextSteps: googleClientId && googleClientSecret && nextAuthUrl && nextAuthSecret ? [
          "All environment variables are present",
          "Check Google Cloud Console OAuth client configuration",
          "Verify redirect URIs match exactly",
          "Ensure APIs are enabled (Google+ API, People API)",
          "Check domain authorization in Google Console",
        ] : [
          "Fix missing environment variables first",
          "Re-deploy after updating environment variables",
          "Test again after deployment completes",
        ]
      }
    };

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to check OAuth configuration",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack trace') : undefined,
      }, 
      { status: 500 }
    );
  }
}