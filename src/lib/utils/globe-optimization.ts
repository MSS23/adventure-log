/**
 * Globe Performance Optimization Utilities
 *
 * This module provides performance optimizations for the 3D globe visualization:
 * - Data chunking and pagination for large datasets
 * - Memoization helpers for expensive computations
 * - Throttling/debouncing for event handlers
 * - Memory management for Three.js objects
 */

import { useCallback, useRef, useEffect, useMemo } from 'react'
import { log } from './logger'

/**
 * Chunk large arrays for progressive rendering
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Debounce function calls to improve performance
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
 * Throttle function calls to limit execution rate
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * React hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

/**
 * React hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastRan = useRef<number>(Date.now())

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRan.current >= limit) {
      callback(...args)
      lastRan.current = now
    }
  }, [callback, limit])
}

/**
 * Filter locations by viewport bounds to reduce rendering load
 */
export interface ViewportBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface GlobeLocation {
  latitude: number
  longitude: number
  id: string
}

export function filterLocationsByViewport<T extends GlobeLocation>(
  locations: T[],
  bounds: ViewportBounds,
  padding: number = 10
): T[] {
  const { north, south, east, west } = bounds

  return locations.filter(loc => {
    const lat = loc.latitude
    const lng = loc.longitude

    // Add padding to bounds
    const paddedNorth = Math.min(90, north + padding)
    const paddedSouth = Math.max(-90, south - padding)

    // Check if location is within padded bounds
    const withinLat = lat >= paddedSouth && lat <= paddedNorth

    // Handle longitude wrapping
    let withinLng: boolean
    if (west <= east) {
      withinLng = lng >= west - padding && lng <= east + padding
    } else {
      // Bounds cross the 180/-180 meridian
      withinLng = lng >= west - padding || lng <= east + padding
    }

    return withinLat && withinLng
  })
}

/**
 * Level of Detail (LOD) system for globe markers
 * Returns different detail levels based on camera altitude
 */
export type LODLevel = 'high' | 'medium' | 'low' | 'minimal'

export function getLODLevel(altitude: number): LODLevel {
  if (altitude < 1.5) return 'high'
  if (altitude < 2.5) return 'medium'
  if (altitude < 4) return 'low'
  return 'minimal'
}

/**
 * Subsample locations based on LOD to reduce marker count
 */
export function subsampleLocations<T extends GlobeLocation>(
  locations: T[],
  lodLevel: LODLevel
): T[] {
  const sampleRates: Record<LODLevel, number> = {
    high: 1,      // Show all
    medium: 0.7,  // Show 70%
    low: 0.4,     // Show 40%
    minimal: 0.2  // Show 20%
  }

  const rate = sampleRates[lodLevel]
  if (rate === 1) return locations

  const targetCount = Math.ceil(locations.length * rate)
  const step = Math.floor(locations.length / targetCount)

  return locations.filter((_, index) => index % step === 0).slice(0, targetCount)
}

/**
 * Calculate appropriate marker size based on altitude
 */
export function getMarkerSize(altitude: number, baseSize: number = 0.3): number {
  if (altitude < 1.5) return baseSize
  if (altitude < 2.5) return baseSize * 0.8
  if (altitude < 4) return baseSize * 0.6
  return baseSize * 0.4
}

/**
 * Memory-efficient HTML element pool for globe markers
 */
export class HTMLElementPool {
  private pool: HTMLElement[] = []
  private createElement: () => HTMLElement
  private maxSize: number

  constructor(createElement: () => HTMLElement, maxSize: number = 1000) {
    this.createElement = createElement
    this.maxSize = maxSize
  }

  acquire(): HTMLElement {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createElement()
  }

  release(element: HTMLElement): void {
    if (this.pool.length < this.maxSize) {
      // Reset element state before returning to pool
      element.innerHTML = ''
      element.className = ''
      element.style.cssText = ''
      this.pool.push(element)
    }
  }

  clear(): void {
    this.pool = []
  }

  get size(): number {
    return this.pool.length
  }
}

/**
 * Batch updates for better performance
 */
export class BatchUpdater<T> {
  private updates: T[] = []
  private timeout: NodeJS.Timeout | null = null
  private callback: (updates: T[]) => void
  private delay: number

  constructor(callback: (updates: T[]) => void, delay: number = 100) {
    this.callback = callback
    this.delay = delay
  }

  add(update: T): void {
    this.updates.push(update)

    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      this.flush()
    }, this.delay)
  }

  flush(): void {
    if (this.updates.length > 0) {
      this.callback([...this.updates])
      this.updates = []
    }

    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  clear(): void {
    this.updates = []
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }
}

/**
 * Hook for progressive data loading
 */
export function useProgressiveLoading<T>(
  data: T[],
  chunkSize: number = 50,
  delay: number = 100
): T[] {
  const [visibleData, setVisibleData] = React.useState<T[]>([])
  const currentChunkRef = useRef(0)

  useEffect(() => {
    setVisibleData([])
    currentChunkRef.current = 0

    const chunks = chunkArray(data, chunkSize)

    const loadNextChunk = () => {
      if (currentChunkRef.current < chunks.length) {
        setVisibleData(prev => [...prev, ...chunks[currentChunkRef.current]])
        currentChunkRef.current++

        if (currentChunkRef.current < chunks.length) {
          setTimeout(loadNextChunk, delay)
        }
      }
    }

    loadNextChunk()

    return () => {
      currentChunkRef.current = chunks.length // Stop loading
    }
  }, [data, chunkSize, delay])

  return visibleData
}

// Import React for the hook
import React from 'react'

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()

  start(label: string): void {
    this.marks.set(label, performance.now())
  }

  end(label: string, logLevel: 'debug' | 'info' | 'warn' = 'debug'): number {
    const startTime = this.marks.get(label)
    if (!startTime) {
      log.warn('Performance mark not found', { label })
      return 0
    }

    const duration = performance.now() - startTime
    this.marks.delete(label)

    log[logLevel](`Performance: ${label}`, {
      component: 'PerformanceMonitor',
      duration: `${duration.toFixed(2)}ms`
    })

    return duration
  }

  clear(): void {
    this.marks.clear()
  }
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args) as ReturnType<T>
    cache.set(key, result)

    // Limit cache size to prevent memory leaks
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value as string
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }

    return result
  }) as T
}

/**
 * Optimize globe texture quality based on device capabilities
 */
export function getOptimalGlobeTexture(): {
  atmosphereColor: string
  atmosphereAltitude: number
  globeImageUrl: string | undefined
  bumpImageUrl: string | undefined
} {
  // Check device capabilities
  const isLowEndDevice = () => {
    // Check if device has limited memory
    const nav = navigator as Navigator & { deviceMemory?: number }
    if (nav.deviceMemory && nav.deviceMemory < 4) return true

    // Check if mobile
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return true
    }

    return false
  }

  if (isLowEndDevice()) {
    return {
      atmosphereColor: 'lightskyblue',
      atmosphereAltitude: 0.15,
      globeImageUrl: undefined, // Use default solid color
      bumpImageUrl: undefined
    }
  }

  return {
    atmosphereColor: 'lightskyblue',
    atmosphereAltitude: 0.25,
    globeImageUrl: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg' as string | undefined,
    bumpImageUrl: '//unpkg.com/three-globe/example/img/earth-topology.png' as string | undefined
  }
}
