/**
 * Monitoring and Error Tracking Service
 *
 * Centralized monitoring, error tracking, and performance analytics
 */

// Types for monitoring data
export interface MonitoringErrorEvent {
  message: string
  stack?: string
  url?: string
  lineNumber?: number
  columnNumber?: number
  userId?: string
  userAgent?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, unknown>
  tags?: string[]
}

export interface PerformanceEvent {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: string
  url?: string
  userId?: string
  context?: Record<string, unknown>
}

export interface SecurityEvent {
  type: 'rate_limit' | 'suspicious_activity' | 'auth_failure' | 'upload_error'
  message: string
  ip?: string
  userAgent?: string
  path?: string
  userId?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, unknown>
}

export interface UserEvent {
  action: string
  category: 'navigation' | 'interaction' | 'feature_usage' | 'error'
  label?: string
  value?: number
  userId?: string
  sessionId?: string
  timestamp: string
  context?: Record<string, unknown>
}

// Configuration
const MONITORING_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  batchSize: 10,
  flushInterval: 5000, // 5 seconds
  maxRetries: 3,
  endpoints: {
    errors: '/api/monitoring/errors',
    performance: '/api/monitoring/performance',
    security: '/api/monitoring/security',
    analytics: '/api/monitoring/analytics',
  },
}

// Event queues for batching
const eventQueues = {
  errors: [] as MonitoringErrorEvent[],
  performance: [] as PerformanceEvent[],
  security: [] as SecurityEvent[],
  analytics: [] as UserEvent[],
}

/**
 * Monitoring Service Class
 */
class MonitoringService {
  private initialized = false
  private sessionId: string
  private userId?: string
  private flushInterval?: NodeJS.Timeout

  constructor() {
    this.sessionId = this.generateSessionId()
    this.init()
  }

