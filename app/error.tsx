"use client";

import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error("Application error:", error);

    // Report to global error handler if available
    if (typeof window !== "undefined") {
      try {
        // Send error report to API
        fetch("/api/errors/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: `app-error-${Date.now()}`,
            message: error.message,
            stack: error.stack,
            level: "high",
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            context: {
              digest: error.digest,
              type: "app-level-error",
            },
          }),
        }).catch((err) => logger.error("Failed to send error report:", err));
      } catch (reportError) {
        logger.error("Failed to report error:", reportError);
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-red-900/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-pulse" />
              <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We encountered an unexpected error while processing your
              adventure. Don&apos;t worry, our team has been notified.
            </p>
          </div>

          {/* Error details for development */}
          {process.env.NODE_ENV === "development" && (
            <Card className="mb-6 text-left bg-gray-50 dark:bg-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Development Error Details
                  </span>
                </div>
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-32">
                  {error.message}
                </pre>
                {error.digest && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                Return Home
              </Link>
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If this problem persists, please contact support
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
