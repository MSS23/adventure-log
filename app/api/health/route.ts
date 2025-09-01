import { NextRequest, NextResponse } from "next/server";

import { checkPrismaHealth } from "@/lib/prisma-init";

export async function GET(_request: NextRequest) {
  try {
    const healthCheck = await checkPrismaHealth();

    if (healthCheck.status === "healthy") {
      return NextResponse.json({
        status: "ok",
        database: healthCheck,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          status: "error",
          database: healthCheck,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
