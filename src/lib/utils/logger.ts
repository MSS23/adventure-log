/**
 * Centralized logging system for Adventure Log
 * Provides structured logging with different levels and context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  component?: string
  action?: string
  userId?: string
  albumId?: string
  photoId?: string
  [key: string]: unknown
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: Error | unknown
}

class Logger {
  private minLevel: LogLevel
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): LogEntry {
    return {
      level,
      message,
      timestamp: this.formatTimestamp(),
      context,
      error
    }
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level]
    const contextStr = entry.context ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}:${v}`).join(', ')}]` : ''
    return `[${entry.timestamp}] ${levelName}${contextStr}: ${entry.message}`
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    const message = this.formatConsoleMessage(entry)

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.error || '')
        break
      case LogLevel.INFO:
        console.info(message, entry.error || '')
        break
      case LogLevel.WARN:
        console.warn(message, entry.error || '')
        break
      case LogLevel.ERROR:
        console.error(message, entry.error || '')
        break
    }
  }

  private logToExternalService(entry: LogEntry): void {
    // In production, you could send logs to services like:
    // - Sentry for error tracking
    // - LogRocket for session replay
    // - DataDog for monitoring
    // - CloudWatch for AWS deployments

    if (!this.isDevelopment && entry.level >= LogLevel.ERROR) {
      // Example: Send to external error tracking service
      // This would be implemented based on your chosen service
      // sentry.captureException(entry.error, { extra: entry.context })
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): void {
    const entry = this.createLogEntry(level, message, context, error)

    // Always log to console in development, selectively in production
    this.logToConsole(entry)

    // Send to external services if configured
    this.logToExternalService(entry)
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext, error?: Error | unknown): void {
    this.log(LogLevel.WARN, message, context, error)
  }

  error(message: string, context?: LogContext, error?: Error | unknown): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  // Convenience methods for common use cases
  userAction(action: string, userId?: string, additionalContext?: LogContext): void {
    this.info(`User action: ${action}`, {
      component: 'user-action',
      action,
      userId,
      ...additionalContext
    })
  }

  apiCall(endpoint: string, method: string, context?: LogContext): void {
    this.debug(`API call: ${method} ${endpoint}`, {
      component: 'api',
      endpoint,
      method,
      ...context
    })
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      component: 'performance',
      operation,
      duration,
      ...context
    })
  }
}

// Create and export singleton instance
export const logger = new Logger()

// Export convenience functions for easier migration from console.*
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext, error?: Error | unknown) => logger.warn(message, context, error),
  error: (message: string, context?: LogContext, error?: Error | unknown) => logger.error(message, context, error),
  userAction: (action: string, userId?: string, context?: LogContext) => logger.userAction(action, userId, context),
  apiCall: (endpoint: string, method: string, context?: LogContext) => logger.apiCall(endpoint, method, context),
  performance: (operation: string, duration: number, context?: LogContext) => logger.performance(operation, duration, context)
}