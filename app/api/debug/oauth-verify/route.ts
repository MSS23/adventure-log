import { NextResponse } from "next/server";

/**
 * Enhanced OAuth Verification Endpoint
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> oauth-upload-fixes
 * This endpoint provides comprehensive OAuth configuration verification
 * with detailed diagnostics and troubleshooting information.
 */
export async function GET() {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    // Mask sensitive values for safe display
    const maskValue = (value: string | undefined) => {
      if (!value) return "❌ NOT SET";
<<<<<<< HEAD
      return value.length > 10 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` 
=======
      return value.length > 10
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
>>>>>>> oauth-upload-fixes
        : `${value.substring(0, 4)}...`;
    };

    // Enhanced validation functions
    const validateClientId = (clientId: string | undefined) => {
<<<<<<< HEAD
      if (!clientId) return { valid: false, severity: "error", reason: "Not set" };
      if (!clientId.includes('.apps.googleusercontent.com')) {
        return { valid: false, severity: "error", reason: "Invalid format - missing .apps.googleusercontent.com" };
      }
      if (!clientId.startsWith('51389942334-')) {
        return { valid: false, severity: "error", reason: "Invalid format - should start with 51389942334-" };
=======
      if (!clientId)
        return { valid: false, severity: "error", reason: "Not set" };
      if (!clientId.includes(".apps.googleusercontent.com")) {
        return {
          valid: false,
          severity: "error",
          reason: "Invalid format - missing .apps.googleusercontent.com",
        };
      }
      if (!clientId.startsWith("51389942334-")) {
        return {
          valid: false,
          severity: "error",
          reason: "Invalid format - should start with 51389942334-",
        };
>>>>>>> oauth-upload-fixes
      }
      return { valid: true, severity: "success", reason: "Valid format" };
    };

    const validateClientSecret = (secret: string | undefined) => {
<<<<<<< HEAD
      if (!secret) return { valid: false, severity: "error", reason: "Not set" };
      if (!secret.startsWith('GOCSPX-')) {
        return { valid: false, severity: "error", reason: "Invalid format - should start with GOCSPX-" };
      }
      if (secret.length !== 35) {
        return { valid: false, severity: "error", reason: `Invalid length - expected 35 characters, got ${secret.length}` };
=======
      if (!secret)
        return { valid: false, severity: "error", reason: "Not set" };
      if (!secret.startsWith("GOCSPX-")) {
        return {
          valid: false,
          severity: "error",
          reason: "Invalid format - should start with GOCSPX-",
        };
      }
      if (secret.length !== 35) {
        return {
          valid: false,
          severity: "error",
          reason: `Invalid length - expected 35 characters, got ${secret.length}`,
        };
>>>>>>> oauth-upload-fixes
      }
      return { valid: true, severity: "success", reason: "Valid format" };
    };

    const validateNextAuthUrl = (url: string | undefined) => {
      if (!url) return { valid: false, severity: "error", reason: "Not set" };
      try {
        const urlObj = new URL(url);
<<<<<<< HEAD
        if (urlObj.protocol !== 'https:' && !url.includes('localhost')) {
          return { valid: false, severity: "warning", reason: "Should use HTTPS for production" };
        }
        return { valid: true, severity: "success", reason: "Valid URL format" };
      } catch {
        return { valid: false, severity: "error", reason: "Invalid URL format" };
=======
        if (urlObj.protocol !== "https:" && !url.includes("localhost")) {
          return {
            valid: false,
            severity: "warning",
            reason: "Should use HTTPS for production",
          };
        }
        return { valid: true, severity: "success", reason: "Valid URL format" };
      } catch {
        return {
          valid: false,
          severity: "error",
          reason: "Invalid URL format",
        };
>>>>>>> oauth-upload-fixes
      }
    };

    const validateNextAuthSecret = (secret: string | undefined) => {
<<<<<<< HEAD
      if (!secret) return { valid: false, severity: "error", reason: "Not set" };
      if (secret.length < 32) {
        return { valid: false, severity: "warning", reason: "Should be at least 32 characters for security" };
=======
      if (!secret)
        return { valid: false, severity: "error", reason: "Not set" };
      if (secret.length < 32) {
        return {
          valid: false,
          severity: "warning",
          reason: "Should be at least 32 characters for security",
        };
>>>>>>> oauth-upload-fixes
      }
      return { valid: true, severity: "success", reason: "Sufficient length" };
    };

    // Run validations
    const clientIdValidation = validateClientId(googleClientId);
    const clientSecretValidation = validateClientSecret(googleClientSecret);
    const nextAuthUrlValidation = validateNextAuthUrl(nextAuthUrl);
    const nextAuthSecretValidation = validateNextAuthSecret(nextAuthSecret);

    // Calculate overall health
<<<<<<< HEAD
    const allValidations = [clientIdValidation, clientSecretValidation, nextAuthUrlValidation, nextAuthSecretValidation];
    const errorCount = allValidations.filter(v => !v.valid && v.severity === "error").length;
    const warningCount = allValidations.filter(v => !v.valid && v.severity === "warning").length;
    
=======
    const allValidations = [
      clientIdValidation,
      clientSecretValidation,
      nextAuthUrlValidation,
      nextAuthSecretValidation,
    ];
    const errorCount = allValidations.filter(
      (v) => !v.valid && v.severity === "error"
    ).length;
    const warningCount = allValidations.filter(
      (v) => !v.valid && v.severity === "warning"
    ).length;

>>>>>>> oauth-upload-fixes
    let overallHealth = "healthy";
    if (errorCount > 0) overallHealth = "critical";
    else if (warningCount > 0) overallHealth = "warning";

    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      overallHealth,
      summary: {
        totalChecks: allValidations.length,
<<<<<<< HEAD
        passed: allValidations.filter(v => v.valid).length,
        errors: errorCount,
        warnings: warningCount,
      },
      
=======
        passed: allValidations.filter((v) => v.valid).length,
        errors: errorCount,
        warnings: warningCount,
      },

>>>>>>> oauth-upload-fixes
      oauth: {
        googleClientId: {
          present: !!googleClientId,
          masked: maskValue(googleClientId),
          length: googleClientId ? googleClientId.length : 0,
          validation: clientIdValidation,
<<<<<<< HEAD
          expectedFormat: "51389942334-xxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
          actualStart: googleClientId ? googleClientId.substring(0, 12) : 'N/A',
        },
        
=======
          expectedFormat:
            "51389942334-xxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
          actualStart: googleClientId ? googleClientId.substring(0, 12) : "N/A",
        },

>>>>>>> oauth-upload-fixes
        googleClientSecret: {
          present: !!googleClientSecret,
          masked: maskValue(googleClientSecret),
          length: googleClientSecret ? googleClientSecret.length : 0,
          validation: clientSecretValidation,
          expectedFormat: "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx",
<<<<<<< HEAD
          actualStart: googleClientSecret ? googleClientSecret.substring(0, 7) : 'N/A',
        },
        
=======
          actualStart: googleClientSecret
            ? googleClientSecret.substring(0, 7)
            : "N/A",
        },

>>>>>>> oauth-upload-fixes
        nextAuthUrl: {
          present: !!nextAuthUrl,
          value: nextAuthUrl, // Safe to show full URL
          validation: nextAuthUrlValidation,
<<<<<<< HEAD
          isProduction: nextAuthUrl ? nextAuthUrl.includes('vercel.app') : false,
          isLocalhost: nextAuthUrl ? nextAuthUrl.includes('localhost') : false,
        },
        
=======
          isProduction: nextAuthUrl
            ? nextAuthUrl.includes("vercel.app")
            : false,
          isLocalhost: nextAuthUrl ? nextAuthUrl.includes("localhost") : false,
        },

>>>>>>> oauth-upload-fixes
        nextAuthSecret: {
          present: !!nextAuthSecret,
          masked: maskValue(nextAuthSecret),
          length: nextAuthSecret ? nextAuthSecret.length : 0,
          validation: nextAuthSecretValidation,
          recommendedLength: "32+ characters",
        },
      },
<<<<<<< HEAD
      
      urls: {
        googleCallbackUrl: nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/google` : '❌ Cannot construct - NEXTAUTH_URL missing',
        signInUrl: nextAuthUrl ? `${nextAuthUrl}/auth/signin` : '❌ Cannot construct',
        errorUrl: nextAuthUrl ? `${nextAuthUrl}/auth/error` : '❌ Cannot construct',
      },
      
      googleCloudConsole: {
        requiredRedirectUri: nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/google` : 'Configure NEXTAUTH_URL first',
        requiredApis: [
          "Google+ API (deprecated but may be required)",
          "People API (recommended)",
          "Google Identity API"
        ],
        clientIdProject: googleClientId ? googleClientId.split('-')[0] : 'N/A',
      },
      
      troubleshooting: {
        criticalIssues: allValidations
          .filter(v => !v.valid && v.severity === "error")
          .map(v => v.reason),
        
        warnings: allValidations
          .filter(v => !v.valid && v.severity === "warning")
          .map(v => v.reason),
        
        nextSteps: overallHealth === "healthy" ? [
          "✅ All environment variables are correctly configured",
          "🔄 Ensure the same values are set in Vercel Dashboard",
          "🌐 Verify Google Cloud Console has the correct redirect URI",
          "🧪 Test the OAuth flow at your application"
        ] : [
          "🔧 Fix the critical issues listed above",
          "📝 Update your environment variables",
          "🚀 Redeploy after fixing environment variables",
          "🧪 Test again using this endpoint"
        ],
        
        verificationCommands: [
          "Local test: node scripts/verify-oauth.js",
          "Production test: curl https://your-app.vercel.app/api/debug/oauth-verify"
        ]
      }
    };

    return NextResponse.json(config, { status: overallHealth === "critical" ? 500 : 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to verify OAuth configuration",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        overallHealth: "critical"
      }, 
      { status: 500 }
    );
  }
}
=======

      urls: {
        googleCallbackUrl: nextAuthUrl
          ? `${nextAuthUrl}/api/auth/callback/google`
          : "❌ Cannot construct - NEXTAUTH_URL missing",
        signInUrl: nextAuthUrl
          ? `${nextAuthUrl}/auth/signin`
          : "❌ Cannot construct",
        errorUrl: nextAuthUrl
          ? `${nextAuthUrl}/auth/error`
          : "❌ Cannot construct",
      },

      googleCloudConsole: {
        requiredRedirectUri: nextAuthUrl
          ? `${nextAuthUrl}/api/auth/callback/google`
          : "Configure NEXTAUTH_URL first",
        requiredApis: [
          "Google+ API (deprecated but may be required)",
          "People API (recommended)",
          "Google Identity API",
        ],
        clientIdProject: googleClientId ? googleClientId.split("-")[0] : "N/A",
      },

      troubleshooting: {
        criticalIssues: allValidations
          .filter((v) => !v.valid && v.severity === "error")
          .map((v) => v.reason),

        warnings: allValidations
          .filter((v) => !v.valid && v.severity === "warning")
          .map((v) => v.reason),

        nextSteps:
          overallHealth === "healthy"
            ? [
                "✅ All environment variables are correctly configured",
                "🔄 Ensure the same values are set in Vercel Dashboard",
                "🌐 Verify Google Cloud Console has the correct redirect URI",
                "🧪 Test the OAuth flow at your application",
              ]
            : [
                "🔧 Fix the critical issues listed above",
                "📝 Update your environment variables",
                "🚀 Redeploy after fixing environment variables",
                "🧪 Test again using this endpoint",
              ],

        verificationCommands: [
          "Local test: node scripts/verify-oauth.js",
          "Production test: curl https://your-app.vercel.app/api/debug/oauth-verify",
        ],
      },
    };

    return NextResponse.json(config, {
      status: overallHealth === "critical" ? 500 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to verify OAuth configuration",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        overallHealth: "critical",
      },
      { status: 500 }
    );
  }
}
>>>>>>> oauth-upload-fixes
