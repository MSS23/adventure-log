#!/usr/bin/env node

/**
 * Adventure Log - Supabase Configuration Test Script
 * Tests your Supabase storage configuration to identify upload issues
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Configuration
const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  bucketName: process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "adventure-photos",
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
};

function logTest(testName, passed, details = "") {
  testResults.total++;
  const status = passed ? "✅" : "❌";
  const result = passed ? "PASS" : "FAIL";

  console.log(`${status} ${testName}: ${result}`);
  if (details) {
    console.log(`   ${details}`);
  }

  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  testResults.details.push({ testName, passed, details });
}

async function testEnvironmentConfig() {
  console.log("🔧 Testing Environment Configuration...\n");

  logTest(
    "Supabase URL configured",
    !!CONFIG.supabaseUrl,
    CONFIG.supabaseUrl
      ? `URL: ${CONFIG.supabaseUrl}`
      : "NEXT_PUBLIC_SUPABASE_URL not set"
  );

  logTest(
    "Service Role Key configured",
    !!CONFIG.serviceKey && CONFIG.serviceKey.length > 50,
    CONFIG.serviceKey
      ? `Key length: ${CONFIG.serviceKey.length} chars`
      : "SUPABASE_SERVICE_ROLE_KEY not set or too short"
  );

  logTest(
    "Anon Key configured",
    !!CONFIG.anonKey && CONFIG.anonKey.length > 50,
    CONFIG.anonKey
      ? `Key length: ${CONFIG.anonKey.length} chars`
      : "NEXT_PUBLIC_SUPABASE_ANON_KEY not set or too short"
  );

  logTest(
    "Bucket name configured",
    !!CONFIG.bucketName,
    `Bucket: ${CONFIG.bucketName || "not set"}`
  );

  console.log("");
}

async function testSupabaseConnection() {
  console.log("🌐 Testing Supabase Connection...\n");

  if (!CONFIG.supabaseUrl || !CONFIG.serviceKey) {
    logTest("Supabase connection", false, "Missing URL or service key");
    return null;
  }

  try {
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test basic connectivity
    const { data, error } = await supabase.from("_health").select("*").limit(1);

    if (error && !error.message.includes('relation "_health" does not exist')) {
      logTest(
        "Supabase connection",
        false,
        `Connection error: ${error.message}`
      );
      return null;
    }

    logTest("Supabase connection", true, "Successfully connected to Supabase");
    return supabase;
  } catch (error) {
    logTest(
      "Supabase connection",
      false,
      `Connection failed: ${error.message}`
    );
    return null;
  }
}

async function testStorageBucket(supabase) {
  console.log("🪣 Testing Storage Bucket...\n");

  if (!supabase) {
    logTest("Storage bucket test", false, "No Supabase connection available");
    return;
  }

  try {
    // List all buckets
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      logTest("List buckets", false, `Error: ${listError.message}`);
      return;
    }

    logTest("List buckets", true, `Found ${buckets.length} buckets`);

    // Check if our bucket exists
    const targetBucket = buckets.find((b) => b.name === CONFIG.bucketName);
    logTest(
      "Target bucket exists",
      !!targetBucket,
      targetBucket
        ? `Bucket "${CONFIG.bucketName}" found (public: ${targetBucket.public})`
        : `Bucket "${CONFIG.bucketName}" not found. Available: ${buckets.map((b) => b.name).join(", ")}`
    );

    if (targetBucket) {
      logTest(
        "Bucket is public",
        targetBucket.public === true,
        `Public setting: ${targetBucket.public}`
      );

      // Test file listing in bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(CONFIG.bucketName)
        .list("", { limit: 1 });

      logTest(
        "List bucket files",
        !filesError,
        filesError
          ? `Error: ${filesError.message}`
          : `Access granted (${files?.length || 0} files found)`
      );
    }
  } catch (error) {
    logTest("Storage bucket test", false, `Unexpected error: ${error.message}`);
  }

  console.log("");
}

async function testFileUpload(supabase) {
  console.log("📁 Testing File Upload...\n");

  if (!supabase) {
    logTest("File upload test", false, "No Supabase connection available");
    return;
  }

  const testFileName = `test-${Date.now()}.txt`;
  const testFilePath = `test/${testFileName}`;
  const testContent =
    "Adventure Log upload test - this file can be safely deleted";

  try {
    // Test upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CONFIG.bucketName)
      .upload(testFilePath, testContent, {
        contentType: "text/plain",
        cacheControl: "3600",
      });

    logTest(
      "File upload",
      !uploadError,
      uploadError
        ? `Upload failed: ${uploadError.message} (Code: ${uploadError.statusCode || "unknown"})`
        : `Successfully uploaded ${testFileName}`
    );

    if (!uploadError) {
      // Test public URL generation
      const {
        data: { publicUrl },
      } = supabase.storage.from(CONFIG.bucketName).getPublicUrl(testFilePath);

      logTest(
        "Public URL generation",
        !!publicUrl,
        publicUrl ? `Generated: ${publicUrl}` : "Failed to generate public URL"
      );

      // Test file download
      const { data: downloadData, error: downloadError } =
        await supabase.storage.from(CONFIG.bucketName).download(testFilePath);

      logTest(
        "File download",
        !downloadError,
        downloadError
          ? `Download failed: ${downloadError.message}`
          : "Successfully downloaded test file"
      );

      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from(CONFIG.bucketName)
        .remove([testFilePath]);

      logTest(
        "File cleanup",
        !deleteError,
        deleteError
          ? `Cleanup failed: ${deleteError.message}`
          : "Test file cleaned up"
      );
    }
  } catch (error) {
    logTest("File upload test", false, `Unexpected error: ${error.message}`);
  }

  console.log("");
}

async function testImageUpload(supabase) {
  console.log("🖼️ Testing Image Upload (Simulated)...\n");

  if (!supabase) {
    logTest("Image upload test", false, "No Supabase connection available");
    return;
  }

  // Create a minimal test "image" (just binary data that mimics an image)
  const testImageData = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA54hMWAAAAABJRU5ErkJggg==",
    "base64"
  );
  const testFileName = `test-image-${Date.now()}.png`;
  const testFilePath = `albums/test/${testFileName}`;

  try {
    // Test image upload with proper MIME type
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CONFIG.bucketName)
      .upload(testFilePath, testImageData, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    logTest(
      "Image upload",
      !uploadError,
      uploadError
        ? `Upload failed: ${uploadError.message} (Code: ${uploadError.statusCode || "unknown"})`
        : `Successfully uploaded ${testFileName}`
    );

    if (!uploadError) {
      // Test public URL for image
      const {
        data: { publicUrl },
      } = supabase.storage.from(CONFIG.bucketName).getPublicUrl(testFilePath);

      logTest("Image URL generation", !!publicUrl, `Image URL: ${publicUrl}`);

      // Clean up test image
      await supabase.storage.from(CONFIG.bucketName).remove([testFilePath]);
      logTest("Image cleanup", true, "Test image cleaned up");
    }
  } catch (error) {
    logTest("Image upload test", false, `Unexpected error: ${error.message}`);
  }

  console.log("");
}

async function testPermissions(supabase) {
  console.log("🔐 Testing Permissions...\n");

  if (!supabase) {
    logTest("Permissions test", false, "No Supabase connection available");
    return;
  }

  try {
    // Test if we can access storage with service role
    const { data: buckets, error } = await supabase.storage.listBuckets();

    logTest(
      "Service role permissions",
      !error,
      error
        ? `Permission denied: ${error.message}`
        : "Service role has storage access"
    );

    // Test anonymous access (create anon client)
    if (CONFIG.anonKey) {
      const anonSupabase = createClient(CONFIG.supabaseUrl, CONFIG.anonKey);

      const { data: anonBuckets, error: anonError } =
        await anonSupabase.storage.listBuckets();

      logTest(
        "Anonymous permissions",
        !anonError,
        anonError
          ? `Anon access error: ${anonError.message}`
          : "Anonymous access working"
      );
    }
  } catch (error) {
    logTest("Permissions test", false, `Unexpected error: ${error.message}`);
  }

  console.log("");
}

async function runDiagnostics() {
  console.log("🧪 Adventure Log - Supabase Configuration Diagnostic\n");
  console.log("=".repeat(60));
  console.log("");

  // Run all tests
  await testEnvironmentConfig();
  const supabase = await testSupabaseConnection();
  await testStorageBucket(supabase);
  await testFileUpload(supabase);
  await testImageUpload(supabase);
  await testPermissions(supabase);

  // Print summary
  console.log("📊 Test Results Summary");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📋 Total:  ${testResults.total}`);
  console.log(
    `📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`
  );
  console.log("");

  // Show failed tests
  if (testResults.failed > 0) {
    console.log("❌ Failed Tests:");
    console.log("-".repeat(30));
    testResults.details
      .filter((test) => !test.passed)
      .forEach((test) => {
        console.log(`• ${test.testName}`);
        if (test.details) {
          console.log(`  ${test.details}`);
        }
      });
    console.log("");
  }

  // Provide recommendations
  console.log("💡 Recommendations:");
  console.log("-".repeat(30));

  if (testResults.failed === 0) {
    console.log(
      "🎉 All tests passed! Your Supabase configuration is working correctly."
    );
    console.log("If uploads still fail, check:");
    console.log("  - Browser console for JavaScript errors");
    console.log("  - Network tab for request/response details");
    console.log("  - Server logs for authentication issues");
  } else {
    if (!CONFIG.supabaseUrl || !CONFIG.serviceKey) {
      console.log("1. ⚠️  Set up your environment variables in .env.local");
    }
    if (
      testResults.details.some(
        (t) => !t.passed && t.testName.includes("bucket")
      )
    ) {
      console.log(
        "2. 🪣 Run the setup-supabase-storage.sql script in your Supabase SQL editor"
      );
    }
    if (
      testResults.details.some(
        (t) => !t.passed && t.testName.includes("upload")
      )
    ) {
      console.log(
        "3. 🔐 Check your Row Level Security policies in Supabase Dashboard"
      );
    }
    if (
      testResults.details.some(
        (t) => !t.passed && t.testName.includes("permissions")
      )
    ) {
      console.log(
        "4. 🔑 Verify you're using the SERVICE ROLE key, not the anon key"
      );
    }
  }

  console.log("");
  console.log("📚 For more help, check UPLOAD-TROUBLESHOOTING.md");
  console.log("");

  return testResults.failed === 0;
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⏹️  Test interrupted by user");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("\n💥 Uncaught exception:", error.message);
  process.exit(1);
});

// Run the diagnostics
if (require.main === module) {
  runDiagnostics()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

module.exports = { runDiagnostics };
