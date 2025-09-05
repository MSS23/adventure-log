"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate errors to this boundary
  level?: "page" | "component" | "critical";
  enableReporting?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableReporting = true, level = "component" } = this.props;
    const { errorId } = this.state;

    // Log error with context
    logger.error("React Error Boundary caught error", {
      errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      retryCount: this.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler
    onError?.(error, errorInfo);

    // Report to external services in production
    if (enableReporting && process.env.NODE_ENV === "production") {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send error report to API
      await fetch("/api/errors/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          errorId: this.state.errorId,
          level: this.props.level,
        }),
      });
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined });
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    const { hasError, error, errorId } = this.state;
    const {
      children,
      fallback,
      isolate = false,
      level = "component",
    } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Critical errors get full page treatment
      if (level === "critical") {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-600">Critical Error</CardTitle>
                <CardDescription>
                  The application encountered a critical error and needs to be
                  reloaded.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Error ID: {errorId}</p>
                  {process.env.NODE_ENV === "development" && error && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 hover:text-red-700">
                        Show Error Details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={this.handleReload} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Application
                  </Button>
                  <Button
                    variant="outline"
                    onClick={this.handleGoHome}
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Page-level errors
      if (level === "page") {
        return (
          <div className="flex flex-col items-center justify-center min-h-96 px-4">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Page Error
              </h2>
              <p className="text-gray-600 mb-6 max-w-md">
                This page encountered an error. You can try refreshing or go
                back to continue.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {this.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </Button>
                )}
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-red-600 hover:text-red-700 mb-2">
                    <Bug className="w-4 h-4 inline mr-1" />
                    Developer Info
                  </summary>
                  <div className="bg-gray-100 p-4 rounded text-sm">
                    <p>
                      <strong>Error ID:</strong> {errorId}
                    </p>
                    <pre className="mt-2 overflow-auto text-xs">
                      {error.stack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Component-level errors (default)
      return (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 my-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Component Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {isolate
                  ? "This section couldn't load properly."
                  : "A component on this page encountered an error."}
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                {this.retryCount < this.maxRetries && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={this.handleRetry}
                    className="text-red-700 border-red-200 hover:bg-red-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
                {process.env.NODE_ENV === "development" && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-700">
                      Show Error (Dev)
                    </summary>
                    <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                      {error?.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for imperative error handling
export function useErrorHandler() {
  return (error: Error, _errorInfo?: { componentStack?: string }) => {
    // Trigger the nearest error boundary
    throw error;
  };
}

// Specific error boundary components for common use cases
export const AsyncComponentErrorBoundary = ({
  children,
}: {
  children: ReactNode;
}) => (
  <EnhancedErrorBoundary
    level="component"
    isolate={true}
    fallback={
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <div className="text-gray-500 mb-2">
          <AlertTriangle className="w-8 h-8 mx-auto" />
        </div>
        <p className="text-gray-600 text-sm">Failed to load component</p>
      </div>
    }
  >
    {children}
  </EnhancedErrorBoundary>
);

export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => (
  <EnhancedErrorBoundary level="page" enableReporting={true}>
    {children}
  </EnhancedErrorBoundary>
);

export const CriticalErrorBoundary = ({
  children,
}: {
  children: ReactNode;
}) => (
  <EnhancedErrorBoundary level="critical" enableReporting={true}>
    {children}
  </EnhancedErrorBoundary>
);

export default EnhancedErrorBoundary;
