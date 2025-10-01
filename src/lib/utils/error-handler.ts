/**
 * Enhanced error handling utilities for consistent error management across the application
 */

import { log } from './logger'

interface ErrorLike {
  code?: string | number
  status?: string | number
  name?: string
  message?: string
  response?: { status?: number }
  request?: unknown
}

const asErrorLike = (error: unknown): ErrorLike =>
  typeof error === 'object' && error !== null ? (error as ErrorLike) : {}

export interface AppError {
  code: string
  message: string
  details?: string
  context?: Record<string, unknown>
  timestamp: string
  userId?: string
  component?: string
  action?: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export class AppErrorHandler {
  private static instance: AppErrorHandler
  private errorCounts: Map<string, number> = new Map()
  private readonly maxErrorsPerMinute = 10

  static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler()
    }
    return AppErrorHandler.instance
  }

  /**
   * Create a standardized app error
   */
  createError(
    code: string,
    message: string,
    context?: ErrorContext,
    severity: AppError['severity'] = 'medium',
    retryable = false
  ): AppError {
    return {
      code,
      message,
      context: context?.metadata,
      timestamp: new Date().toISOString(),
      userId: context?.userId,
      component: context?.component,
      action: context?.action,
      retryable,
      severity
    }
  }

  /**
   * Handle and log an error with appropriate response
   */
  handleError(
    error: Error | AppError | unknown,
    context?: ErrorContext,
    fallbackMessage = 'An unexpected error occurred'
  ): AppError {
    let appError: AppError

    if (error instanceof Error) {
      appError = this.createError(
        'UNKNOWN_ERROR',
        error.message || fallbackMessage,
        context,
        this.determineSeverity(error),
        this.isRetryable(error)
      )
    } else if (this.isAppError(error)) {
      appError = error
    } else {
      appError = this.createError(
        'UNKNOWN_ERROR',
        fallbackMessage,
        context,
        'medium',
        false
      )
    }

    // Check rate limiting
    if (this.shouldRateLimit(appError.code)) {
      return appError
    }

    // Log the error
    this.logError(appError)

    // Send to monitoring service if critical
    if (appError.severity === 'critical') {
      this.sendToMonitoring(appError)
    }

    return appError
  }

  /**
   * Handle database errors specifically
   */
  handleDatabaseError(
    error: unknown,
    context?: ErrorContext,
    operation = 'database operation'
  ): AppError {
    const dbError = asErrorLike(error)
    const errorCode = dbError.code || 'DATABASE_ERROR'
    const errorMessage = dbError.message || 'Database operation failed'
    
    let appError: AppError

    // Handle specific database error types
    switch (errorCode) {
      case 'PGRST116': // No rows returned
        appError = this.createError(
          'NO_DATA_FOUND',
          'No data found for the requested operation',
          context,
          'low',
          false
        )
        break
      case '23505': // Unique constraint violation
        appError = this.createError(
          'DUPLICATE_ENTRY',
          'A record with this information already exists',
          context,
          'medium',
          false
        )
        break
      case '23503': // Foreign key constraint violation
        appError = this.createError(
          'FOREIGN_KEY_VIOLATION',
          'Referenced record does not exist',
          context,
          'medium',
          false
        )
        break
      case '42P01': // Table does not exist
        appError = this.createError(
          'TABLE_NOT_FOUND',
          `Required database table not found for ${operation}`,
          context,
          'high',
          false
        )
        break
      default:
        appError = this.createError(
          'DATABASE_ERROR',
          `${operation} failed: ${errorMessage}`,
          context,
          'medium',
          true
        )
    }

    this.logError(appError)
    return appError
  }

  /**
   * Handle network/API errors
   */
  handleNetworkError(
    error: unknown,
    context?: ErrorContext,
    endpoint = 'unknown endpoint'
  ): AppError {
    const networkError = asErrorLike(error)
    const isTimeout = networkError.code === 'TIMEOUT' || networkError.name === 'AbortError'
    const isNetworkError = !networkError.response && networkError.request

    let appError: AppError

    if (isTimeout) {
      appError = this.createError(
        'REQUEST_TIMEOUT',
        `Request to ${endpoint} timed out`,
        context,
        'medium',
        true
      )
    } else if (isNetworkError) {
      appError = this.createError(
        'NETWORK_ERROR',
        `Network error while accessing ${endpoint}`,
        context,
        'high',
        true
      )
    } else {
      appError = this.createError(
        'API_ERROR',
        `API error from ${endpoint}: ${networkError.message || 'Unknown error'}`,
        context,
        'medium',
        (networkError.response?.status ?? 0) < 500
      )
    }

    this.logError(appError)
    return appError
  }

  /**
   * Handle authentication/authorization errors
   */
  handleAuthError(
    error: unknown,
    context?: ErrorContext,
    operation = 'authentication'
  ): AppError {
    const authError = asErrorLike(error)
    const errorCode = authError.code ?? authError.status ?? 'AUTH_ERROR'
    const errorMessage = authError.message || 'Authentication error'
    
    let appError: AppError

    switch (errorCode) {
      case 401:
      case 'UNAUTHORIZED':
        appError = this.createError(
          'UNAUTHORIZED',
          'You are not authorized to perform this action',
          context,
          'medium',
          false
        )
        break
      case 403:
      case 'FORBIDDEN':
        appError = this.createError(
          'FORBIDDEN',
          'Access to this resource is forbidden',
          context,
          'medium',
          false
        )
        break
      case 'INVALID_TOKEN':
        appError = this.createError(
          'INVALID_TOKEN',
          'Your session has expired. Please log in again.',
          context,
          'medium',
          false
        )
        break
      default:
        appError = this.createError(
          'AUTH_ERROR',
          `${operation} failed: ${errorMessage}`,
          context,
          'medium',
          true
        )
    }

    this.logError(appError)
    return appError
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case 'NO_DATA_FOUND':
        return 'No data found for your request.'
      case 'DUPLICATE_ENTRY':
        return 'This information already exists. Please try with different data.'
      case 'FOREIGN_KEY_VIOLATION':
        return 'Unable to complete this action due to missing required information.'
      case 'TABLE_NOT_FOUND':
        return 'A system error occurred. Please try again later.'
      case 'REQUEST_TIMEOUT':
        return 'The request took too long. Please try again.'
      case 'NETWORK_ERROR':
        return 'Network connection error. Please check your internet connection.'
      case 'UNAUTHORIZED':
        return 'You need to log in to perform this action.'
      case 'FORBIDDEN':
        return 'You don\'t have permission to access this resource.'
      case 'INVALID_TOKEN':
        return 'Your session has expired. Please log in again.'
      default:
        return error.message || 'An unexpected error occurred. Please try again.'
    }
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(error: AppError, attemptCount = 0): Promise<boolean> {
    if (!error.retryable || attemptCount >= 3) {
      return Promise.resolve(false)
    }

    // Don't retry critical errors
    if (error.severity === 'critical') {
      return Promise.resolve(false)
    }

    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, attemptCount), 10000)
    return new Promise<boolean>(resolve => setTimeout(() => resolve(true), delay))
  }

  private isAppError(error: unknown): error is AppError {
    if (typeof error !== 'object' || error === null) {
      return false
    }
    return 'code' in error && 'message' in error
  }

  private determineSeverity(error: Error): AppError['severity'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical'
    }
    if (message.includes('error') || message.includes('failed')) {
      return 'high'
    }
    if (message.includes('warning') || message.includes('timeout')) {
      return 'medium'
    }
    return 'low'
  }

  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('connection')
  }

  private shouldRateLimit(errorCode: string): boolean {
    const now = Date.now()
    const _minuteAgo = now - 60000 // eslint-disable-line @typescript-eslint/no-unused-vars
    const recentErrors = this.errorCounts.get(errorCode) || 0
    
    if (recentErrors > this.maxErrorsPerMinute) {
      return true
    }
    
    this.errorCounts.set(errorCode, recentErrors + 1)
    
    // Clean up old counts
    setTimeout(() => {
      const currentCount = this.errorCounts.get(errorCode) || 0
      if (currentCount > 0) {
        this.errorCounts.set(errorCode, currentCount - 1)
      }
    }, 60000)
    
    return false
  }

  private logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity)
    
    log[logLevel](`Error [${error.code}]: ${error.message}`, {
      component: error.component,
      action: error.action,
      userId: error.userId,
      errorCode: error.code,
      severity: error.severity,
      retryable: error.retryable,
      context: error.context,
      timestamp: error.timestamp
    })
  }

  private getLogLevel(severity: AppError['severity']): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error'
      case 'medium':
        return 'warn'
      case 'low':
        return 'info'
      default:
        return 'info'
    }
  }

  private sendToMonitoring(error: AppError): void {
    // Monitoring service integration - placeholder for future implementation
    console.error('Critical error sent to monitoring:', error)
  }
}

// Export singleton instance
export const errorHandler = AppErrorHandler.getInstance()

// Convenience functions
export const handleError = (error: unknown, context?: ErrorContext) => 
  errorHandler.handleError(error, context)

export const handleDatabaseError = (error: unknown, context?: ErrorContext, operation?: string) =>
  errorHandler.handleDatabaseError(error, context, operation)

export const handleNetworkError = (error: unknown, context?: ErrorContext, endpoint?: string) =>
  errorHandler.handleNetworkError(error, context, endpoint)

export const handleAuthError = (error: unknown, context?: ErrorContext, operation?: string) =>
  errorHandler.handleAuthError(error, context, operation)

export const getUserFriendlyMessage = (error: AppError) =>
  errorHandler.getUserFriendlyMessage(error)

export const shouldRetry = (error: AppError, attemptCount?: number) =>
  errorHandler.shouldRetry(error, attemptCount)
