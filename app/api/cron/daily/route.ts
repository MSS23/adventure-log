import { NextRequest } from "next/server";
import { runDailyCronJobs } from "@/lib/cron";
import { logger } from "@/lib/logger";
import { ok, handleApiError } from "@/lib/http";

/**
 * POST /api/cron/daily - Run daily maintenance tasks
 * This endpoint should be called by a cron service (Vercel Cron, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt");
      return new Response("Unauthorized", status: 401 });
    }

    logger.info("Starting daily cron job execution");

    await runDailyCronJobs();

    return ok({
      message: "Daily cron jobs completed successfully", timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Daily cron job failed:", { error });
    return handleApiError(error);
  }
}

/**
 * GET /api/cron/daily - Health check for cron job
 */
export async function GET() {
  return ok({
    status: "healthy",
    message: "Daily cron job endpoint is ready",
    timestamp: new Date().toISOString(),
  });
}
