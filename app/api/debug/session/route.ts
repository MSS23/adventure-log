import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    logger.info("🔍 Debug Supabase Auth Request", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      url: request.url,
    });

    if (authError || !user) {
      return NextResponse.json({
        auth: { user: null, error: authError?.message },
        dbUser: null,
        albums: [],
        error: "No authenticated user found",
      });
    }

    // Look up user in database
    let dbUser = null;
    let dbError: { message: string } | null = null;
    try {
      dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          accounts: true,
          _count: {
            select: {
              albums: true,
              activities: true,
            },
          },
        },
      });
    } catch (error) {
      dbError = error as { message: string };
      logger.error("❌ Database user lookup failed", {
        error,
        userId: user.id,
      });
    }

    // Look up albums
    let albums: any[] = [];
    let albumsError: { message: string } | null = null;
    try {
      if (dbUser) {
        albums = await db.album.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            _count: {
              select: {
                photos: true,
                favorites: true,
              },
            },
          },
        });
      }
    } catch (error) {
      albumsError = error as { message: string };
      logger.error("❌ Albums lookup failed", {
        error,
        userId: user.id,
      });
    }

    return NextResponse.json({
      auth: {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        },
      },
      dbUser: dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            image: dbUser.image,
            createdAt: dbUser.createdAt,
            emailVerified: dbUser.emailVerified,
            totalAlbumsCount: dbUser.totalAlbumsCount,
            accounts: dbUser.accounts.map((acc) => ({
              provider: acc.provider,
              providerAccountId: acc.providerAccountId,
            })),
            _count: dbUser._count,
          }
        : null,
      albums: albums.map((album) => ({
        id: album.id,
        title: album.title,
        country: album.country,
        city: album.city,
        createdAt: album.createdAt,
        photosCount: album._count.photos,
        favoritesCount: album._count.favorites,
      })),
      debug: {
        userId: user.id,
        dbUserFound: !!dbUser,
        albumsCount: albums.length,
        dbError: dbError?.message,
        albumsError: albumsError?.message,
      },
    });
  } catch (error) {
    logger.error("❌ Debug session endpoint failed", { error });
    return NextResponse.json(
      {
        error: "Debug session failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
