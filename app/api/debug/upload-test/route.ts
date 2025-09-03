import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase";
import { serverEnv, clientEnv } from "@/src/env";

/**
 * Debug endpoint to test upload configuration
 * GET /api/debug/upload-test
 */
export async function GET() {
  const testResults: any = {
    timestamp: new Date().toISOString(),
    environment: serverEnv.NODE_ENV,
    tests: {},
    overall: { passed: 0, failed: 0, total: 0 },
  };

  function addTest(name: string, passed: boolean, details: any = {}) {
    testResults.tests[name] = { passed, details };
    testResults.overall.total++;
    if (passed) {
      testResults.overall.passed++;
    } else {
      testResults.overall.failed++;
    }
  }

  try {
    logger.info("Running upload configuration test");

    // Test 1: Environment Configuration
    const bucketName = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;
    const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

    addTest("environment_config", !!(bucketName && supabaseUrl && serviceKey), {
      bucket_configured: !!bucketName,
      url_configured: !!supabaseUrl,
      service_key_configured: !!serviceKey && serviceKey.length > 50,
      bucket_name: bucketName,
    });

    if (!bucketName || !supabaseUrl || !serviceKey) {
      return NextResponse.json({
        ...testResults,
        error: "Environment configuration incomplete",
      });
    }

    // Test 2: Database Connection
    try {
      const userCount = await db.user.count();
      addTest("database_connection", true, { user_count: userCount });
    } catch (dbError) {
      addTest("database_connection", false, {
        error:
          dbError instanceof Error ? dbError.message : "Unknown database error",
      });
    }

    // Test 3: Supabase Storage Connection
    try {
      const { data: buckets, error: bucketsError } =
        await supabaseAdmin.storage.listBuckets();

      if (bucketsError) {
        addTest("supabase_connection", false, { error: bucketsError.message });
      } else {
        const targetBucket = buckets?.find((b) => b.name === bucketName);
        addTest("supabase_connection", !!targetBucket, {
          total_buckets: buckets?.length || 0,
          target_bucket_exists: !!targetBucket,
          target_bucket_public: targetBucket?.public,
          available_buckets: buckets?.map((b) => b.name) || [],
        });
      }
    } catch (storageError) {
      addTest("supabase_connection", false, {
        error:
          storageError instanceof Error
            ? storageError.message
            : "Unknown storage error",
      });
    }

    // Test 4: File Upload Test
    const testFileName = `debug-test-${Date.now()}.txt`;
    const testFilePath = `debug/${testFileName}`;
    const testContent = "Adventure Log upload test file";

    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(testFilePath, testContent, {
          contentType: "text/plain",
          cacheControl: "3600",
        });

      if (uploadError) {
        addTest("file_upload", false, {
          error: uploadError.message,
          // Note: StorageError doesn't have statusCode property
        });
      } else {
        // Test public URL generation
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from(bucketName).getPublicUrl(testFilePath);

        addTest("file_upload", true, {
          file_path: testFilePath,
          public_url: publicUrl,
        });

        // Clean up test file
        try {
          await supabaseAdmin.storage.from(bucketName).remove([testFilePath]);
          addTest("file_cleanup", true, { cleaned_file: testFilePath });
        } catch (cleanupError) {
          addTest("file_cleanup", false, {
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : "Cleanup failed",
          });
        }
      }
    } catch (uploadError) {
      addTest("file_upload", false, {
        error:
          uploadError instanceof Error ? uploadError.message : "Upload failed",
      });
    }

    // Test 5: Permission Test (simulated image upload)
    const testImageData = Buffer.from("test-image-data");
    const imageTestPath = `debug/test-image-${Date.now()}.png`;

    try {
      const { error: imageUploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(imageTestPath, testImageData, {
          contentType: "image/png",
          cacheControl: "3600",
        });

      if (imageUploadError) {
        addTest("image_upload_simulation", false, {
          error: imageUploadError.message,
          // Note: StorageError doesn't have statusCode property
        });
      } else {
        addTest("image_upload_simulation", true, { file_path: imageTestPath });

        // Clean up
        await supabaseAdmin.storage.from(bucketName).remove([imageTestPath]);
      }
    } catch (error) {
      addTest("image_upload_simulation", false, {
        error:
          error instanceof Error ? error.message : "Image upload test failed",
      });
    }

    // Test 6: Authentication Test
    try {
      const session = await getServerSession(authOptions);
      addTest("authentication_system", true, {
        has_session: !!session,
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || null,
      });
    } catch (authError) {
      addTest("authentication_system", false, {
        error:
          authError instanceof Error ? authError.message : "Auth test failed",
      });
    }

    // Calculate success rate
    const successRate =
      testResults.overall.total > 0
        ? (
            (testResults.overall.passed / testResults.overall.total) *
            100
          ).toFixed(1)
        : "0";

    testResults.summary = {
      success_rate: `${successRate}%`,
      status: testResults.overall.failed === 0 ? "ALL_PASS" : "SOME_FAIL",
      recommendation:
        testResults.overall.failed === 0
          ? "Configuration looks good! If uploads still fail, check browser console and network requests."
          : "Some tests failed. Check the failed tests and run the Supabase setup script if needed.",
    };

    logger.info(`Upload config test completed: ${successRate}% success rate`);

    return NextResponse.json(testResults);
  } catch (error) {
    logger.error("Upload configuration test failed:", error);

    return NextResponse.json(
      {
        ...testResults,
        error: "Test script failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to test actual file upload with a small test file
 * POST /api/debug/upload-test
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Authentication required for upload test",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // Find or create a test album
    let testAlbum = await db.album.findFirst({
      where: {
        userId: session.user.id,
        title: "Debug Upload Test",
      },
    });

    if (!testAlbum) {
      testAlbum = await db.album.create({
        data: {
          userId: session.user.id,
          title: "Debug Upload Test",
          description: "Temporary album for testing upload functionality",
          country: "Test Country",
          latitude: 0,
          longitude: 0,
          privacy: "PRIVATE",
        },
      });
    }

    // Create a minimal test "image"
    const testImageBuffer = Buffer.from([
      0xff,
      0xd8,
      0xff,
      0xe0,
      0x00,
      0x10,
      0x4a,
      0x46,
      0x49,
      0x46, // JPEG header
      0x00,
      0x01,
      0x01,
      0x01,
      0x00,
      0x48,
      0x00,
      0x48,
      0x00,
      0x00,
      0xff,
      0xd9, // JPEG footer
    ]);

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET!;
    const testFileName = `debug-upload-test-${Date.now()}.jpg`;
    const testFilePath = `albums/${testAlbum.id}/${testFileName}`;

    // Upload test file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(testFilePath, testImageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      return NextResponse.json({
        success: false,
        error: "Upload failed",
        details: uploadError.message,
        album_id: testAlbum.id,
      });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(testFilePath);

    // Save to database
    const albumPhoto = await db.albumPhoto.create({
      data: {
        url: publicUrl,
        albumId: testAlbum.id,
        caption: "Debug test upload",
        metadata: JSON.stringify({
          originalName: testFileName,
          size: testImageBuffer.length,
          type: "image/jpeg",
          isDebugFile: true,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Upload test successful",
      data: {
        album_id: testAlbum.id,
        photo_id: albumPhoto.id,
        public_url: publicUrl,
        file_path: testFilePath,
        file_size: testImageBuffer.length,
      },
    });
  } catch (error) {
    logger.error("Upload POST test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Upload test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
