/**
 * Performance Monitoring for Adventure Log
 *
 * Web Vitals tracking, bundle analysis, and performance optimization utilities
 */

'use client'

import { useEffect, useCallback } from 'react'

// Web Vitals types
interface WebVitalsMetric {
  id: string
  name: string
  value: number
  delta: number
  navigationType?: string
  entries?: PerformanceEntry[]
}

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  // Sample rate for performance monitoring (10% in production)
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Web Vitals thresholds
  thresholds: {
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FID: { good: 100, needsImprovement: 300 },
    FCP: { good: 1800, needsImprovement: 3000 },
    LCP: { good: 2500, needsImprovement: 4000 },
    TTFB: { good: 800, needsImprovement: 1800 },
    INP: { good: 200, needsImprovement: 500 }
  },

  // Performance API endpoints
  endpoints: {
    webVitals: '/api/monitoring/web-vitals',
    performance: '/api/monitoring/performance',
    errors: '/api/monitoring/errors'
  }
}

/**
 * Get performance rating based on thresholds
 */
function getPerformanceRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_CONFIG.thresholds[name as keyof typeof PERFORMANCE_CONFIG.thresholds]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

/**
 * Send metric to analytics endpoint
 */
async function sendMetric(metric: WebVitalsMetric & { rating: string }) {
  // Only send if we're in the sample
  if (Math.random() > PERFORMANCE_CONFIG.sampleRate) return

  try {
    await fetch(PERFORMANCE_CONFIG.endpoints.webVitals, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metric,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: getSessionId()
      })
    })
  } catch (error) {
    // Silently fail - don't block the user experience
    console.debug('Failed to send performance metric:', error)
  }
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('perf-session-id')
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('perf-session-id', sessionId)
  }
  return sessionId
}

/**
 * Web Vitals monitoring hook
 */
export function useWebVitals() {
  const reportWebVital = useCallback((metric: WebVitalsMetric) => {
    const rating = getPerformanceRating(metric.name, metric.value)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${metric.name}:`, metric.value, `(${rating})`)
    }

    // Send to analytics
    sendMetric({ ...metric, rating })
  }, [])

  useEffect(() => {
    // Dynamic import of web-vitals to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportWebVital)
      onFCP(reportWebVital)
      onLCP(reportWebVital)
      onTTFB(reportWebVital)
      onINP(reportWebVital)
    }).catch(() => {
      // web-vitals not available, continue without monitoring
    })
  }, [reportWebVital])
}

/**
 * Performance observer for custom metrics
 */
export function usePerformanceObserver() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    // Observe navigation timing
    const navObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming

          // Calculate custom metrics
          const metrics = {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            domComplete: navEntry.domComplete - navEntry.fetchStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstByte: navEntry.responseStart - navEntry.requestStart,
            domInteractive: navEntry.domInteractive - navEntry.fetchStart
          }

          // Log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('📊 Navigation Timing:', metrics)
          }

          // Send to analytics
          fetch(PERFORMANCE_CONFIG.endpoints.performance, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'navigation',
              metrics,
              url: window.location.href,
              timestamp: Date.now()
            })
          }).catch(() => {
            // Silently fail
          })
        }
      })
    })

    try {
      navObserver.observe({ entryTypes: ['navigation'] })
    } catch {
      // PerformanceObserver not supported
    }

    // Observe resource timing for large assets
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming

          // Monitor large assets (> 500KB)
          if (resourceEntry.transferSize > 500 * 1024) {
            console.warn(`⚠️ Large asset detected: ${resourceEntry.name} (${Math.round(resourceEntry.transferSize / 1024)}KB)`)

            // Send large asset warning
            fetch(PERFORMANCE_CONFIG.endpoints.performance, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'large-asset',
                url: resourceEntry.name,
                size: resourceEntry.transferSize,
                duration: resourceEntry.duration,
                timestamp: Date.now()
              })
            }).catch(() => {
              // Silently fail
            })
          }
        }
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
    } catch {
      // PerformanceObserver not supported
    }

    return () => {
      navObserver.disconnect()
      resourceObserver.disconnect()
    }
  }, [])
}

/**
 * Bundle size analyzer
 */
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return

  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))

  const bundleInfo = {
    scripts: scripts.length,
    styles: styles.length,
    scriptUrls: scripts.map(s => (s as HTMLScriptElement).src),
    styleUrls: styles.map(s => (s as HTMLLinkElement).href)
  }

  // Log bundle info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Bundle Analysis:', bundleInfo)
  }

  return bundleInfo
}

/**
 * Performance monitoring React component
 */
export function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  useWebVitals()
  usePerformanceObserver()

  useEffect(() => {
    // Analyze bundle on first load
    setTimeout(() => {
      analyzeBundleSize()
    }, 1000)
  }, [])

  return <>{children}</>
}

/**
 * High-order component for performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    useEffect(() => {
      const startTime = performance.now()

      return () => {
        const renderTime = performance.now() - startTime

        // Log slow renders
        if (renderTime > 100) {
          console.warn(`⚠️ Slow render detected: ${componentName || Component.name} took ${renderTime.toFixed(2)}ms`)
        }

        // Send render performance data
        if (Math.random() < PERFORMANCE_CONFIG.sampleRate) {
          fetch(PERFORMANCE_CONFIG.endpoints.performance, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'component-render',
              component: componentName || Component.name,
              renderTime,
              timestamp: Date.now()
            })
          }).catch(() => {
            // Silently fail
          })
        }
      }
    })

    return <Component {...props} />
  }

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName || Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Custom hook for measuring performance
 */
export function usePerformanceMeasure(name: string) {
  const startMeasure = useCallback(() => {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`)
    }
  }, [name])

  const endMeasure = useCallback(() => {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)

      const entries = performance.getEntriesByName(name, 'measure')
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration

        if (process.env.NODE_ENV === 'development') {
          console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
        }

        return duration
      }
    }
    return 0
  }, [name])

  return { startMeasure, endMeasure }
}

/**
 * Memory usage monitoring
 */
export function useMemoryMonitoring() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return
    }

    const checkMemory = () => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
      if (memory) {
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
        const totalMB = Math.round(memory.totalJSHeapSize / 1048576)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576)

        // Warn if memory usage is high
        if (usedMB > limitMB * 0.8) {
          console.warn(`⚠️ High memory usage: ${usedMB}MB / ${limitMB}MB`)
        }

        return { used: usedMB, total: totalMB, limit: limitMB }
      }
    }

    // Check memory every 30 seconds
    const interval = setInterval(checkMemory, 30000)

    return () => clearInterval(interval)
  }, [])
}