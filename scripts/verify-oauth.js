#!/usr/bin/env node

/**
 * OAuth Configuration Verification Script
 *
 * This script verifies that all OAuth environment variables are properly configured
 * Run with: node scripts/verify-oauth.js
 */

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

console.log("🔍 Checking OAuth Configuration...\n");

// Check environment variables
const checks = [
  {
    name: "GOOGLE_CLIENT_ID",
    value: process.env.GOOGLE_CLIENT_ID,
    validate: (value) => {
      if (!value) return { valid: false, message: "Not set" };
      if (!value.includes(".apps.googleusercontent.com")) {
        return {
          valid: false,
          message: "Invalid format - missing .apps.googleusercontent.com",
        };
      }
      if (!value.match(/^\d{12}-/)) {
        return {
          valid: false,
          message:
            "Invalid format - should start with 12-digit number followed by dash",
        };
      }
      return { valid: true, message: "Valid format" };
    },
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    value: process.env.GOOGLE_CLIENT_SECRET,
    validate: (value) => {
      if (!value) return { valid: false, message: "Not set" };
      if (!value.startsWith("GOCSPX-")) {
        return {
          valid: false,
          message: "Invalid format - should start with GOCSPX-",
        };
      }
      if (value.length !== 35) {
        return {
          valid: false,
          message: `Invalid length - expected 35 characters, got ${value.length}`,
        };
      }
      return { valid: true, message: "Valid format" };
    },
  },
  {
    name: "NEXTAUTH_URL",
    value: process.env.NEXTAUTH_URL,
    validate: (value) => {
      if (!value) return { valid: false, message: "Not set" };
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" && !value.includes("localhost")) {
          return { valid: false, message: "Must use HTTPS for production" };
        }
        return { valid: true, message: "Valid URL format" };
      } catch {
        return { valid: false, message: "Invalid URL format" };
      }
    },
  },
  {
    name: "NEXTAUTH_SECRET",
    value: process.env.NEXTAUTH_SECRET,
    validate: (value) => {
      if (!value) return { valid: false, message: "Not set" };
      if (value.length < 32) {
        return {
          valid: false,
          message: "Too short - should be at least 32 characters",
        };
      }
      return { valid: true, message: "Sufficient length" };
    },
  },
];

let allValid = true;

checks.forEach((check) => {
  const result = check.validate(check.value);
  const status = result.valid ? "✅" : "❌";
  const maskedValue = check.value
    ? check.name.includes("SECRET")
      ? `${check.value.substring(0, 8)}...${check.value.substring(check.value.length - 4)}`
      : check.value
    : "❌ NOT SET";

  console.log(`${status} ${check.name}:`);
  console.log(`   Value: ${maskedValue}`);
  console.log(`   Status: ${result.message}\n`);

  if (!result.valid) allValid = false;
});

// Display URLs
console.log("🌐 OAuth URLs:");
if (process.env.NEXTAUTH_URL) {
  console.log(
    `   Callback URL: ${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );
  console.log(`   Sign In URL: ${process.env.NEXTAUTH_URL}/auth/signin`);
  console.log(`   Error URL: ${process.env.NEXTAUTH_URL}/auth/error\n`);
} else {
  console.log("   ❌ Cannot construct URLs - NEXTAUTH_URL not set\n");
}

// Final result
if (allValid) {
  console.log("🎉 All OAuth configuration checks passed!");
  console.log("✅ Your environment variables are correctly configured.\n");

  console.log("📋 Next steps:");
  console.log("1. Ensure these same values are set in Vercel Dashboard");
  console.log("2. Verify Google Cloud Console has the correct redirect URI");
  console.log("3. Test the OAuth flow at your application");
} else {
  console.log("❌ OAuth configuration has issues that need to be fixed.");
  console.log(
    "Please update your environment variables and run this script again.\n"
  );
  process.exit(1);
}
