#!/usr/bin/env node

/**
 * OAuth Diagnostic Script
 *
 * This script provides comprehensive OAuth diagnostics and guidance
 * Run with: node scripts/oauth-diagnostic.js
 */

require("dotenv").config({ path: ".env.local" });

console.log("🏥 OAuth Diagnostic Report\n");

const clientId = process.env.GOOGLE_CLIENT_ID;
const nextAuthUrl = process.env.NEXTAUTH_URL;

console.log("📋 Current Configuration:");
console.log(
  `   Environment: ${nextAuthUrl?.includes("localhost") ? "Development" : "Production"}`
);
console.log(`   Domain: ${nextAuthUrl}`);
console.log(`   Callback URL: ${nextAuthUrl}/api/auth/callback/google`);
console.log(`   Client ID: ${clientId?.substring(0, 12)}...`);
console.log("");

console.log("🔧 Google Cloud Console Verification Checklist:");
console.log("");
console.log(
  "1. 📱 Go to Google Cloud Console: https://console.cloud.google.com/"
);
console.log("2. 🔑 Navigate to APIs & Services > Credentials");
console.log(`3. 🎯 Find OAuth 2.0 Client: ${clientId?.substring(0, 12)}...`);
console.log("4. ✅ Verify Authorized redirect URIs include:");
console.log(`   • ${nextAuthUrl}/api/auth/callback/google`);
console.log(
  "   • https://adventure-log-five.vercel.app/api/auth/callback/google"
);
console.log("");

console.log("🚨 Common Issues & Solutions:");
console.log("");
console.log('❌ "Request interrupted by user" error means:');
console.log("   → Redirect URI mismatch in Google Cloud Console");
console.log(
  "   → Solution: Add the exact callback URL above to authorized redirect URIs"
);
console.log("");
console.log('❌ "redirect_uri_mismatch" error means:');
console.log("   → The callback URL is not whitelisted in Google Cloud Console");
console.log("   → Solution: Ensure both localhost and Vercel URLs are added");
console.log("");
console.log('❌ "invalid_client" error means:');
console.log("   → Wrong Client ID or Client Secret");
console.log(
  "   → Solution: Double-check credentials match Google Cloud Console"
);
console.log("");

console.log("🧪 Ready to Test OAuth Flow:");
console.log(`   Local: ${nextAuthUrl}/auth/signin`);
console.log("   Production: https://adventure-log-five.vercel.app/auth/signin");
console.log("");

console.log("📞 Need Help?");
console.log("   → Check Google Cloud Console OAuth 2.0 setup guide");
console.log("   → Verify domain verification if using custom domain");
console.log(
  "   → Ensure OAuth consent screen is published (not in testing mode)"
);
console.log("");

console.log("✨ Next Steps:");
console.log("1. Verify redirect URIs in Google Cloud Console");
console.log("2. Test OAuth sign-in flow");
console.log("3. Check browser network tab for specific error details");
