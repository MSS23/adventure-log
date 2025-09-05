import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { BUCKET_NAME } from "@/lib/storage-simple";

/**
 * GET /api/debug/storage-test
 *
 * Debug endpoint to test Supabase storage connection in production
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    session: {
      hasSession: !!session,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT_SET",
      bucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "NOT_SET",
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    tests: [] as any[],
  };

  // Test 1: Storage connection
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      results.tests.push({
        name: "Storage Connection",
        status: "error",
        error: error.message,
      });
    } else {
      results.tests.push({
        name: "Storage Connection",
        status: "success",
        buckets: buckets.map((b) => b.name),
      });
    }
  } catch (error) {
    results.tests.push({
      name: "Storage Connection",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 2: Bucket access
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      results.tests.push({
        name: "Bucket Access",
        status: "error",
        error: error.message,
      });
    } else {
      const adventureBucket = buckets.find((b) => b.name === BUCKET_NAME);
      results.tests.push({
        name: "Bucket Access",
        status: adventureBucket ? "success" : "error",
        bucketExists: !!adventureBucket,
        bucketName: BUCKET_NAME,
        bucketDetails: adventureBucket || null,
      });
    }
  } catch (error) {
    results.tests.push({
      name: "Bucket Access",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 3: File upload test (if authenticated)
  if (session?.user?.id) {
    try {
      const testFileName = `debug/test-${Date.now()}.txt`;
      const testContent = `Debug test - ${new Date().toISOString()}`;

      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(testFileName, testContent, {
            contentType: "text/plain",
            upsert: false,
          });

      if (uploadError) {
        results.tests.push({
          name: "Upload Test",
          status: "error",
          error: uploadError.message,
        });
      } else {
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(BUCKET_NAME)
          .getPublicUrl(testFileName);

        // Clean up test file
        await supabaseAdmin.storage.from(BUCKET_NAME).remove([testFileName]);

        results.tests.push({
          name: "Upload Test",
          status: "success",
          uploadPath: uploadData.path,
          publicUrl: urlData.publicUrl,
          cleaned: true,
        });
      }
    } catch (error) {
      results.tests.push({
        name: "Upload Test",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    results.tests.push({
      name: "Upload Test",
      status: "skipped",
      reason: "No authenticated session",
    });
  }

  // Calculate overall status
  const hasErrors = results.tests.some((test) => test.status === "error");
  const overallStatus = hasErrors ? "error" : "success";

  return NextResponse.json({
    status: overallStatus,
    message: hasErrors
      ? "Some storage tests failed"
      : "All storage tests passed",
    ...results,
  });
}
