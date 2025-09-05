/**
 * Global Error Handler
 * Centralized error handling for async operations, API calls, and unhandled errors
 */

import { logger } from "./logger";

export interface ErrorContext {
  userId?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  source: "api" | "client" | "server" | "unknown";
  severity: "low" | "medium" | "high" | "critical";
  fingerprint?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  eventId: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  tags: Record<string, string>;
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler | null = null;
  private isInitialized = false;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;
  private flushInterval = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Initialize global error handling
   */
  initialize(): void {
    if (this.isInitialized || typeof window === "undefined") {
      return;
    }

    this.setupGlobalErrorListeners();
    this.setupPeriodicFlush();
    this.isInitialized = true;

    logger.info("Global error handler initialized");
  }

  /**
   * Set up global error event listeners
   */
  private setupGlobalErrorListeners(): void {
    // Handle JavaScript errors
    window.addEventListener("error", (event) => {
      this.handleError(event.error || new Error(event.message), {
        source: "client",
        severity: "medium",
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: "javascript-error",
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      this.handleError(error, {
        source: "client",
        severity: "high",
        metadata: {
          type: "unhandled-promise-rejection",
          reason: event.reason,
        },
      });
    });

    // Handle network errors
    window.addEventListener("online", () => {
      this.handleNetworkStatusChange("online");
    });

    window.addEventListener("offline", () => {
      this.handleNetworkStatusChange("offline");
    });
  }

  /**
   * Handle network status changes
   */
  private handleNetworkStatusChange(status: "online" | "offline"): void {
    if (status === "offline") {
      this.handleError(new Error("Network connection lost"), {
        source: "client",
        severity: "medium",
        metadata: {
          type: "network-offline",
        },
      });
    } else {
      // Flush queued errors when back online
      this.flushErrorQueue();
    }
  }

  /**
   * Handle individual errors
   */
  handleError(
    error: Error,
    context: Partial<ErrorContext> = {},
    tags: Record<string, string> = {}
  ): string {
    const eventId = this.generateEventId();
    const timestamp = new Date().toISOString();

    const fullContext: ErrorContext = {
      userId: this.getCurrentUserId(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      timestamp,
      source: "unknown",
      severity: "medium",
      fingerprint: this.generateFingerprint(error),
      ...context,
    };

    const errorReport: ErrorReport = {
      eventId,
      message: error.message,
      stack: error.stack,
      context: fullContext,
      tags: {
        environment: process.env.NODE_ENV || "unknown",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
        ...tags,
      },
    };

    // Add to queue
    this.addToQueue(errorReport);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      logger.error("Global error handler:", { error, fullContext });
    }

    // Immediate flush for critical errors
    if (fullContext.severity === "critical") {
      this.flushErrorQueue();
    }

    return eventId;
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(
    error: Error,
    endpoint: string,
    method: string = "GET",
    statusCode?: number,
    responseData?: any
  ): string {
    return this.handleError(
      error,
      {
        source: "api",
        severity: this.getApiErrorSeverity(statusCode),
        metadata: {
          endpoint,
          method,
          statusCode,
          responseData: responseData
            ? JSON.stringify(responseData).slice(0, 500)
            : undefined,
          type: "api-error",
        },
      },
      {
        endpoint,
        method,
        status: statusCode?.toString() || "unknown",
      }
    );
  }

  /**
   * Handle async operation errors
   */
  handleAsyncError(
    error: Error,
    operation: string,
    metadata?: Record<string, any>
  ): string {
    return this.handleError(
      error,
      {
        source: "client",
        severity: "medium",
        metadata: {
          operation,
          type: "async-error",
          ...metadata,
        },
      },
      {
        operation,
      }
    );
  }

  /**
   * Add error to queue for batch processing
   */
  private addToQueue(errorReport: ErrorReport): void {
    if (this.errorQueue.length >= this.maxQueueSize) {
      // Remove oldest error if queue is full
      this.errorQueue.shift();
    }

    this.errorQueue.push(errorReport);
  }

  /**
   * Flush error queue to remote service
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) {
      return;
    }

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // Send to monitoring service (e.g., Sentry)
      if (typeof window !== "undefined" && window.__SENTRY__) {
        errors.forEach((error) => {
          window.__SENTRY__.captureException(new Error(error.message), {
            tags: error.tags,
            extra: {
              eventId: error.eventId,
              context: error.context,
              stack: error.stack,
            },
            fingerprint: error.context.fingerprint
              ? [error.context.fingerprint]
              : undefined,
          });
        });
      }

      // Send to custom error reporting endpoint
      if (typeof fetch !== "undefined" && navigator.onLine) {
        await fetch("/api/errors/batch-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ errors }),
        });
      }
    } catch (flushError) {
      logger.error("Failed to flush error queue:", { error: flushError });

      // Re-add errors to queue for retry
      this.errorQueue.unshift(...errors);
    }
  }

  /**
   * Set up periodic error queue flushing
   */
  private setupPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushErrorQueue();
    }, this.flushInterval);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(error: Error): string {
    // Create fingerprint based on error message and stack trace
    const stackLine = error.stack?.split("\n")[1] || "";
    const fingerprint = `${error.name}:${error.message}:${stackLine}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get current user ID from session or local storage
   */
  private getCurrentUserId(): string | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }

    try {
      // Try to get from NextAuth session
      const sessionData = document
        .querySelector('meta[name="session"]')
        ?.getAttribute("content");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.user?.id;
      }

      // Try to get from local storage
      const userId = localStorage.getItem("userId");
      return userId || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Determine API error severity based on status code
   */
  private getApiErrorSeverity(statusCode?: number): ErrorContext["severity"] {
    if (!statusCode) return "medium";

    if (statusCode >= 500) return "high";
    if (statusCode >= 400) return "medium";
    return "low";
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining errors
    this.flushErrorQueue();

    this.isInitialized = false;
  }
}

/**
 * Utility function to wrap async functions with error handling
 */
export function withAsyncErrorHandling<
  T extends (...args: any[]) => Promise<any>,
>(fn: T, operation: string): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorHandler = GlobalErrorHandler.getInstance();
      errorHandler.handleAsyncError(
        error instanceof Error ? error : new Error(String(error)),
        operation,
        { args: args.slice(0, 3) } // Limit args to prevent large payloads
      );
      throw error;
    }
  }) as T;
}

/**
 * Utility function to wrap API calls with error handling
 */
export function withApiErrorHandling<T>(
  promise: Promise<T>,
  endpoint: string,
  method: string = "GET"
): Promise<T> {
  return promise.catch((error) => {
    const errorHandler = GlobalErrorHandler.getInstance();

    let statusCode: number | undefined;
    let responseData: any;

    // Extract additional error information
    if (error.response) {
      statusCode = error.response.status;
      responseData = error.response.data;
    } else if (error.status) {
      statusCode = error.status;
    }

    errorHandler.handleApiError(
      error,
      endpoint,
      method,
      statusCode,
      responseData
    );
    throw error;
  });
}

/**
 * Initialize global error handler (call once in app startup)
 */
export function initializeErrorHandler(): void {
  const errorHandler = GlobalErrorHandler.getInstance();
  errorHandler.initialize();
}

export default GlobalErrorHandler;
