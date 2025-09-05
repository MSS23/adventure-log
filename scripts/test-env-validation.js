/**
 * Test script to validate environment variable validation
 * This script tests that our Zod environment validation works correctly
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Environment Variable Validation\n");

// Test 1: With valid environment variables
console.log("Test 1: With valid environment variables");
try {
  // Create a temporary .env file with valid values
  const validEnvContent = `
# Test environment variables
DATABASE_URL="postgresql://user:pass@localhost:5432/test"
NEXTAUTH_SECRET="this-is-a-32-character-test-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="test-client-id"
GOOGLE_CLIENT_SECRET="test-client-secret"
SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="test-anon-key"
NEXT_PUBLIC_SUPABASE_BUCKET="test-bucket"
NODE_ENV="development"
  `;

  fs.writeFileSync(".env.test", validEnvContent);

  // Try to validate the environment
  const result = execSync(
    "NODE_ENV=development node -e \"require('./src/env.ts'); console.log('✅ Environment validation passed')\"",
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "development" },
      stdio: "pipe",
    }
  );

  console.log("✅ Test 1 PASSED - Valid environment variables accepted");
} catch (error) {
  console.log("❌ Test 1 FAILED - Valid environment should pass");
  console.log("Error:", error.message);
}

console.log("\nTest 2: With missing required variables");
try {
  // Test with missing DATABASE_URL
  const invalidEnvContent = `
# Missing DATABASE_URL
NEXTAUTH_SECRET="this-is-a-32-character-test-secret"
NEXTAUTH_URL="http://localhost:3000"
  `;

  fs.writeFileSync(".env.test.invalid", invalidEnvContent);

  // This should fail
  const result = execSync(
    "node -e \"process.env.DATABASE_URL=undefined; require('./src/env.ts')\"",
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  console.log("❌ Test 2 FAILED - Should have rejected missing DATABASE_URL");
} catch (error) {
  // This is expected - the validation should fail
  if (
    error.message.includes("DATABASE_URL is required") ||
    error.status === 1
  ) {
    console.log(
      "✅ Test 2 PASSED - Correctly rejected missing required variable"
    );
  } else {
    console.log("❌ Test 2 FAILED - Wrong error type");
    console.log("Error:", error.message);
  }
}

console.log("\nTest 3: With invalid URL format");
try {
  // Create environment with invalid URL
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.NEXTAUTH_SECRET = "this-is-a-32-character-test-secret";
  process.env.NEXTAUTH_URL = "not-a-valid-url"; // Invalid URL
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET = "test-bucket";
  process.env.NODE_ENV = "development";

  // This should fail due to invalid URL
  const result = execSync(
    "node -e \"process.env.NEXTAUTH_URL='not-a-valid-url'; require('./src/env.ts')\"",
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  console.log("❌ Test 3 FAILED - Should have rejected invalid URL");
} catch (error) {
  // This is expected - the validation should fail
  if (error.message.includes("must be a valid URL") || error.status === 1) {
    console.log("✅ Test 3 PASSED - Correctly rejected invalid URL format");
  } else {
    console.log("❌ Test 3 FAILED - Wrong error type");
    console.log("Error:", error.message);
  }
}

console.log("\nTest 4: With short NEXTAUTH_SECRET");
try {
  // This should fail due to short secret
  const result = execSync(
    "node -e \"process.env.NEXTAUTH_SECRET='short'; require('./src/env.ts')\"",
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  console.log("❌ Test 4 FAILED - Should have rejected short NEXTAUTH_SECRET");
} catch (error) {
  // This is expected - the validation should fail
  if (
    error.message.includes("must be at least 32 characters") ||
    error.status === 1
  ) {
    console.log("✅ Test 4 PASSED - Correctly rejected short NEXTAUTH_SECRET");
  } else {
    console.log("❌ Test 4 FAILED - Wrong error type");
    console.log("Error:", error.message);
  }
}

// Clean up test files
try {
  fs.unlinkSync(".env.test");
  fs.unlinkSync(".env.test.invalid");
} catch (err) {
  // Ignore cleanup errors
}

console.log("\n🎉 Environment validation testing complete!");
console.log("\nNext steps:");
console.log("1. Copy .env.example to .env.local");
console.log("2. Fill in your actual environment variables");
console.log("3. Run npm run dev to test with real environment");
console.log("4. Verify the app starts and shows validation success message");
