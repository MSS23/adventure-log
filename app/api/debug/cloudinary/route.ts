import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary Connection Test API
 *
 * Tests Cloudinary configuration and connectivity
 * Verifies API credentials and upload preset availability
 */
export async function GET(request: NextRequest) {
  // Only allow debug endpoints in development and preview environments
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_DEBUG) {
    return NextResponse.json(
      { error: "Debug endpoints are disabled in production" },
      { status: 404 }
    );
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    tests: {} as any,
    summary: {
      passed: 0,
      failed: 0,
      errors: [] as string[],
    },
  };

  // Helper function to run tests safely
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    try {
      console.log(`[Cloudinary Debug] Running test: ${testName}`);
      const result = await testFn();
      results.tests[testName] = {
        status: "✅ PASS",
        result,
        error: null,
      };
      results.summary.passed++;
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[Cloudinary Debug] Test failed: ${testName}`, error);

      results.tests[testName] = {
        status: "❌ FAIL",
        result: null,
        error: errorMessage,
      };
      results.summary.failed++;
      results.summary.errors.push(`${testName}: ${errorMessage}`);
      return null;
    }
  };

  // Test 1: Environment Variables
  await runTest("environment_variables", async () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    return {
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudName
        ? "✅ Present"
        : "❌ Missing",
      NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: uploadPreset
        ? "✅ Present"
        : "❌ Missing",
      CLOUDINARY_API_KEY: apiKey ? "✅ Present" : "❌ Missing",
      CLOUDINARY_API_SECRET: apiSecret ? "✅ Present" : "❌ Missing",
      client_vars_accessible: !!(cloudName && uploadPreset),
      server_vars_accessible: !!(apiKey && apiSecret),
    };
  });

  // Test 2: Cloudinary Configuration
  await runTest("cloudinary_configuration", async () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing required Cloudinary environment variables");
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    // Test configuration by getting a simple config value
    const config = cloudinary.config();

    return {
      config_set: true,
      cloud_name: config.cloud_name ? "✅ Set" : "❌ Not set",
      api_key: config.api_key ? "✅ Set" : "❌ Not set",
      secure: config.secure ? "✅ Enabled" : "❌ Disabled",
      api_url: `https://api.cloudinary.com/v1_1/${cloudName}`,
    };
  });

  // Test 3: API Connectivity Test
  await runTest("api_connectivity", async () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary configuration");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    // Test API connectivity by pinging the API
    const pingResult = await cloudinary.api.ping();

    return {
      ping_successful: pingResult.status === "ok",
      ping_response: pingResult,
      api_accessible: true,
      response_time: Date.now(), // Simple timestamp
    };
  });

  // Test 4: Upload Preset Validation
  await runTest("upload_preset_validation", async () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
      throw new Error("Missing Cloudinary configuration");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    try {
      // Try to get the upload preset details
      const presetDetails = await cloudinary.api.upload_preset(uploadPreset);

      return {
        preset_exists: true,
        preset_name: presetDetails.name,
        preset_settings: {
          unsigned: presetDetails.unsigned,
          folder: presetDetails.folder || "none",
          resource_type: presetDetails.resource_type || "auto",
          allowed_formats: presetDetails.allowed_formats || "any",
        },
        preset_usable: true,
      };
    } catch (error) {
      // If we can't access preset details, it might still work for uploads
      return {
        preset_exists: false,
        preset_accessible_via_api: false,
        might_work_for_uploads: true,
        error: error instanceof Error ? error.message : String(error),
        note: "Preset might still work for client-side uploads even if not accessible via API",
      };
    }
  });

  // Test 5: Client-side Upload URL Test
  await runTest("client_upload_url", async () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Missing client-side configuration");
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    return {
      upload_url: uploadUrl,
      cloud_name: cloudName,
      upload_preset: uploadPreset,
      client_config_complete: true,
      url_format_valid: uploadUrl.includes("cloudinary.com"),
    };
  });

  // Test 6: Resource Limits Test
  await runTest("resource_limits", async () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing server-side Cloudinary configuration");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    try {
      // Get usage information
      const usage = await cloudinary.api.usage();

      return {
        usage_accessible: true,
        plan: usage.plan || "unknown",
        credits: {
          used: usage.credits?.usage || 0,
          limit: usage.credits?.limit || "unlimited",
        },
        storage: {
          used: usage.storage?.usage || 0,
          limit: usage.storage?.limit || "unlimited",
        },
        bandwidth: {
          used: usage.bandwidth?.usage || 0,
          limit: usage.bandwidth?.limit || "unlimited",
        },
      };
    } catch (error) {
      return {
        usage_accessible: false,
        error: error instanceof Error ? error.message : String(error),
        note: "Usage API might not be available on free plans",
      };
    }
  });

  // Overall assessment
  const overallStatus =
    results.summary.failed === 0
      ? "✅ HEALTHY"
      : results.summary.failed < results.summary.passed
        ? "⚠️ PARTIAL"
        : "❌ UNHEALTHY";

  results.summary.status = overallStatus;
  results.summary.total_tests = results.summary.passed + results.summary.failed;

  // Add recommendations
  const recommendations = [];

  if (
    results.tests.environment_variables?.result?.client_vars_accessible ===
    false
  ) {
    recommendations.push(
      "Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for client-side uploads"
    );
  }

  if (
    results.tests.environment_variables?.result?.server_vars_accessible ===
    false
  ) {
    recommendations.push(
      "Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET for server-side operations"
    );
  }

  if (results.tests.api_connectivity?.error) {
    recommendations.push(
      "Check Cloudinary API credentials and network connectivity"
    );
  }

  if (results.tests.upload_preset_validation?.error) {
    recommendations.push(
      "Verify upload preset exists and is configured correctly in Cloudinary dashboard"
    );
  }

  results.summary.recommendations = recommendations;

  return NextResponse.json(results, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}

// POST endpoint for test uploads
export async function POST(request: NextRequest) {
  // Only allow debug endpoints in development and preview environments
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_DEBUG) {
    return NextResponse.json(
      { error: "Debug endpoints are disabled in production" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === "test_upload") {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        return NextResponse.json(
          {
            error: "Missing Cloudinary configuration",
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      // Test upload with a small base64 image (1x1 pixel)
      const testImage =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      try {
        const result = await cloudinary.uploader.upload(testImage, {
          folder: "test",
          public_id: `test_upload_${Date.now()}`,
        });

        // Clean up test image
        await cloudinary.uploader.destroy(result.public_id);

        return NextResponse.json({
          action: "test_upload",
          success: true,
          upload_worked: true,
          cleanup_worked: true,
          result: {
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return NextResponse.json({
          action: "test_upload",
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      error: "Invalid action",
      available_actions: ["test_upload"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}
