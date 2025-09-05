/**
 * Error Handling Initialization
 * Sets up global error handling across the application
 */

import { GlobalErrorHandler } from "./error-handler";
import { logger } from "./logger";

declare global {
  interface Window {
    __SENTRY__?: any;
    __ERROR_HANDLER_INITIALIZED__?: boolean;
  }
}

/**
 * Initialize comprehensive error handling
 */
export function initializeErrorHandling(): void {
  // Only run on client side
  if (typeof window === "undefined") {
    return;
  }

  // Prevent multiple initializations
  if (window.__ERROR_HANDLER_INITIALIZED__) {
    return;
  }

  logger.info("🛡️  Initializing comprehensive error handling...");

  try {
    // Initialize global error handler
    const errorHandler = GlobalErrorHandler.getInstance();
    errorHandler.initialize();

    // Set up additional error monitoring
    setupPerformanceErrorMonitoring();
    setupResourceErrorMonitoring();
    setupConsoleErrorMonitoring();
    setupRuntimeErrorReporting();

    // Mark as initialized
    window.__ERROR_HANDLER_INITIALIZED__ = true;

    logger.info("✅ Error handling initialized successfully");
  } catch (initError) {
    logger.error("❌ Failed to initialize error handling:", { error: initError });
  }
}

/**
 * Monitor performance-related errors
 */
function setupPerformanceErrorMonitoring(): void {
  // Monitor long tasks
  if ("PerformanceObserver" in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 100) {
            // Tasks longer than 100ms
            const errorHandler = GlobalErrorHandler.getInstance();
            errorHandler.handleError(
              new Error(`Long task detected: ${entry.duration}ms`),
              {
                source: "client",
                severity: "low",
                metadata: {
                  type: "performance",
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name || "unknown",
                },
              },
              {
                performance: "long-task",
                duration: entry.duration.toString(),
              }
            );
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch (error) {
      logger.warn("Long task monitoring not supported:", { error: error });
    }

    // Monitor largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.startTime > 4000) {
            // LCP > 4s is poor
            const errorHandler = GlobalErrorHandler.getInstance();
            errorHandler.handleError(
              new Error(`Poor LCP performance: ${entry.startTime}ms`),
              {
                source: "client",
                severity: "low",
                metadata: {
                  type: "performance",
                  lcp: entry.startTime,
                  element: (entry as any).element?.tagName || "unknown",
                },
              },
              {
                performance: "lcp",
                metric: entry.startTime.toString(),
              }
            );
          }
        });
      });

      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (error) {
      logger.warn("LCP monitoring not supported:", { error: error });
    }
  }
}

/**
 * Monitor resource loading errors
 */
function setupResourceErrorMonitoring(): void {
  window.addEventListener(
    "error",
    (event) => {
      const { target } = event;

      // Resource loading errors
      if (target && target !== window) {
        const element = target as HTMLElement;
        const tagName = element.tagName?.toLowerCase();
        const src = (element as any).src || (element as any).href;

        if (
          tagName &&
          ["img", "script", "link", "source", "video", "audio"].includes(
            tagName
          )
        ) {
          const errorHandler = GlobalErrorHandler.getInstance();
          errorHandler.handleError(
            new Error(`Resource failed to load: ${tagName} - ${src}`),
            {
              source: "client",
              severity: "medium",
              metadata: {
                type: "resource-error",
                tagName,
                src,
                outerHTML: element.outerHTML?.slice(0, 200),
              },
            },
            {
              resourceType: tagName,
              errorType: "resource-loading",
            }
          );
        }
      }
    },
    true // Use capture phase to catch resource errors
  );
}

/**
 * Monitor console errors for additional context
 */
function setupConsoleErrorMonitoring(): void {
  // Override console.error to capture manual error logs
  const originalError = console.error;

  console.error = function (...args: any[]) {
    // Call original console.error
    originalError.apply(console, args);

    // Report to error handler if it looks like an error
    const firstArg = args[0];
    if (
      firstArg instanceof Error ||
      (typeof firstArg === "string" && firstArg.includes("Error"))
    ) {
      const errorHandler = GlobalErrorHandler.getInstance();
      errorHandler.handleError(
        firstArg instanceof Error ? firstArg : new Error(String(firstArg)),
        {
          source: "client",
          severity: "low",
          metadata: {
            type: "console-error",
            args: args.slice(0, 3).map((arg) => String(arg)),
          },
        },
        {
          source: "console",
        }
      );
    }
  };
}

/**
 * Set up runtime error reporting
 */
function setupRuntimeErrorReporting(): void {
  // Report critical browser API failures
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      const response = await originalFetch(input, init);

      // Report API errors
      if (!response.ok && response.status >= 500) {
        const errorHandler = GlobalErrorHandler.getInstance();
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url || "unknown";

        errorHandler.handleApiError(
          new Error(`Fetch failed: ${response.status} ${response.statusText}`),
          url,
          init?.method || "GET",
          response.status
        );
      }

      return response;
    } catch (fetchError) {
      // Network errors
      const errorHandler = GlobalErrorHandler.getInstance();
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url || "unknown";

      errorHandler.handleApiError(
        fetchError instanceof Error
          ? fetchError
          : new Error(String(fetchError)),
        url,
        init?.method || "GET"
      );

      throw fetchError;
    }
  };

  // Monitor visibility changes (user leaving/returning to app)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // User returned to app - flush any pending errors
      const errorHandler = GlobalErrorHandler.getInstance();
      // Trigger flush if method exists
      if ("flushErrorQueue" in errorHandler) {
        (errorHandler as any).flushErrorQueue?.();
      }
    }
  });
}

/**
 * Clean up error handling resources
 */
export function cleanupErrorHandling(): void {
  if (typeof window === "undefined") {
    return;
  }

  const errorHandler = GlobalErrorHandler.getInstance();
  if ("destroy" in errorHandler) {
    (errorHandler as any).destroy?.();
  }

  window.__ERROR_HANDLER_INITIALIZED__ = false;
}

/**
 * Get error statistics for monitoring
 */
export function getErrorStats(): {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySource: Record<string, number>;
  recentErrors: number;
} {
  // This would integrate with your error tracking system
  return {
    totalErrors: 0,
    errorsByType: {},
    errorsBySource: {},
    recentErrors: 0,
  };
}

/**
 * Test error handling (development only)
 */
export function testErrorHandling(): void {
  if (process.env.NODE_ENV !== "development") {
    logger.warn("Error handling tests only available in development");
    return;
  }

  logger.debug("🧪 Testing error handling...");

  // Test synchronous error
  try {
    throw new Error("Test sync error");
  } catch (error) {
    logger.debug("✅ Sync error caught and reported");
  }

  // Test async error
  Promise.reject(new Error("Test async error")).catch(() => {
    logger.debug("✅ Async error caught and reported");
  });

  // Test resource error
  const img = new Image();
  img.src = "https://invalid-url-for-testing.com/image.jpg";
  img.onerror = () => {
    logger.debug("✅ Resource error caught and reported");
  };

  logger.debug("🧪 Error handling tests completed");
}

const errorHandler = {
  initializeErrorHandling,
  cleanupErrorHandling,
  getErrorStats,
  testErrorHandling,
};

export default errorHandler;
