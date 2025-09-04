<<<<<<< HEAD
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { serverEnv, clientEnv } from '@/src/env';
=======
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverEnv, clientEnv } from "@/lib/env";
>>>>>>> oauth-upload-fixes

/**
 * Debug endpoint to test upload configuration
 * GET /api/debug/upload-test
 */
export async function GET() {
  const testResults: any = {
    timestamp: new Date().toISOString(),
    environment: serverEnv.NODE_ENV,
    tests: {},
<<<<<<< HEAD
    overall: { passed: 0, failed: 0, total: 0 }
=======
    overall: { passed: 0, failed: 0, total: 0 },
>>>>>>> oauth-upload-fixes
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
<<<<<<< HEAD
    logger.info('Running upload configuration test');
=======
    logger.info("Running upload configuration test");
>>>>>>> oauth-upload-fixes

    // Test 1: Environment Configuration
    const bucketName = clientEnv.NEXT_PUBLIC_SUPABASE_BUCKET;
    const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

<<<<<<< HEAD
    addTest('environment_config', !!(bucketName && supabaseUrl && serviceKey), {
      bucket_configured: !!bucketName,
      url_configured: !!supabaseUrl,
      service_key_configured: !!serviceKey && serviceKey.length > 50,
      bucket_name: bucketName
=======
    addTest("environment_config", !!(bucketName && supabaseUrl && serviceKey), {
      bucket_configured: !!bucketName,
      url_configured: !!supabaseUrl,
      service_key_configured: !!serviceKey && serviceKey.length > 50,
      bucket_name: bucketName,
>>>>>>> oauth-upload-fixes
    });

    if (!bucketName || !supabaseUrl || !serviceKey) {
      return NextResponse.json({
        ...testResults,
<<<<<<< HEAD
        error: 'Environment configuration incomplete'
=======
        error: "Environment configuration incomplete",
>>>>>>> oauth-upload-fixes
      });
    }

    // Test 2: Database Connection
    try {
      const userCount = await db.user.count();
<<<<<<< HEAD
      addTest('database_connection', true, { user_count: userCount });
    } catch (dbError) {
      addTest('database_connection', false, { 
        error: dbError instanceof Error ? dbError.message : 'Unknown database error' 
=======
      addTest("database_connection", true, { user_count: userCount });
    } catch (dbError) {
      addTest("database_connection", false, {
        error:
          dbError instanceof Error ? dbError.message : "Unknown database error",
>>>>>>> oauth-upload-fixes
      });
    }

    // Test 3: Supabase Storage Connection
    try {
<<<<<<< HEAD
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      
      if (bucketsError) {
        addTest('supabase_connection', false, { error: bucketsError.message });
      } else {
        const targetBucket = buckets?.find(b => b.name === bucketName);
        addTest('supabase_connection', !!targetBucket, {
          total_buckets: buckets?.length || 0,
          target_bucket_exists: !!targetBucket,
          target_bucket_public: targetBucket?.public,
          available_buckets: buckets?.map(b => b.name) || []
        });
      }
    } catch (storageError) {
      addTest('supabase_connection', false, {
        error: storageError instanceof Error ? storageError.message : 'Unknown storage error'
=======
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
>>>>>>> oauth-upload-fixes
      });
    }

    // Test 4: File Upload Test
    const testFileName = `debug-test-${Date.now()}.txt`;
    const testFilePath = `debug/${testFileName}`;
<<<<<<< HEAD
    const testContent = 'Adventure Log upload test file';
=======
    const testContent = "Adventure Log upload test file";
>>>>>>> oauth-upload-fixes

    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(testFilePath, testContent, {
<<<<<<< HEAD
          contentType: 'text/plain',
          cacheControl: '3600'
        });

      if (uploadError) {
        addTest('file_upload', false, {
          error: uploadError.message
=======
          contentType: "text/plain",
          cacheControl: "3600",
        });

      if (uploadError) {
        addTest("file_upload", false, {
          error: uploadError.message,
>>>>>>> oauth-upload-fixes
          // Note: StorageError doesn't have statusCode property
        });
      } else {
        // Test public URL generation
<<<<<<< HEAD
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(testFilePath);

        addTest('file_upload', true, {
          file_path: testFilePath,
          public_url: publicUrl
=======
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from(bucketName).getPublicUrl(testFilePath);

        addTest("file_upload", true, {
          file_path: testFilePath,
          public_url: publicUrl,
>>>>>>> oauth-upload-fixes
        });

        // Clean up test file
        try {
          await supabaseAdmin.storage.from(bucketName).remove([testFilePath]);
<<<<<<< HEAD
          addTest('file_cleanup', true, { cleaned_file: testFilePath });
        } catch (cleanupError) {
          addTest('file_cleanup', false, {
            error: cleanupError instanceof Error ? cleanupError.message : 'Cleanup failed'
=======
          addTest("file_cleanup", true, { cleaned_file: testFilePath });
        } catch (cleanupError) {
          addTest("file_cleanup", false, {
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : "Cleanup failed",
>>>>>>> oauth-upload-fixes
          });
        }
      }
    } catch (uploadError) {
<<<<<<< HEAD
      addTest('file_upload', false, {
        error: uploadError instanceof Error ? uploadError.message : 'Upload failed'
=======
      addTest("file_upload", false, {
        error:
          uploadError instanceof Error ? uploadError.message : "Upload failed",
>>>>>>> oauth-upload-fixes
      });
    }

    // Test 5: Permission Test (simulated image upload)
<<<<<<< HEAD
    const testImageData = Buffer.from('test-image-data');
=======
    const testImageData = Buffer.from("test-image-data");
>>>>>>> oauth-upload-fixes
    const imageTestPath = `debug/test-image-${Date.now()}.png`;

    try {
      const { error: imageUploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(imageTestPath, testImageData, {
<<<<<<< HEAD
          contentType: 'image/png',
          cacheControl: '3600'
        });

      if (imageUploadError) {
        addTest('image_upload_simulation', false, {
          error: imageUploadError.message
          // Note: StorageError doesn't have statusCode property
        });
      } else {
        addTest('image_upload_simulation', true, { file_path: imageTestPath });
        
=======
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

>>>>>>> oauth-upload-fixes
        // Clean up
        await supabaseAdmin.storage.from(bucketName).remove([imageTestPath]);
      }
    } catch (error) {
<<<<<<< HEAD
      addTest('image_upload_simulation', false, {
        error: error instanceof Error ? error.message : 'Image upload test failed'
=======
      addTest("image_upload_simulation", false, {
        error:
          error instanceof Error ? error.message : "Image upload test failed",
>>>>>>> oauth-upload-fixes
      });
    }

    // Test 6: Authentication Test
    try {
      const session = await getServerSession(authOptions);
<<<<<<< HEAD
      addTest('authentication_system', true, {
        has_session: !!session,
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || null
      });
    } catch (authError) {
      addTest('authentication_system', false, {
        error: authError instanceof Error ? authError.message : 'Auth test failed'
=======
      addTest("authentication_system", true, {
        has_session: !!session,
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || null,
      });
    } catch (authError) {
      addTest("authentication_system", false, {
        error:
          authError instanceof Error ? authError.message : "Auth test failed",
>>>>>>> oauth-upload-fixes
      });
    }

    // Calculate success rate
<<<<<<< HEAD
    const successRate = testResults.overall.total > 0 
      ? ((testResults.overall.passed / testResults.overall.total) * 100).toFixed(1)
      : '0';

    testResults.summary = {
      success_rate: `${successRate}%`,
      status: testResults.overall.failed === 0 ? 'ALL_PASS' : 'SOME_FAIL',
      recommendation: testResults.overall.failed === 0 
        ? 'Configuration looks good! If uploads still fail, check browser console and network requests.'
        : 'Some tests failed. Check the failed tests and run the Supabase setup script if needed.'
=======
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
>>>>>>> oauth-upload-fixes
    };

    logger.info(`Upload config test completed: ${successRate}% success rate`);

    return NextResponse.json(testResults);
<<<<<<< HEAD

  } catch (error) {
    logger.error('Upload configuration test failed:', error);
    
    return NextResponse.json({
      ...testResults,
      error: 'Test script failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
=======
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
>>>>>>> oauth-upload-fixes
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
<<<<<<< HEAD
      return NextResponse.json({
        error: 'Authentication required for upload test',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
=======
      return NextResponse.json(
        {
          error: "Authentication required for upload test",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
>>>>>>> oauth-upload-fixes
    }

    // Find or create a test album
    let testAlbum = await db.album.findFirst({
      where: {
        userId: session.user.id,
<<<<<<< HEAD
        title: 'Debug Upload Test'
      }
=======
        title: "Debug Upload Test",
      },
>>>>>>> oauth-upload-fixes
    });

    if (!testAlbum) {
      testAlbum = await db.album.create({
        data: {
          userId: session.user.id,
<<<<<<< HEAD
          title: 'Debug Upload Test',
          description: 'Temporary album for testing upload functionality',
          country: 'Test Country',
          latitude: 0,
          longitude: 0,
          privacy: 'PRIVATE'
        }
=======
          title: "Debug Upload Test",
          description: "Temporary album for testing upload functionality",
          country: "Test Country",
          latitude: 0,
          longitude: 0,
          privacy: "PRIVATE",
        },
>>>>>>> oauth-upload-fixes
      });
    }

    // Create a minimal test "image"
    const testImageBuffer = Buffer.from([
<<<<<<< HEAD
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, // JPEG header
      0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      0xFF, 0xD9 // JPEG footer
=======
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
>>>>>>> oauth-upload-fixes
    ]);

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET!;
    const testFileName = `debug-upload-test-${Date.now()}.jpg`;
    const testFilePath = `albums/${testAlbum.id}/${testFileName}`;

    // Upload test file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(testFilePath, testImageBuffer, {
<<<<<<< HEAD
        contentType: 'image/jpeg',
        cacheControl: '3600'
=======
        contentType: "image/jpeg",
        cacheControl: "3600",
>>>>>>> oauth-upload-fixes
      });

    if (uploadError) {
      return NextResponse.json({
        success: false,
<<<<<<< HEAD
        error: 'Upload failed',
        details: uploadError.message,
        album_id: testAlbum.id
=======
        error: "Upload failed",
        details: uploadError.message,
        album_id: testAlbum.id,
>>>>>>> oauth-upload-fixes
      });
    }

    // Get public URL
<<<<<<< HEAD
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(testFilePath);
=======
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(testFilePath);
>>>>>>> oauth-upload-fixes

    // Save to database
    const albumPhoto = await db.albumPhoto.create({
      data: {
        url: publicUrl,
        albumId: testAlbum.id,
<<<<<<< HEAD
        caption: 'Debug test upload',
        metadata: JSON.stringify({
          originalName: testFileName,
          size: testImageBuffer.length,
          type: 'image/jpeg',
          isDebugFile: true
        })
      }
=======
        caption: "Debug test upload",
        metadata: JSON.stringify({
          originalName: testFileName,
          size: testImageBuffer.length,
          type: "image/jpeg",
          isDebugFile: true,
        }),
      },
>>>>>>> oauth-upload-fixes
    });

    return NextResponse.json({
      success: true,
<<<<<<< HEAD
      message: 'Upload test successful',
=======
      message: "Upload test successful",
>>>>>>> oauth-upload-fixes
      data: {
        album_id: testAlbum.id,
        photo_id: albumPhoto.id,
        public_url: publicUrl,
        file_path: testFilePath,
<<<<<<< HEAD
        file_size: testImageBuffer.length
      }
    });

  } catch (error) {
    logger.error('Upload POST test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
=======
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
>>>>>>> oauth-upload-fixes
