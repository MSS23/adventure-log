"use client";

import { AlertCircle, X, RefreshCw } from "lucide-react";
import React, { useState, useCallback } from "react";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

/**
 * Form Error Handler Component
 * Handles form validation errors, API errors, and provides error recovery
 */

export interface FormError {
  field?: string;
  message: string;
  type:
    | "validation"
    | "api"
    | "network"
    | "permission"
    | "rate-limit"
    | "server";
  code?: string;
  details?: any;
  timestamp: string;
}

interface FormErrorHandlerProps {
  errors: FormError[];
  onRetry?: () => void | Promise<void>;
  onClear?: () => void;
  showRetryButton?: boolean;
  className?: string;
  position?: "top" | "bottom" | "inline";
  maxErrors?: number;
}

interface FormErrorContextType {
  errors: FormError[];
  addError: (error: Omit<FormError, "timestamp">) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  clearFieldErrors: (field: string) => void;
  hasErrors: boolean;
  hasFieldError: (field: string) => boolean;
  getFieldError: (field: string) => FormError | undefined;
}

// Context for form-level error management
export const FormErrorContext =
  React.createContext<FormErrorContextType | null>(null);

/**
 * Form Error Handler Component
 */
export function FormErrorHandler({
  errors,
  onRetry,
  onClear,
  showRetryButton = false,
  className = "",
  position = "top",
  maxErrors = 5,
}: FormErrorHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState<Set<number>>(
    new Set()
  );

  const visibleErrors = errors
    .slice(0, maxErrors)
    .filter((_, index) => !dismissedErrors.has(index));

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
      setDismissedErrors(new Set()); // Clear dismissed errors on successful retry
    } catch (error) {
      logger.error("Retry failed:", { error: error });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = (index: number) => {
    setDismissedErrors((prev) => new Set([...prev, index]));
  };

  const handleClearAll = () => {
    setDismissedErrors(new Set());
    onClear?.();
  };

  const getErrorIcon = (type: FormError["type"]) => {
    switch (type) {
      case "network":
        return "🌐";
      case "permission":
        return "🔒";
      case "rate-limit":
        return "⏱️";
      case "server":
        return "🔧";
      case "api":
        return "📡";
      case "validation":
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getErrorColor = (type: FormError["type"]) => {
    switch (type) {
      case "server":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      case "network":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950";
      case "permission":
        return "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950";
      case "rate-limit":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
      case "api":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";
      case "validation":
      default:
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
    }
  };

  if (visibleErrors.length === 0) {
    return null;
  }

  const positionClasses = {
    top: "mb-4",
    bottom: "mt-4",
    inline: "my-2",
  };

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className="space-y-2">
        {visibleErrors.map((error, index) => (
          <div
            key={`${error.field}-${error.timestamp}-${index}`}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getErrorColor(error.type)} transition-all duration-200`}
          >
            <div className="flex-shrink-0 mt-0.5 text-red-500">
              {getErrorIcon(error.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error.field && (
                      <span className="capitalize">{error.field}: </span>
                    )}
                    {error.message}
                  </p>

                  {error.code && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Error Code: {error.code}
                    </p>
                  )}

                  {process.env.NODE_ENV === "development" && error.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                        Debug Info
                      </summary>
                      <pre className="text-xs bg-red-100 dark:bg-red-900 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(error.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                <button
                  onClick={() => handleDismiss(index)}
                  className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {errors.length > maxErrors && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            ... and {errors.length - maxErrors} more error
            {errors.length - maxErrors !== 1 ? "s" : ""}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          {showRetryButton && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`}
              />
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          )}

          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing form errors
 */
export function useFormErrors() {
  const [errors, setErrors] = useState<FormError[]>([]);

  const addError = useCallback((error: Omit<FormError, "timestamp">) => {
    setErrors((prev) => [
      ...prev,
      { ...error, timestamp: new Date().toISOString() },
    ]);
  }, []);

  const removeError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearFieldErrors = useCallback((field: string) => {
    setErrors((prev) => prev.filter((error) => error.field !== field));
  }, []);

  const hasErrors = errors.length > 0;

  const hasFieldError = useCallback(
    (field: string) => {
      return errors.some((error) => error.field === field);
    },
    [errors]
  );

  const getFieldError = useCallback(
    (field: string) => {
      return errors.find((error) => error.field === field);
    },
    [errors]
  );

  // Helper functions for adding specific types of errors
  const addValidationError = useCallback(
    (field: string, message: string, details?: any) => {
      addError({
        field,
        message,
        type: "validation",
        details,
      });
    },
    [addError]
  );

  const addApiError = useCallback(
    (message: string, code?: string, details?: any) => {
      addError({
        message,
        type: "api",
        code,
        details,
      });
    },
    [addError]
  );

  const addNetworkError = useCallback(
    (message: string = "Network connection failed") => {
      addError({
        message,
        type: "network",
      });
    },
    [addError]
  );

  // Handle Zod validation errors
  const addZodError = useCallback(
    (zodError: ZodError) => {
      zodError.issues.forEach((error) => {
        const field = error.path.join(".");
        addValidationError(field, error.message, error);
      });
    },
    [addValidationError]
  );

  // Handle fetch API errors
  const addFetchError = useCallback(
    async (response: Response, endpoint: string) => {
      try {
        const errorData = await response.json();

        if (response.status === 429) {
          addError({
            message:
              errorData.message || "Too many requests. Please try again later.",
            type: "rate-limit",
            code: "429",
            details: { endpoint, rateLimit: errorData.rateLimit },
          });
        } else if (response.status === 403) {
          addError({
            message:
              errorData.message ||
              "You do not have permission to perform this action.",
            type: "permission",
            code: "403",
            details: { endpoint },
          });
        } else if (response.status >= 500) {
          addError({
            message:
              errorData.message || "Server error occurred. Please try again.",
            type: "server",
            code: response.status.toString(),
            details: { endpoint, errorData },
          });
        } else {
          addError({
            message: errorData.message || "An error occurred.",
            type: "api",
            code: response.status.toString(),
            details: { endpoint, errorData },
          });
        }
      } catch {
        // If we can't parse the response, add a generic error
        addError({
          message: `Request failed with status ${response.status}`,
          type: response.status >= 500 ? "server" : "api",
          code: response.status.toString(),
          details: { endpoint },
        });
      }
    },
    [addError]
  );

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    clearFieldErrors,
    hasErrors,
    hasFieldError,
    getFieldError,
    addValidationError,
    addApiError,
    addNetworkError,
    addZodError,
    addFetchError,
  };
}

/**
 * Form Error Provider Component
 */
export function FormErrorProvider({ children }: { children: React.ReactNode }) {
  const errorHandling = useFormErrors();

  return (
    <FormErrorContext.Provider value={errorHandling}>
      {children}
    </FormErrorContext.Provider>
  );
}

/**
 * Hook to use form error context
 */
export function useFormErrorContext() {
  const context = React.useContext(FormErrorContext);
  if (!context) {
    throw new Error(
      "useFormErrorContext must be used within a FormErrorProvider"
    );
  }
  return context;
}

/**
 * Field Error Component - displays errors for a specific field
 */
interface FieldErrorProps {
  field: string;
  className?: string;
}

export function FieldError({ field, className = "" }: FieldErrorProps) {
  const { getFieldError } = useFormErrorContext();
  const error = getFieldError(field);

  if (!error) {
    return null;
  }

  return (
    <div className={`mt-1 ${className}`}>
      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {error.message}
      </p>
    </div>
  );
}

export default FormErrorHandler;
