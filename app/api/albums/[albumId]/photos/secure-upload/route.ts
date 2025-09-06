import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateFile } from "@/lib/storage-simple";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

interface UploadResult {
  success: boolean;
  photo?: {
    id: string;
    filename: string;
    storage_path: string;
    public_url: string;
    size_bytes: number;
    mime_type: string;
    created_at: string;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
): Promise<NextResponse> {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      console.error("[Secure Upload] Authentication error:", authResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          details: authResult.error,
        },
        { status: 401 }
      );
    }

    const user = authResult.user;

    const albumId = params.albumId;
    console.log(
      `[Secure Upload] Starting upload for user ${user.id} to album ${albumId}`
    );

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    const results: UploadResult[] = [];
    const serviceSupabase = createServiceRoleClient();

    for (const file of files) {
      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          results.push({
            success: false,
            error: `${file.name}: ${validation.error}`,
          });
          continue;
        }

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${timestamp}-${sanitizedName}`;

        // User-specific folder path
        const storagePath = `${user.id}/${filename}`;

        console.log(`[Secure Upload] Uploading ${file.name} to ${storagePath}`);

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage using service role (bypasses RLS)
        const { data: uploadData, error: uploadError } =
          await serviceSupabase.storage
            .from("adventure-photos")
            .upload(storagePath, uint8Array, {
              contentType: file.type,
              upsert: false,
              metadata: {
                originalName: file.name,
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString(),
                albumId,
              },
            });

        if (uploadError) {
          console.error(
            `[Secure Upload] Storage error for ${file.name}:`,
            uploadError
          );
          results.push({
            success: false,
            error: `${file.name}: Upload failed - ${uploadError.message}`,
          });
          continue;
        }

        console.log(
          `[Secure Upload] Successfully uploaded to storage:`,
          uploadData.path
        );

        // Generate signed URL for the uploaded file
        const { data: signedUrlData, error: signedUrlError } =
          await serviceSupabase.storage
            .from("adventure-photos")
            .createSignedUrl(storagePath, 86400 * 365); // 1 year expiry

        if (signedUrlError) {
          console.error(
            `[Secure Upload] Failed to create signed URL:`,
            signedUrlError
          );
          // Continue without signed URL - can be generated later
        }

        // Insert record into photos table using service role
        const { data: photoData, error: dbError } = await serviceSupabase
          .from("photos")
          .insert({
            user_id: user.id,
            album_id: albumId,
            filename: file.name,
            storage_path: storagePath,
            public_url: signedUrlData?.signedUrl || null,
            size_bytes: file.size,
            mime_type: file.type,
            metadata: {
              originalName: file.name,
              uploadedAt: new Date().toISOString(),
            },
          } as any)
          .select()
          .single();

        if (dbError) {
          console.error(
            `[Secure Upload] Database error for ${file.name}:`,
            dbError
          );

          // Clean up uploaded file if database insert failed
          await serviceSupabase.storage
            .from("adventure-photos")
            .remove([storagePath]);

          results.push({
            success: false,
            error: `${file.name}: Database error - ${dbError.message}`,
          });
          continue;
        }

        console.log(
          `[Secure Upload] Successfully created photo record:`,
          (photoData as any)?.id
        );

        results.push({
          success: true,
          photo: {
            id: (photoData as any)?.id,
            filename: (photoData as any)?.filename,
            storage_path: (photoData as any)?.storage_path,
            public_url: (photoData as any)?.public_url || "",
            size_bytes: (photoData as any)?.size_bytes || 0,
            mime_type: (photoData as any)?.mime_type || "",
            created_at: (photoData as any)?.created_at,
          },
        });
      } catch (fileError) {
        console.error(
          `[Secure Upload] Unexpected error processing ${file.name}:`,
          fileError
        );
        results.push({
          success: false,
          error: `${file.name}: Unexpected error - ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
        });
      }
    }

    // Summarize results
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(
      `[Secure Upload] Completed: ${successful.length} successful, ${failed.length} failed`
    );

    return NextResponse.json({
      success: successful.length > 0,
      message: `Upload completed: ${successful.length} successful, ${failed.length} failed`,
      results: {
        successful: successful.map((r) => r.photo).filter(Boolean),
        failed: failed.map((r) => ({ error: r.error })),
      },
      stats: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error("[Secure Upload] Unexpected server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred during upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
