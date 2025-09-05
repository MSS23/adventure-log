import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    logger.info("🔍 Debug Session Request", {
      hasSession: !!session,
      sessionUser: session?.user,
      url: request.url,
    });

    if (!session?.user?.id) {
      return NextResponse.json({
        session: session,
        user: null,
        dbUser: null,
        albums: [],
        error: "No authenticated session found",
      });
    }

    // Look up user in database
    let dbUser = null;
    let dbError = null;
    try {
      dbUser = await db.user.findUnique({
        where: { id: session.user.id },
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
      dbError = error;
      logger.error("❌ Database user lookup failed", {
        error,
        userId: session.user.id,
      });
    }

    // Look up albums
    let albums = [];
    let albumsError = null;
    try {
      if (dbUser) {
        albums = await db.album.findMany({
          where: { userId: session.user.id },
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
      albumsError = error;
      logger.error("❌ Albums lookup failed", {
        error,
        userId: session.user.id,
      });
    }

    return NextResponse.json({
      session: {
        user: session.user,
        expires: session.expires,
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
        sessionId: session.user.id,
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
