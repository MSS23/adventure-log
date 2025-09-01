"use client";

import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import React, { Component, ErrorInfo, ReactNode } from "react";

/**
 * Comprehensive Error Boundary Component
 * Catches and handles JavaScript errors anywhere in the child component tree
 */

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, eventId: string) => void;
  level?: "page" | "component" | "critical";
  isolate?: boolean;
  maxRetries?: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = this.generateEventId();

    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo, eventId);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, eventId);
    }
  }

  private generateEventId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportError(
    error: Error,
    errorInfo: ErrorInfo,
    eventId: string
  ): void {
    // Report to external monitoring service (Sentry, LogRocket, etc.)
    try {
      // Example: Sentry error reporting
      if (typeof window !== "undefined" && window.__SENTRY__) {
        window.__SENTRY__.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
              errorBoundary: this.constructor.name,
              level: this.props.level || "component",
            },
          },
          tags: {
            errorBoundary: true,
            level: this.props.level || "component",
            retryCount: this.state.retryCount,
          },
          extra: {
            eventId,
            errorInfo,
            props: this.props,
          },
        });
      }

      // Send to custom error tracking endpoint
      if (typeof fetch !== "undefined") {
        fetch("/api/errors/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            level: this.props.level || "component",
            url: typeof window !== "undefined" ? window.location.href : null,
            userAgent:
              typeof navigator !== "undefined" ? navigator.userAgent : null,
            timestamp: new Date().toISOString(),
            retryCount: this.state.retryCount,
          }),
        }).catch((reportError) => {
          console.error("Failed to report error:", reportError);
        });
      }
    } catch (reportingError) {
      console.error("Error reporting failed:", reportingError);
    }
  }

  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount >= maxRetries) {
      console.warn("Max retry attempts reached");
      return;
    }

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  private handleReportBug = (): void => {
    const { error, eventId } = this.state;

    if (typeof window !== "undefined") {
      const bugReportUrl = new URL(
        "/support/bug-report",
        window.location.origin
      );
      bugReportUrl.searchParams.set("eventId", eventId || "");
      bugReportUrl.searchParams.set("error", error?.message || "");
      bugReportUrl.searchParams.set("stack", error?.stack?.slice(0, 500) || "");

      window.open(bugReportUrl.toString(), "_blank");
    }
  };

  private renderErrorDetails(): ReactNode {
    const { error, errorInfo, eventId } = this.state;

    if (process.env.NODE_ENV !== "development") {
      return null;
    }

    return (
      <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300">
          Error Details (Development Only)
        </summary>

        <div className="mt-2 space-y-2 text-sm">
          <div>
            <strong>Event ID:</strong>{" "}
            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
              {eventId}
            </code>
          </div>

          <div>
            <strong>Error:</strong>
            <pre className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-800 dark:text-red-200 overflow-auto">
              {error?.toString()}
            </pre>
          </div>

          <div>
            <strong>Stack Trace:</strong>
            <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs overflow-auto max-h-40">
              {error?.stack}
            </pre>
          </div>

          <div>
            <strong>Component Stack:</strong>
            <pre className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs overflow-auto max-h-40">
              {errorInfo?.componentStack}
            </pre>
          </div>
        </div>
      </details>
    );
  }

  private renderFallbackUI(): ReactNode {
    const { level = "component", maxRetries = 3 } = this.props;
    const { retryCount, eventId } = this.state;

    const canRetry = retryCount < maxRetries;

    // Different UI based on error level
    if (level === "critical") {
      return (
        <div className="min-h-screen bg-red-50 dark:bg-red-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Critical Application Error
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;re experiencing technical difficulties. Our team has been
              notified and is working on a fix.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleReportBug}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Bug className="w-4 h-4" />
                Report Bug
              </button>
            </div>

            {eventId && (
              <p className="text-xs text-gray-500 mt-4">Error ID: {eventId}</p>
            )}
          </div>
        </div>
      );
    }

    if (level === "page") {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Page Error
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Something went wrong loading this page. Please try again.
            </p>

            <div className="flex gap-3 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Retry attempt: {retryCount}/{maxRetries}
              </p>
            )}

            {this.renderErrorDetails()}
          </div>
        </div>
      );
    }

    // Component level error
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 my-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />

          <div className="flex-1">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
              Component Error
            </h3>

            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              This component encountered an error and couldn&apos;t render properly.
            </p>

            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="mt-3 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded font-medium transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>

        {this.renderErrorDetails()}
      </div>
    );
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for programmatic error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    const eventId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.error("Manual error report:", error, context);

    // Report to monitoring service
    if (typeof window !== "undefined" && window.__SENTRY__) {
      window.__SENTRY__.captureException(error, {
        extra: context,
        tags: {
          manual: true,
          eventId,
        },
      });
    }

    // Send to custom endpoint
    if (typeof fetch !== "undefined") {
      fetch("/api/errors/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          message: error.message,
          stack: error.stack,
          context,
          manual: true,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    }

    return eventId;
  };

  return { reportError };
}

export default ErrorBoundary;
