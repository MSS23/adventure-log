type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

class ProductionSafeLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === "true";

  private shouldLog(level: LogLevel): boolean {
    // Always log errors in production for debugging
    if (level === "error") return true;

    // Log warnings in production for monitoring
    if (level === "warn") return true;

    // Only log info and debug in development or when debug is enabled
    return this.isDevelopment || this.isDebugEnabled;
  }

  private formatMessage(level: LogLevel, args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case "debug":
        console.debug(prefix, ...args);
        break;
      case "info":
        console.info(prefix, ...args);
        break;
      case "warn":
        console.warn(prefix, ...args);
        break;
      case "error":
        console.error(prefix, ...args);
        break;
    }
  }

  debug(...args: unknown[]): void {
    this.formatMessage("debug", args);
  }

  info(...args: unknown[]): void {
    this.formatMessage("info", args);
  }

  warn(...args: unknown[]): void {
    this.formatMessage("warn", args);
  }

  error(...args: unknown[]): void {
    this.formatMessage("error", args);
  }
}

// Export singleton logger instance
export const logger = new ProductionSafeLogger();

// Export type for components that need to accept a logger
export type { Logger };
