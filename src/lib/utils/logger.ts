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
    const contextStr = entry.context ? ` [${Object.entries(entry.context).map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        try {
          return `${k}:${JSON.stringify(v)}`
        } catch {
          // Fallback for objects that can't be stringified
          return `${k}:${String(v)}`
        }
      }
      return `${k}:${v}`
    }).join(', ')}]` : ''
    return `[${entry.timestamp}] ${levelName}${contextStr}: ${entry.message}`
  }

  private formatError(error: Error | unknown): string | Error {
    if (error instanceof Error) {
      return error
    }

    // Handle Supabase PostgrestError and other object-like errors
    if (typeof error === 'object' && error !== null) {
      try {
        // Extract common error properties
        const errorObj = error as Record<string, unknown>
        const parts: string[] = []

        if (errorObj.message) parts.push(`message: ${errorObj.message}`)
        if (errorObj.code) parts.push(`code: ${errorObj.code}`)
        if (errorObj.details) parts.push(`details: ${errorObj.details}`)
        if (errorObj.hint) parts.push(`hint: ${errorObj.hint}`)

        if (parts.length > 0) {
          return parts.join(', ')
        }

        // Fallback to JSON stringify
        return JSON.stringify(error, null, 2)
      } catch {
        return String(error)
      }
    }

    return String(error)
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    const message = this.formatConsoleMessage(entry)
    const formattedError = entry.error ? this.formatError(entry.error) : undefined

    switch (entry.level) {
      case LogLevel.DEBUG:
        if (formattedError) {
          console.debug(message, formattedError)
        } else {
          console.debug(message)
        }
        break
      case LogLevel.INFO:
        if (formattedError) {
          console.info(message, formattedError)
        } else {
          console.info(message)
        }
        break
      case LogLevel.WARN:
        if (formattedError) {
          console.warn(message, formattedError)
        } else {
          console.warn(message)
        }
        break
      case LogLevel.ERROR:
        if (formattedError) {
          console.error(message, formattedError)
        } else if (entry.context) {
          // If no formatted error but we have context, show context instead of just message
          console.error(message, JSON.stringify(entry.context, null, 2))
        } else {
          console.error(message)
        }
        break
    }
  }

  private async sendToExternalService(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | unknown
  ): Promise<void> {
    // Only send errors and warnings to external services in production
    if (this.isDevelopment || level < LogLevel.WARN) return

    try {
      // Sentry integration (if configured)
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // Dynamic import to avoid bundling Sentry in client if not needed
        const Sentry = await import('@sentry/nextjs').catch(() => null)
        if (Sentry) {
          if (error) {
            Sentry.captureException(error, {
              level: this.levelToSentryLevel(level),
              tags: {
                component: context?.component,
                action: context?.action,
              },
              extra: context
            })
          } else {
            Sentry.captureMessage(message, {
              level: this.levelToSentryLevel(level),
              tags: {
                component: context?.component,
                action: context?.action,
              },
              extra: context
            })
          }
        }
      }
    } catch (err) {
      // Don't let external service failures break the app
      console.error('Failed to send to external service:', err)
    }
  }

  private levelToSentryLevel(level: LogLevel): 'debug' | 'info' | 'warning' | 'error' {
    const mapping: Record<LogLevel, 'debug' | 'info' | 'warning' | 'error'> = {
      [LogLevel.DEBUG]: 'debug',
      [LogLevel.INFO]: 'info',
      [LogLevel.WARN]: 'warning',
      [LogLevel.ERROR]: 'error'
    }
    return mapping[level]
  }

  private logToExternalService(entry: LogEntry): void {
    // Send to external services asynchronously (don't block)
    this.sendToExternalService(entry.level, entry.message, entry.context, entry.error).catch(() => {
      // Silently fail - external service errors shouldn't break the app
    })
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