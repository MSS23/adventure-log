import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";

import { authOptions } from "@/lib/auth";
import { checkAndAwardBadges } from "@/lib/badges";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/photos/upload - Upload photos to an album
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const albumId = formData.get("albumId") as string;
    const files = formData.getAll("photos") as File[];

    if (!albumId) {
      return NextResponse.json(
        { error: "Album ID is required" },
        { status: 400 }
      );
    }

    if (!files.length) {
      return NextResponse.json(
        { error: "No photos provided" },
        { status: 400 }
      );
    }

    // Verify album exists and belongs to user
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId: session.user.id,
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const uploadedPhotos = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        errors.push(`File ${file.name} is not an image`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        errors.push(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      try {
        // Generate unique filename
        const fileExtension = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `albums/${albumId}/${fileName}`;

        // Upload to Supabase
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabaseAdmin.storage
          .from("photos")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            cacheControl: "3600",
          });

        if (uploadError) {
          console.error("Supabase upload error:", uploadError);
          errors.push(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("photos").getPublicUrl(filePath);

        // Save to database
        const albumPhoto = await db.albumPhoto.create({
          data: {
            url: publicUrl,
            albumId,
            caption: (formData.get(`caption_${i}`) as string) || null,
            metadata: JSON.stringify({
              originalName: file.name,
              size: file.size,
              type: file.type,
            }),
          },
        });

        uploadedPhotos.push(albumPhoto);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`Failed to process ${file.name}`);
      }
    }

    // Update album stats
    if (uploadedPhotos.length > 0) {
      // Set cover photo if this is the first photo
      const albumPhotoCount = await db.albumPhoto.count({
        where: { albumId },
      });

      if (albumPhotoCount === uploadedPhotos.length && !album.coverPhotoId) {
        await db.album.update({
          where: { id: albumId },
          data: { coverPhotoId: uploadedPhotos[0].id },
        });
      }

      // Update user stats
      await db.user.update({
        where: { id: session.user.id },
        data: {
          totalPhotosCount: {
            increment: uploadedPhotos.length,
          },
        },
      });

      // Create activity record
      await db.activity.create({
        data: {
          userId: session.user.id,
          type: "PHOTO_UPLOADED",
          targetType: "Album",
          targetId: albumId,
          metadata: JSON.stringify({
            albumTitle: album.title,
            photosCount: uploadedPhotos.length,
          }),
        },
      });

      // Check for badge achievements (async, don't wait)
      checkAndAwardBadges({
        userId: session.user.id,
        triggerType: "PHOTO_UPLOADED",
        metadata: {
          albumId,
          photosCount: uploadedPhotos.length,
        },
      }).catch((error) => console.error("Badge check failed:", error));
    }

    return NextResponse.json({
      success: true,
      uploadedPhotos,
      errors,
      message: `${uploadedPhotos.length} photos uploaded successfully${errors.length > 0 ? ` (${errors.length} errors)` : ""}`,
    });
  } catch (error) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
