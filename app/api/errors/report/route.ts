import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

/**
 * Error Reporting API Endpoint
 * Receives and processes client-side error reports
 */

const ErrorReportSchema = z.object({
  eventId: z.string().min(1),
  message: z.string().min(1),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  level: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string().datetime(),
  retryCount: z.number().default(0),
  context: z.record(z.string(), z.any()).optional(),
  manual: z.boolean().default(false),
});

const BatchErrorReportSchema = z.object({
  errors: z.array(
    z.object({
      eventId: z.string(),
      message: z.string(),
      stack: z.string().optional(),
      context: z.object({
        userId: z.string().optional(),
        url: z.string().optional(),
        userAgent: z.string().optional(),
        timestamp: z.string(),
        source: z.enum(["api", "client", "server", "unknown"]),
        severity: z.enum(["low", "medium", "high", "critical"]),
        fingerprint: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
      tags: z.record(z.string(), z.string()),
    })
  ),
});

/**
 * Single error report endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const body = await request.json();

    // Validate request body
    const validatedData = ErrorReportSchema.parse(body);

    // Get client IP and user agent
    const clientIP =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";

    const userAgent = headersList.get("user-agent") || "unknown";

    // Enhanced error report
    const errorReport = {
      ...validatedData,
      clientIP,
      userAgent: validatedData.userAgent || userAgent,
      receivedAt: new Date().toISOString(),
    };

    // Log error (in production, this would go to a proper logging service)
    logger.error("Client Error Report:", {
      eventId: errorReport.eventId,
      message: errorReport.message,
      level: errorReport.level,
      url: errorReport.url,
      clientIP,
      timestamp: errorReport.timestamp,
    });

    // Process error based on severity
    await processErrorReport(errorReport);

    // Store error in database if needed
    await storeErrorReport(errorReport);

    // Send alerts for critical errors
    if (errorReport.level === "critical") {
      await sendCriticalErrorAlert(errorReport);
    }

    return NextResponse.json(
      {
        success: true,
        eventId: errorReport.eventId,
        message: "Error report received successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error processing error report:", { error });

    // Don't let error reporting itself cause errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid error report format",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to process error report",
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Batch error report endpoint
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = BatchErrorReportSchema.parse(body);

    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";

    // Process each error in the batch
    const processedErrors = await Promise.allSettled(
      validatedData.errors.map(async (error) => {
        try {
          const enhancedError = {
            ...error,
            clientIP,
            receivedAt: new Date().toISOString(),
          };

          await processErrorReport(enhancedError);
          await storeErrorReport(enhancedError);

          return { success: true, eventId: error.eventId };
        } catch (processingError) {
          logger.error(
            `Failed to process error ${error.eventId}:`,
            { error: processingError }
          );
          return {
            success: false,
            eventId: error.eventId,
            error: processingError,
          };
        }
      })
    );

    const successCount = processedErrors.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;

    const failureCount = processedErrors.length - successCount;

    logger.info(
      `Batch error processing: ${successCount} successful, ${failureCount} failed`
    );

    return NextResponse.json({
      success: true,
      processed: successCount,
      failed: failureCount,
      total: processedErrors.length,
    });
  } catch (error) {
    logger.error("Error processing batch error report:", { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid batch error report format",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process batch error report" },
      { status: 500 }
    );
  }
}

/**
 * Process individual error report
 */
async function processErrorReport(errorReport: any): Promise<void> {
  // Deduplicate errors based on fingerprint
  const fingerprint = generateErrorFingerprint(errorReport);

  // Check if this error has been seen recently
  const isDuplicate = await checkErrorDuplication(fingerprint);

  if (isDuplicate) {
    // Just increment counter for duplicate errors
    await incrementErrorCount(fingerprint);
    return;
  }

  // Process new error
  logger.info(`Processing new error: ${errorReport.eventId}`);

  // Send to external monitoring service (Sentry, { LogRocket, etc. })
  await sendToMonitoringService(errorReport);

  // Analyze error patterns
  await analyzeErrorPatterns(errorReport);
}

/**
 * Store error report in database
 */
async function storeErrorReport(errorReport: any): Promise<void> {
  // In a real implementation, this would save to a database
  // For now, we'll just log it

  try {
    // Example database storage (implement with your database)
    /*
    await db.errorReport.create({
      data: {
        eventId: errorReport.eventId,
        message: errorReport.message,
        stack: errorReport.stack,
        level: errorReport.level,
        url: errorReport.url,
        userAgent: errorReport.userAgent,
        clientIP: errorReport.clientIP,
        timestamp: new Date(errorReport.timestamp),
        context: errorReport.context,
        fingerprint: generateErrorFingerprint(errorReport),
      },
    });
    */

    logger.info(`Error report stored: ${errorReport.eventId}`);
  } catch (error) {
    logger.error("Failed to store error report:", { error });
    // Don't throw - we don't want storage failures to break error reporting
  }
}

/**
 * Send critical error alerts
 */
async function sendCriticalErrorAlert(errorReport: any): Promise<void> {
  try {
    // Send alert to monitoring service
    logger.error("CRITICAL ERROR ALERT:", {
      eventId: errorReport.eventId,
      message: errorReport.message,
      url: errorReport.url,
      timestamp: errorReport.timestamp,
    });

    // In production, send to:
    // - Slack/Discord webhooks
    // - Email alerts
    // - PagerDuty/OpsGenie
    // - SMS alerts for on-call engineers

    /*
    // Example Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Error: ${errorReport.message}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Event ID', value: errorReport.eventId, short: true },
              { title: 'URL', value: errorReport.url, short: true },
              { title: 'User Agent', value: errorReport.userAgent?.slice(0, 100), short: false },
              { title: 'Stack Trace', value: errorReport.stack?.slice(0, 500), short: false },
            ],
          }],
        }),
      });
    }
    */
  } catch (alertError) {
    logger.error("Failed to send critical error alert:", { error: alertError });
  }
}

/**
 * Send error to external monitoring service
 */
async function sendToMonitoringService(errorReport: any): Promise<void> {
  try {
    // Example: Send to Sentry, LogRocket, Datadog, etc.
    /*
    if (process.env.SENTRY_DSN) {
      // Send to Sentry via their API
    }
    */

    logger.info(`Error sent to monitoring service: ${errorReport.eventId}`);
  } catch (error) {
    logger.error("Failed to send error to monitoring service:", { error });
  }
}

/**
 * Generate error fingerprint for deduplication
 */
function generateErrorFingerprint(errorReport: any): string {
  const key = `${errorReport.message}:${errorReport.url || ""}:${errorReport.stack?.split("\n")[0] || ""}`;

  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

/**
 * Check if error is a duplicate
 */
async function checkErrorDuplication(_fingerprint: string): Promise<boolean> {
  // In production, check cache or database
  // For now, return false (treat all as new)
  return false;
}

/**
 * Increment error count for duplicate errors
 */
async function incrementErrorCount(fingerprint: string): Promise<void> {
  // In production, update counter in database/cache
  logger.debug(`Incremented error count for fingerprint: ${fingerprint}`);
}

/**
 * Analyze error patterns
 */
async function analyzeErrorPatterns(errorReport: any): Promise<void> {
  // Implement error pattern analysis
  // - Check for error spikes
  // - Identify problematic URLs/components
  // - Detect browser-specific issues
  // - Monitor error trends

  logger.debug(`Analyzing patterns for error: ${errorReport.eventId}`);
}

/**
 * Health check for error reporting service
 */
export async function GET() {
  return NextResponse.json({
    service: "error-reporting",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