  /**
   * Initialize monitoring service
   */
  private init(): void {
    if (this.initialized || !MONITORING_CONFIG.enabled) {
      return
    }

    // Set up error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this))
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))

      // Performance monitoring
      this.initPerformanceMonitoring()

      // Set up periodic flushing
      this.flushInterval = setInterval(() => {
        this.flushAllQueues()
      }, MONITORING_CONFIG.flushInterval)
    }

    this.initialized = true
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Set current user ID
   */
  setUserId(userId: string): void {
    this.userId = userId
  }

  /**
   * Handle global JavaScript errors
   */
  private handleGlobalError(event: globalThis.ErrorEvent): void {
    this.captureError({
      message: event.message,
      stack: event.error?.stack,
      url: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
      severity: 'high',
      timestamp: new Date().toISOString(),
      userId: this.userId,
      userAgent: navigator.userAgent,
      context: {
        sessionId: this.sessionId,
        url: window.location.href,
      },
    })
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.captureError({
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      severity: 'high',
      timestamp: new Date().toISOString(),
      userId: this.userId,
      userAgent: navigator.userAgent,
      context: {
        sessionId: this.sessionId,
        url: window.location.href,
        reason: event.reason,
      },
      tags: ['unhandled-promise'],
    })
  }

  /**
   * Initialize performance monitoring
   */
  private initPerformanceMonitoring(): void {
    // Monitor Web Vitals (temporarily disabled for deployment)
    // TODO: Re-enable web-vitals monitoring with correct API structure
    /*
    if (typeof window !== 'undefined') {
      import('web-vitals').then((webVitals) => {
        if (webVitals.onCLS) webVitals.onCLS(this.handleWebVital.bind(this))
        if (webVitals.onFID) webVitals.onFID(this.handleWebVital.bind(this))
        if (webVitals.onFCP) webVitals.onFCP(this.handleWebVital.bind(this))
        if (webVitals.onLCP) webVitals.onLCP(this.handleWebVital.bind(this))
        if (webVitals.onTTFB) webVitals.onTTFB(this.handleWebVital.bind(this))
      }).catch(() => {
        // Silently fail if web-vitals can't be loaded
      })
    }
    */

    // Monitor navigation timing
    if ('performance' in window && performance.navigation) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            this.capturePerformance({
              name: 'page_load_time',
              value: navigation.loadEventEnd - navigation.fetchStart,
              unit: 'ms',
              timestamp: new Date().toISOString(),
              userId: this.userId,
              url: window.location.href,
              context: {
                sessionId: this.sessionId,
                navigationTiming: {
                  dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                  tcp: navigation.connectEnd - navigation.connectStart,
                  request: navigation.responseStart - navigation.requestStart,
                  response: navigation.responseEnd - navigation.responseStart,
                  dom: navigation.domContentLoadedEventEnd - navigation.responseEnd,
                },
              },
            })
          }
        }, 1000)
      })
    }
  }

  /**
   * Handle Web Vitals metrics
   */
  private handleWebVital(metric: { name: string; value: number }): void {
    this.capturePerformance({
      name: metric.name.toLowerCase(),
      value: metric.value,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      userId: this.userId,
      url: window.location.href,
      context: {
        sessionId: this.sessionId,
      },
    })
  }

  /**
   * Capture error event
   */
  captureError(error: Omit<MonitoringErrorEvent, 'timestamp'> & { timestamp?: string }): void {
    if (!MONITORING_CONFIG.enabled) {
      console.error('Error captured:', error)
      return
    }

    const errorEvent: MonitoringErrorEvent = {
      ...error,
      timestamp: error.timestamp || new Date().toISOString(),
      userId: error.userId || this.userId,
      context: {
        sessionId: this.sessionId,
        ...error.context,
      },
    }

    eventQueues.errors.push(errorEvent)
    this.checkAndFlushQueue('errors')
  }

  /**
   * Capture performance event
   */
  capturePerformance(performance: Omit<PerformanceEvent, 'timestamp'> & { timestamp?: string }): void {
    if (!MONITORING_CONFIG.enabled) {
      return
    }

    const performanceEvent: PerformanceEvent = {
      ...performance,
      timestamp: performance.timestamp || new Date().toISOString(),
      userId: performance.userId || this.userId,
      context: {
        sessionId: this.sessionId,
        ...performance.context,
      },
    }

    eventQueues.performance.push(performanceEvent)
    this.checkAndFlushQueue('performance')
  }

  /**
   * Capture security event
   */
  captureSecurity(security: Omit<SecurityEvent, 'timestamp'> & { timestamp?: string }): void {
    if (!MONITORING_CONFIG.enabled) {
      console.warn('Security event:', security)
      return
    }

    const securityEvent: SecurityEvent = {
      ...security,
      timestamp: security.timestamp || new Date().toISOString(),
      userId: security.userId || this.userId,
    }

    eventQueues.security.push(securityEvent)
    this.checkAndFlushQueue('security')
  }

  /**
   * Capture user analytics event
   */
  captureAnalytics(analytics: Omit<UserEvent, 'timestamp' | 'sessionId'> & { timestamp?: string }): void {
    if (!MONITORING_CONFIG.enabled) {
      return
    }

    const analyticsEvent: UserEvent = {
      ...analytics,
      timestamp: analytics.timestamp || new Date().toISOString(),
      userId: analytics.userId || this.userId,
      sessionId: this.sessionId,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...analytics.context,
      },
    }

    eventQueues.analytics.push(analyticsEvent)
    this.checkAndFlushQueue('analytics')
  }

  /**
   * Check if queue should be flushed
   */
  private checkAndFlushQueue(queueName: keyof typeof eventQueues): void {
    if (eventQueues[queueName].length >= MONITORING_CONFIG.batchSize) {
      this.flushQueue(queueName)
    }
  }

  /**
   * Flush specific event queue
   */
  private async flushQueue(queueName: keyof typeof eventQueues): Promise<void> {
    const queue = eventQueues[queueName]
    if (queue.length === 0) {
      return
    }

    const events = queue.splice(0, MONITORING_CONFIG.batchSize)
    const endpoint = MONITORING_CONFIG.endpoints[queueName]

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })
    } catch (error) {
      // Re-add events to front of queue for retry with proper typing
      switch (queueName) {
        case 'errors':
          (eventQueues.errors as MonitoringErrorEvent[]).unshift(...(events as MonitoringErrorEvent[]))
          break
        case 'performance':
          (eventQueues.performance as PerformanceEvent[]).unshift(...(events as PerformanceEvent[]))
          break
        case 'security':
          (eventQueues.security as SecurityEvent[]).unshift(...(events as SecurityEvent[]))
          break
        case 'analytics':
          (eventQueues.analytics as UserEvent[]).unshift(...(events as UserEvent[]))
          break
      }
      console.error(`Failed to send ${queueName} events:`, error)
    }
  }

  /**
   * Flush all event queues
   */
  private async flushAllQueues(): Promise<void> {
    await Promise.all([
      this.flushQueue('errors'),
      this.flushQueue('performance'),
      this.flushQueue('security'),
      this.flushQueue('analytics'),
    ])
  }

  /**
   * Start timing operation
   */
  startTiming(name: string): () => void {
    const startTime = Date.now()

    return () => {
      const duration = Date.now() - startTime
      this.capturePerformance({
        name,
        value: duration,
        unit: 'ms',
        userId: this.userId,
        context: {
          sessionId: this.sessionId,
        },
      })
    }
  }

  /**
   * Measure function execution time
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const stopTiming = this.startTiming(name)
    try {
      const result = fn()
      if (result instanceof Promise) {
        return result.finally(stopTiming) as T
      }
      stopTiming()
      return result
    } catch (error) {
      stopTiming()
      this.captureError({
        message: `Function ${name} threw an error: ${error}`,
        severity: 'medium',
        context: {
          functionName: name,
          error: error instanceof Error ? error.stack : String(error),
        },
      })
      throw error
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    // Flush remaining events
    this.flushAllQueues()

    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError)
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    }

    this.initialized = false
  }
}

// Create singleton instance
const monitoringService = new MonitoringService()

// Export convenience functions
export const captureError = monitoringService.captureError.bind(monitoringService)
export const capturePerformance = monitoringService.capturePerformance.bind(monitoringService)
export const captureSecurity = monitoringService.captureSecurity.bind(monitoringService)
export const captureAnalytics = monitoringService.captureAnalytics.bind(monitoringService)
export const startTiming = monitoringService.startTiming.bind(monitoringService)
export const measureFunction = monitoringService.measureFunction.bind(monitoringService)
export const setUserId = monitoringService.setUserId.bind(monitoringService)

export default monitoringService