import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, generateSecurePhotoPath } from "@/lib/supabaseAdmin";
import { clientEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * RLS Policy Validation Test Endpoint
 *
 * This endpoint specifically tests if the RLS policies match the application's
 * path structure. It helps diagnose the "authorized user" upload errors.
 *
 * GET /api/debug/rls-test
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Authentication required for RLS testing",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const testAlbumId = "test-album-" + Date.now();
    const bucketName = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;

    const results: any = {
      timestamp: new Date().toISOString(),
      userId,
      bucketName,
      tests: {},
      pathStructure: {
        expected: "albums/{albumId}/{userId}/{filename}",
        generated: null,
      },
    };

    // Test 1: Path Generation
    const testFilename = "test-rls-validation.jpg";
    const generatedPath = generateSecurePhotoPath(
      testAlbumId,
      userId,
      testFilename
    );
    results.pathStructure.generated = generatedPath;

    const pathParts = generatedPath.split("/");
    const isCorrectStructure =
      pathParts.length >= 3 &&
      pathParts[0] === "albums" &&
      pathParts[1] === testAlbumId &&
      pathParts[2] === userId;

    results.tests.path_structure = {
      passed: isCorrectStructure,
      generatedPath,
      pathParts,
      analysis: {
        firstFolder: pathParts[0],
        albumIdPosition: pathParts[1],
        userIdPosition: pathParts[2],
        expectedPattern:
          "albums/{albumId}/{userId}/{timestamp}-{filename}.{ext}",
        matchesPattern: isCorrectStructure,
      },
    };

    // Test 2: Service Role Upload Test
    const testContent = Buffer.from("RLS test content");
    try {
      const { error: serviceRoleError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(generatedPath, testContent, {
          contentType: "image/jpeg",
        });

      results.tests.service_role_upload = {
        passed: !serviceRoleError,
        error: serviceRoleError?.message || null,
        note: "Service role should bypass RLS policies",
      };

      if (!serviceRoleError) {
        // Clean up test file
        await supabaseAdmin.storage.from(bucketName).remove([generatedPath]);
      }
    } catch (error) {
      results.tests.service_role_upload = {
        passed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test 3: Policy Structure Analysis
    results.tests.rls_policy_analysis = {
      currentAppStructure: "albums/{albumId}/{userId}/{filename}",
      rlsPolicyExpectation: {
        folder1: "albums (✓ matches)",
        folder2: "{albumId} (app-specific, not validated by RLS)",
        folder3: "{userId} (must match auth.uid()::text)",
      },
      policyLogic: [
        "(storage.foldername(name))[1] = 'albums'",
        "(storage.foldername(name))[3] = auth.uid()::text",
      ],
      validation: {
        folder1Check: pathParts[0] === "albums",
        folder3Check: pathParts[2] === userId,
        bothChecksPass: pathParts[0] === "albums" && pathParts[2] === userId,
      },
    };

    // Test 4: Recommendations
    const allTestsPassed = Object.values(results.tests).every((test) =>
      typeof test === "object" && "passed" in test ? test.passed : true
    );

    results.summary = {
      allTestsPassed,
      status: allTestsPassed ? "CONFIGURATION_CORRECT" : "ISSUES_DETECTED",
      recommendations: allTestsPassed
        ? [
            "Path structure is correct",
            "RLS policies should work with this structure",
            "If uploads still fail, check Supabase RLS policies are actually applied",
            "Verify the service role key has storage permissions",
          ]
        : [
            "Path structure issues detected",
            "Update RLS policies to match application path structure",
            "Run the updated supabase-rls-policies.sql script",
            "Test again after policy updates",
          ],
    };

    logger.info("RLS validation test completed", {
      userId,
      pathStructure: results.pathStructure,
      allTestsPassed,
    });

    return NextResponse.json(results);
  } catch (error) {
    logger.error("RLS validation test failed:", error);

    return NextResponse.json(
      {
        error: "RLS validation test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to test signed URL generation with RLS validation
 * POST /api/debug/rls-test
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const testAlbumId = "rls-test-album-" + Date.now();
    const testFilename = "rls-signed-url-test.jpg";

    // Generate path using the same logic as the main upload endpoint
    const testPath = generateSecurePhotoPath(testAlbumId, userId, testFilename);
    const bucketName = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;

    const testResults: any = {
      timestamp: new Date().toISOString(),
      userId,
      testPath,
      bucketName,
    };

    // Test signed URL creation (this is what fails in the main upload flow)
    try {
      const { data: signedData, error: signedError } =
        await supabaseAdmin.storage
          .from(bucketName)
          .createSignedUploadUrl(testPath);

      testResults.signedUrlTest = {
        success: !signedError && !!signedData,
        error: signedError?.message || null,
        signedUrl: signedData?.signedUrl
          ? "Generated successfully"
          : "Not generated",
        token: signedData?.token ? "Token present" : "No token",
      };

      if (signedError) {
        // Analyze the specific error for common RLS issues
        let errorCategory = "unknown";
        if (signedError.message.includes("policy")) {
          errorCategory = "rls_policy_violation";
        } else if (signedError.message.includes("permission")) {
          errorCategory = "permission_denied";
        } else if (signedError.message.includes("bucket")) {
          errorCategory = "bucket_access_error";
        }

        testResults.errorAnalysis = {
          category: errorCategory,
          message: signedError.message,
          likelyFix:
            errorCategory === "rls_policy_violation"
              ? "Update RLS policies to match path structure: albums/{albumId}/{userId}/..."
              : errorCategory === "permission_denied"
                ? "Check service role key permissions for storage operations"
                : "Check bucket configuration and service role setup",
        };
      }
    } catch (error) {
      testResults.signedUrlTest = {
        success: false,
        error:
          error instanceof Error ? error.message : "Signed URL test failed",
      };
    }

    logger.info("RLS signed URL test completed", {
      userId,
      testPath,
      success: testResults.signedUrlTest?.success,
    });

    return NextResponse.json(testResults);
  } catch (error) {
    logger.error("RLS signed URL test failed:", error);

    return NextResponse.json(
      {
        error: "RLS signed URL test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
