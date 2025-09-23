/**
 * Standardized error handling utilities for Adventure Log
 * Provides consistent error handling patterns and user-friendly error messages
 */

import { log } from './logger'

export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  FILE_UPLOAD = 'file_upload',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  component: string
  action: string
  userId?: string
  albumId?: string
  photoId?: string
  [key: string]: unknown
}

export interface StandardError {
  type: ErrorType
  message: string
  userMessage: string
  originalError?: Error | unknown
  context?: ErrorContext
  recoverable: boolean
  retryable: boolean
}

export class ErrorHandler {
  private static getErrorType(error: unknown): ErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
        return ErrorType.NETWORK
      }

      if (message.includes('401') || message.includes('unauthorized') || message.includes('auth')) {
        return ErrorType.AUTHENTICATION
      }

      if (message.includes('403') || message.includes('forbidden')) {
        return ErrorType.AUTHORIZATION
      }

      if (message.includes('400') || message.includes('validation') || message.includes('invalid')) {
        return ErrorType.VALIDATION
      }

      if (message.includes('413') || message.includes('file') || message.includes('upload')) {
        return ErrorType.FILE_UPLOAD
      }

      if (message.includes('5') && (message.includes('500') || message.includes('502') || message.includes('503'))) {
        return ErrorType.DATABASE
      }
    }

    return ErrorType.UNKNOWN
  }

  private static getUserMessage(type: ErrorType, originalMessage: string): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection failed. Please check your internet connection and try again.'

      case ErrorType.AUTHENTICATION:
        return 'Authentication required. Please sign in and try again.'

      case ErrorType.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.'

      case ErrorType.VALIDATION:
        return 'Invalid data provided. Please check your input and try again.'

      case ErrorType.FILE_UPLOAD:
        if (originalMessage.includes('413') || originalMessage.includes('large')) {
          return 'File is too large. Please choose a smaller file.'
        }
        if (originalMessage.includes('type') || originalMessage.includes('format')) {
          return 'File type not supported. Please choose a different file.'
        }
        return 'File upload failed. Please try again.'

      case ErrorType.DATABASE:
        return 'Service temporarily unavailable. Please try again in a moment.'

      case ErrorType.EXTERNAL_API:
        return 'External service unavailable. Some features may be temporarily limited.'

      case ErrorType.UNKNOWN:
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  private static isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.DATABASE,
      ErrorType.EXTERNAL_API
    ].includes(type)
  }

  private static isRecoverable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.VALIDATION,
      ErrorType.FILE_UPLOAD,
      ErrorType.DATABASE,
      ErrorType.EXTERNAL_API
    ].includes(type)
  }

  public static handle(error: unknown, context: ErrorContext): StandardError {
    const type = this.getErrorType(error)
    const originalMessage = error instanceof Error ? error.message : String(error)
    const userMessage = this.getUserMessage(type, originalMessage)

    const standardError: StandardError = {
      type,
      message: originalMessage,
      userMessage,
      originalError: error,
      context,
      recoverable: this.isRecoverable(type),
      retryable: this.isRetryable(type)
    }

    // Log the error with appropriate level
    switch (type) {
      case ErrorType.VALIDATION:
        log.warn(originalMessage, context, error)
        break

      case ErrorType.NETWORK:
      case ErrorType.EXTERNAL_API:
        log.warn(originalMessage, context, error)
        break

      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
      case ErrorType.DATABASE:
      case ErrorType.UNKNOWN:
      default:
        log.error(originalMessage, context, error)
        break
    }

    return standardError
  }

  public static async handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: T
  ): Promise<{ data?: T; error?: StandardError }> {
    try {
      const data = await operation()
      return { data }
    } catch (error) {
      const standardError = this.handle(error, context)
      return {
        error: standardError,
        data: fallback
      }
    }
  }

  public static handleSync<T>(
    operation: () => T,
    context: ErrorContext,
    fallback?: T
  ): { data?: T; error?: StandardError } {
    try {
      const data = operation()
      return { data }
    } catch (error) {
      const standardError = this.handle(error, context)
      return {
        error: standardError,
        data: fallback
      }
    }
  }
}

// Convenience functions for common patterns
export const handleApiError = (error: unknown, context: ErrorContext) =>
  ErrorHandler.handle(error, { ...context, action: `api-${context.action}` })

export const handleUploadError = (error: unknown, context: ErrorContext) =>
  ErrorHandler.handle(error, { ...context, action: `upload-${context.action}` })

export const handleAuthError = (error: unknown, context: ErrorContext) =>
  ErrorHandler.handle(error, { ...context, action: `auth-${context.action}` })

export const handleFormError = (error: unknown, context: ErrorContext) =>
  ErrorHandler.handle(error, { ...context, action: `form-${context.action}` })

// Retry utility for retryable errors
export class RetryHandler {
  public static async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: StandardError | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = ErrorHandler.handle(error, {
          ...context,
          attempt,
          maxRetries
        })

        if (!lastError.retryable || attempt === maxRetries) {
          throw lastError
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))

        log.info(`Retrying operation after ${delay}ms`, {
          ...context,
          attempt: attempt + 1,
          delay
        })
      }
    }

    throw lastError
  }
}

// Error boundary hook for React components
export const useErrorHandler = () => {
  const handleError = (error: unknown, context: Omit<ErrorContext, 'component'>) => {
    // Get component name from call stack if available
    const componentName = new Error().stack?.split('\n')[2]?.match(/at (\w+)/)?.[1] || 'Unknown'

    return ErrorHandler.handle(error, {
      component: componentName,
      action: 'unknown',
      ...context
    })
  }

  const handleAsync = async <T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'component'>,
    fallback?: T
  ) => {
    const componentName = new Error().stack?.split('\n')[2]?.match(/at (\w+)/)?.[1] || 'Unknown'

    return ErrorHandler.handleAsync(operation, {
      component: componentName,
      action: 'unknown',
      ...context
    }, fallback)
  }

  return { handleError, handleAsync }
}