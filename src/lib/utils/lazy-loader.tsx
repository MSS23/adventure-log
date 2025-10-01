'use client'

import React, { lazy, Suspense, ComponentType, ReactNode, useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Photo } from '@/types/database'

/**
 * Utility for creating lazy-loaded components with custom loading states
 */
export function createLazyComponent<P extends Record<string, unknown> = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  fallback?: ReactNode
): ComponentType<P> {
  const LazyComponent = lazy(async () => {
    const moduleImport = await importFn()
    return 'default' in moduleImport ? moduleImport : { default: moduleImport }
  })

  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={fallback || <Skeleton className="h-32" />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * HOC for making any component lazy-loadable
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode
) {
  return function LazyComponent(props: P) {
    return (
      <Suspense fallback={fallback || <Skeleton className="h-32" />}>
        <Component {...props} />
      </Suspense>
    )
  }
}

/**
 * Hook for conditionally lazy loading components
 */
export function useLazyComponent<P extends Record<string, unknown> = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  condition: boolean = true
) {
  if (!condition) {
    return null
  }

  return lazy(async () => {
    const moduleImport = await importFn()
    return 'default' in moduleImport ? moduleImport : { default: moduleImport }
  })
}

/**
 * Preload a component for better UX
 */
export function preloadComponent(importFn: () => Promise<unknown>) {
  if (typeof window !== 'undefined') {
    // Preload after a short delay to not block initial render
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preload attempts
      })
    }, 100)
  }
}

// Type definitions for lazy components
interface WeatherWidgetProps extends Record<string, unknown> {
  location: {
    latitude: number
    longitude: number
    name?: string
  }
  date: Date
  showDetails?: boolean
  className?: string
}

interface WeatherForecastProps extends Record<string, unknown> {
  location: {
    latitude: number
    longitude: number
    name?: string
  }
  days?: number
  detailed?: boolean
  className?: string
}

interface PhotoGridProps extends Record<string, unknown> {
  photos: Photo[]
  columns?: 2 | 3 | 4 | 5
  showCaptions?: boolean
  className?: string
  albumId?: string
  isOwner?: boolean
  currentCoverPhotoUrl?: string
  onCoverPhotoSet?: (photoUrl: string) => void
  onPhotosReorder?: (reorderedPhotos: Photo[]) => void
  allowReordering?: boolean
}

interface EnhancedGlobeProps {
  [key: string]: unknown // Generic props for globe component
}

interface AdvancedChartsProps extends Record<string, unknown> {
  data: Array<{ date: string; value: number; label?: string }>
  height?: number
  className?: string
  color?: string
  showDots?: boolean
  animated?: boolean
  showGrid?: boolean
  onPointClick?: (point: { date: string; value: number; label?: string }, index: number) => void
  onRangeSelect?: (startIndex: number, endIndex: number) => void
  selectable?: boolean
}

/**
 * Bundle splitting utility for creating separate chunks
 */
export const LazyComponents = {
  // Heavy UI components
  PhotoGrid: createLazyComponent<PhotoGridProps>(
    () => import('@/components/photos/PhotoGrid').then(mod => ({ default: mod.PhotoGrid })),
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  ),

  // Weather components (heavy API calls) - DISABLED: Components removed
  // WeatherWidget: createLazyComponent<WeatherWidgetProps>(
  //   () => import('@/components/weather/WeatherWidget').then(mod => ({ default: mod.WeatherWidget })),
  //   <Skeleton className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100" />
  // ),

  // WeatherForecast: createLazyComponent<WeatherForecastProps>(
  //   () => import('@/components/weather/WeatherForecast').then(mod => ({ default: mod.WeatherForecast })),
  //   <div className="space-y-2">
  //     <Skeleton className="h-8 w-32" />
  //     <Skeleton className="h-24" />
  //   </div>
  // ),

  // Globe components (heavy 3D rendering)
  EnhancedGlobe: createLazyComponent<EnhancedGlobeProps>(
    () => import('@/components/globe/EnhancedGlobe').then(mod => ({ default: mod.EnhancedGlobe })),
    <div className="h-96 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg flex items-center justify-center">
      <Skeleton className="h-8 w-48" />
    </div>
  ),

  // Charts and analytics (heavy data processing) - DISABLED: Component removed
  // AdvancedCharts: createLazyComponent<AdvancedChartsProps>(
  //   () => import('@/components/ui/advanced-charts').then(mod => ({ default: mod.LineChart })),
  //   <Skeleton className="h-64" />
  // ),

}

/**
 * Intersection Observer hook for lazy loading on scroll
 */
export function useIntersectionLazyLoad(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true)
        observer.disconnect()
      }
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref, options])

  return isIntersecting
}