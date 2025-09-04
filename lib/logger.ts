<<<<<<< HEAD
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

class ProductionSafeLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true';

  private shouldLog(level: LogLevel): boolean {
    // Always log errors in production for debugging
    if (level === 'error') return true;
    
    // Log warnings in production for monitoring
    if (level === 'warn') return true;
    
    // Only log info and debug in development or when debug is enabled
    return this.isDevelopment || this.isDebugEnabled;
  }

  private formatMessage(level: LogLevel, args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
         
        console.debug(prefix, ...args);
        break;
      case 'info':
         
        console.info(prefix, ...args);
        break;
      case 'warn':
         
        console.warn(prefix, ...args);
        break;
      case 'error':
         
        console.error(prefix, ...args);
        break;
    }
  }

  debug(...args: unknown[]): void {
    this.formatMessage('debug', args);
  }

  info(...args: unknown[]): void {
    this.formatMessage('info', args);
  }

  warn(...args: unknown[]): void {
    this.formatMessage('warn', args);
  }

  error(...args: unknown[]): void {
    this.formatMessage('error', args);
=======
import { isProduction, isDevelopment } from "./env";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  route?: string;
  method?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string | Error, context?: LogContext) => void;
  performance: (
    message: string,
    startTime: number,
    context?: LogContext
  ) => void;
  apiCall: (
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ) => void;
}

class ProductionSafeLogger implements Logger {
  private shouldLog(level: LogLevel): boolean {
    // Always log errors and warnings in production for monitoring
    if (level === "error" || level === "warn") return true;

    // Only log info and debug in development or when debug is enabled
    return isDevelopment || process.env.NEXT_PUBLIC_DEBUG === "true";
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
      };
    }

    return entry;
  }

  private formatForConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;

    if (isDevelopment) {
      // Pretty formatting for development
      const contextStr = entry.context
        ? `\nContext: ${JSON.stringify(entry.context, null, 2)}`
        : "";
      const errorStr = entry.error
        ? `\nError: ${entry.error.name}: ${entry.error.message}\n${entry.error.stack || ""}`
        : "";

      switch (entry.level) {
        case "debug":
          console.debug(`${prefix} ${entry.message}${contextStr}${errorStr}`);
          break;
        case "info":
          console.info(`${prefix} ${entry.message}${contextStr}${errorStr}`);
          break;
        case "warn":
          console.warn(`${prefix} ${entry.message}${contextStr}${errorStr}`);
          break;
        case "error":
          console.error(`${prefix} ${entry.message}${contextStr}${errorStr}`);
          break;
      }
    } else {
      // Structured JSON logging for production
      const logData = {
        ...entry,
        service: "adventure-log",
        environment: process.env.NODE_ENV,
      };

      switch (entry.level) {
        case "debug":
          console.debug(JSON.stringify(logData));
          break;
        case "info":
          console.info(JSON.stringify(logData));
          break;
        case "warn":
          console.warn(JSON.stringify(logData));
          break;
        case "error":
          console.error(JSON.stringify(logData));
          break;
      }
    }
  }

  private logEntry(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    this.formatForConsole(entry);

    // In production, you might also send to external logging service
    if (isProduction && (entry.level === "error" || entry.level === "warn")) {
      this.sendToExternalLogger(entry);
    }
  }

  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    try {
      // Send to external logging service (e.g., Sentry, LogRocket, etc.)
      // This is a placeholder for actual implementation
      if (process.env.SLACK_WEBHOOK_URL && entry.level === "error") {
        await this.sendToSlack(entry);
      }
    } catch (error) {
      // Don't let logging errors crash the application
      console.error("Failed to send log to external service:", error);
    }
  }

  private async sendToSlack(entry: LogEntry): Promise<void> {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const payload = {
        text: `🚨 ${entry.level.toUpperCase()}: ${entry.message}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${entry.level.toUpperCase()}*: ${entry.message}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Time:* ${entry.timestamp} | *Service:* Adventure Log`,
              },
            ],
          },
        ],
      };

      if (entry.context) {
        payload.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Context:*\n\`\`\`${JSON.stringify(entry.context, null, 2)}\`\`\``,
          },
        });
      }

      if (entry.error) {
        payload.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Error:*\n\`\`\`${entry.error.name}: ${entry.error.message}\n${entry.error.stack || ""}\`\`\``,
          },
        });
      }

      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send to Slack:", error);
    }
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("debug", message, context);
    this.logEntry(entry);
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("info", message, context);
    this.logEntry(entry);
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("warn", message, context);
    this.logEntry(entry);
  }

  error(messageOrError: string | Error, context?: LogContext): void {
    let message: string;
    let error: Error | undefined;

    if (messageOrError instanceof Error) {
      message = messageOrError.message;
      error = messageOrError;
    } else {
      message = messageOrError;
    }

    const entry = this.createLogEntry("error", message, context, error);
    this.logEntry(entry);
  }

  performance(message: string, startTime: number, context?: LogContext): void {
    const duration = Date.now() - startTime;
    const enhancedContext = {
      ...context,
      duration,
      performance: true,
    };

    // Log as warning if slow (> 1 second)
    if (duration > 1000) {
      this.warn(`SLOW: ${message} (${duration}ms)`, enhancedContext);
    } else {
      this.info(`${message} (${duration}ms)`, enhancedContext);
    }
  }

  apiCall(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const enhancedContext = {
      ...context,
      method,
      route,
      statusCode,
      duration,
      apiCall: true,
    };

    const message = `${method} ${route} ${statusCode} (${duration}ms)`;

    if (statusCode >= 500) {
      this.error(message, enhancedContext);
    } else if (statusCode >= 400 || duration > 2000) {
      this.warn(message, enhancedContext);
    } else {
      this.info(message, enhancedContext);
    }
>>>>>>> oauth-upload-fixes
  }
}

// Export singleton logger instance
export const logger = new ProductionSafeLogger();

// Export type for components that need to accept a logger
<<<<<<< HEAD
export type { Logger };
=======
export type { Logger };
>>>>>>> oauth-upload-fixes
