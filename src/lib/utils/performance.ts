/**
 * Performance Utilities
 * Tools for optimizing Core Web Vitals, especially INP (Interaction to Next Paint)
 */

/**
 * Debounce function to limit execution rate
 * Useful for search inputs, resize handlers, scroll events
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to ensure function executes at most once per interval
 * Better for continuous events like scrolling or resizing
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Request Idle Callback polyfill for browsers that don't support it
 * Allows scheduling non-critical work during browser idle time
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => {
        const start = Date.now()
        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          })
        }, 1) as unknown as number
      }

/**
 * Cancel Idle Callback polyfill
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id)

/**
 * Break up long tasks by yielding to the main thread
 * Helps prevent INP issues by allowing browser to process user interactions
 */
export async function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Process array in chunks to avoid blocking main thread
 * Useful for large data transformations
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 50
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = chunk.map(processor)
    results.push(...chunkResults)

    // Yield to main thread after each chunk
    if (i + chunkSize < items.length) {
      await yieldToMain()
    }
  }

  return results
}

/**
 * Memoize expensive computations with cache expiry
 */
export function memoizeWithExpiry<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ttl: number = 5000
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>()

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value
    }

    const value = fn(...args) as ReturnType<T>
    cache.set(key, { value, timestamp: Date.now() })

    // Clean up old entries
    setTimeout(() => cache.delete(key), ttl)

    return value
  }) as T
}

/**
 * Observe and report slow interactions (INP issues)
 */
export function observeINP(callback: (duration: number, target: string) => void) {
  if (typeof window === 'undefined') return () => {}

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Report interactions slower than 200ms (INP "needs improvement" threshold)
      if (entry.duration > 200) {
        const target = (entry as PerformanceEventTiming).target
          ? (entry as PerformanceEventTiming).target?.toString() || 'unknown'
          : 'unknown'
        callback(entry.duration, target)
      }
    }
  })

  try {
    observer.observe({ type: 'event', buffered: true })
  } catch (e) {
    // Event timing not supported
    console.warn('Event timing not supported in this browser')
  }

  return () => observer.disconnect()
}

/**
 * Lazy load heavy components using Intersection Observer
 */
export function useLazyLoad(ref: React.RefObject<HTMLElement>, callback: () => void) {
  if (typeof window === 'undefined') return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback()
          observer.disconnect()
        }
      })
    },
    { rootMargin: '100px' }
  )

  if (ref.current) {
    observer.observe(ref.current)
  }

  return () => observer.disconnect()
}
