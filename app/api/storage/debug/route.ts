import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * GET /api/storage/debug
 *
 * Debug endpoint to test Supabase Storage authentication and permissions.
 * Returns comprehensive information about storage configuration and user access.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const testPath =
      searchParams.get("testPath") ||
      `albums/test-album/${user?.id || "test-user"}/1234567890-test.jpg`;

    const debugInfo = {
      timestamp: new Date().toISOString(),
      requestId: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      authentication: {
        hasUser: !!user,
        userId: user?.id || null,
        userEmail: user?.email || null,
        authStatus: user ? "authenticated" : "unauthenticated",
        authError: authError?.message || null,
      },
      storage: {
        bucketName: STORAGE_BUCKET,
        testPath,
        serviceRoleEnabled: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      tests: [] as any[],
    };

    // Test 1: Basic bucket access with service role
    try {
      const { data: buckets, error: bucketsError } =
        await supabaseAdmin.storage.listBuckets();
      debugInfo.tests.push({
        name: "Service Role Bucket Access",
        status: bucketsError ? "FAILED" : "PASSED",
        result: bucketsError
          ? { error: bucketsError }
          : { bucketsFound: buckets?.length || 0 },
      });
    } catch (error) {
      debugInfo.tests.push({
        name: "Service Role Bucket Access",
        status: "ERROR",
        result: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    // Test 2: Adventure photos bucket exists
    try {
      const { data, error } =
        await supabaseAdmin.storage.getBucket(STORAGE_BUCKET);
      debugInfo.tests.push({
        name: "Adventure Photos Bucket",
        status: error ? "FAILED" : "PASSED",
        result: error
          ? { error }
          : {
              bucket: {
                id: data.id,
                name: data.name,
                public: data.public,
                fileSizeLimit: data.file_size_limit,
                allowedMimeTypes: data.allowed_mime_types,
              },
            },
      });
    } catch (error) {
      debugInfo.tests.push({
        name: "Adventure Photos Bucket",
        status: "ERROR",
        result: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    // Test 3: Try to list files in test path (should work with service role)
    if (user?.id) {
      try {
        const folderPath = `albums/test-album/${user.id}`;
        const { data: files, error: listError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .list(folderPath, { limit: 10 });

        debugInfo.tests.push({
          name: "List User Files",
          status: listError ? "FAILED" : "PASSED",
          result: listError
            ? { error: listError }
            : {
                folderPath,
                filesFound: files?.length || 0,
                files:
                  files?.map((f) => ({
                    name: f.name,
                    size: f.metadata?.size,
                  })) || [],
              },
        });
      } catch (error) {
        debugInfo.tests.push({
          name: "List User Files",
          status: "ERROR",
          result: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    // Test 4: Test signed URL creation
    if (user?.id) {
      try {
        const { data: signedData, error: signedError } =
          await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .createSignedUploadUrl(testPath);

        debugInfo.tests.push({
          name: "Create Signed Upload URL",
          status: signedError ? "FAILED" : "PASSED",
          result: signedError
            ? { error: signedError }
            : {
                path: testPath,
                hasSignedUrl: !!signedData?.signedUrl,
                hasToken: !!signedData?.token,
              },
        });
      } catch (error) {
        debugInfo.tests.push({
          name: "Create Signed Upload URL",
          status: "ERROR",
          result: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    // Test 5: Environment variables check
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_BUCKET",
    ];

    const envCheck = requiredEnvVars.map((varName) => ({
      name: varName,
      present: !!process.env[varName],
      length: process.env[varName]?.length || 0,
    }));

    debugInfo.tests.push({
      name: "Environment Variables",
      status: envCheck.every((env) => env.present) ? "PASSED" : "FAILED",
      result: { variables: envCheck },
    });

    // Summary
    const passedTests = debugInfo.tests.filter(
      (t) => t.status === "PASSED"
    ).length;
    const totalTests = debugInfo.tests.length;

    logger.info(
      `Storage debug completed: ${passedTests}/${totalTests} tests passed`,
      {
        requestId: debugInfo.requestId,
        userId: user?.id,
      }
    );

    return NextResponse.json({
      ...debugInfo,
      summary: {
        testsRun: totalTests,
        testsPassed: passedTests,
        testsFailed: totalTests - passedTests,
        overallStatus:
          passedTests === totalTests ? "HEALTHY" : "ISSUES_DETECTED",
      },
    });
  } catch (error) {
    logger.error("Storage debug endpoint error:", { error });

    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storage/debug
 *
 * Test file upload with detailed error reporting
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const albumId = (formData.get("albumId") as string) || "debug-album";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const userId = user.id;
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const storagePath = `albums/${albumId}/${userId}/${timestamp}-${safeName}`;

    const uploadResult = {
      timestamp: new Date().toISOString(),
      requestId: `upload-debug-${timestamp}`,
      input: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        albumId,
        userId,
        storagePath,
      },
      steps: [] as any[],
    };

    // Step 1: File validation
    uploadResult.steps.push({
      step: 1,
      name: "File Validation",
      status: "COMPLETED",
      result: {
        isValidSize: file.size <= 25 * 1024 * 1024,
        isValidType: [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ].includes(file.type),
      },
    });

    // Step 2: Upload to Supabase
    try {
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false,
          });

      if (uploadError) {
        uploadResult.steps.push({
          step: 2,
          name: "Supabase Upload",
          status: "FAILED",
          error: {
            message: uploadError.message,
            details: uploadError,
          },
        });

        return NextResponse.json(
          { ...uploadResult, success: false },
          { status: 400 }
        );
      }

      uploadResult.steps.push({
        step: 2,
        name: "Supabase Upload",
        status: "COMPLETED",
        result: {
          path: uploadData.path,
          fullPath: uploadData.fullPath,
        },
      });

      // Step 3: Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      uploadResult.steps.push({
        step: 3,
        name: "Generate Public URL",
        status: "COMPLETED",
        result: {
          publicUrl: urlData.publicUrl,
        },
      });

      // Step 4: Cleanup test file
      try {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
        uploadResult.steps.push({
          step: 4,
          name: "Cleanup Test File",
          status: "COMPLETED",
          result: { deleted: true },
        });
      } catch (cleanupError) {
        uploadResult.steps.push({
          step: 4,
          name: "Cleanup Test File",
          status: "WARNING",
          result: {
            deleted: false,
            note: "Test file may remain in storage",
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : "Unknown error",
          },
        });
      }

      return NextResponse.json({ ...uploadResult, success: true });
    } catch (error) {
      uploadResult.steps.push({
        step: 2,
        name: "Supabase Upload",
        status: "ERROR",
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
      });

      return NextResponse.json(
        { ...uploadResult, success: false },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Storage debug upload error:", { error });

    return NextResponse.json(
      {
        error: "Debug upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
