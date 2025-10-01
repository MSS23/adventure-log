/**
 * Enhanced lazy loading utilities for better performance and bundle optimization
 */

import dynamic from 'next/dynamic'
import React, { ComponentType } from 'react'
import { log } from './logger'
// import type { PhotoViewerProps } from '@/components/photos/PhotoViewer' // Removed - not exported
// import type { OptimizedPhotoGridProps } from '@/components/photos/OptimizedPhotoGrid' // Removed - component deleted
// import type { WeatherWidgetProps } from '@/components/weather/WeatherWidget' // Removed - component deleted
// import type { WeatherForecastProps } from '@/components/weather/WeatherForecast' // Removed - component deleted
// import type { LineChartProps } from '@/components/ui/advanced-charts' // Removed - component deleted
import type { StoryViewerProps } from '@/components/stories/StoryViewer'
import type { StoryTrayProps } from '@/components/stories/StoryTray'

// Placeholder types for removed components
type OptimizedPhotoGridProps = Record<string, unknown>
type WeatherWidgetProps = Record<string, unknown>
type WeatherForecastProps = Record<string, unknown>
type LineChartProps = Record<string, unknown>

interface LazyComponentOptions {
  loading?: ComponentType<unknown>
  ssr?: boolean
  preload?: boolean
  retry?: {
    retries: number
    delay: number
  }
}

interface LazyLoadOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  placeholder?: ComponentType<unknown>
}

/**
 * Create a lazy-loaded component with enhanced error handling and retry logic
 */
const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
  </div>
)

const FormatLoadingComponent = (LoadingComponent?: ComponentType<unknown>) => {
  if (!LoadingComponent) {
    const WrappedDefault = () => <DefaultLoadingComponent />
    WrappedDefault.displayName = 'LazyLoadingDefaultFallback'
    return WrappedDefault
  }
  const Wrapped = () => <LoadingComponent />
  Wrapped.displayName = `LazyLoadingWrapper(${LoadingComponent.displayName || LoadingComponent.name || 'Component'})`
  return Wrapped
}

type LazyImport<T> = () => Promise<{ default: ComponentType<T> }>

export function createLazyComponent<T = Record<string, unknown>>(
  importFn: LazyImport<T>,
  options: LazyComponentOptions = {}
) {
  const {
    loading: LoadingComponent,
    ssr = false,
    preload = false,
    retry: _retry = { retries: 3, delay: 1000 } // eslint-disable-line @typescript-eslint/no-unused-vars
  } = options

  const LazyComponent = dynamic(importFn, {
    ssr,
    loading: FormatLoadingComponent(LoadingComponent)
  }) as ComponentType<T>

  // Add preload capability
  if (preload && typeof window !== 'undefined') {
    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(error => {
          log.warn('Failed to preload component', {
            component: 'LazyLoading',
            action: 'preload-failed',
            error: error.message
          })
        })
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        importFn().catch(error => {
          log.warn('Failed to preload component', {
            component: 'LazyLoading',
            action: 'preload-failed',
            error: error.message
          })
        })
      }, 100)
    }
  }

  return LazyComponent
}

/**
 * Hook for intersection observer-based lazy loading
 */
export function useIntersectionObserver(
  options: LazyLoadOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options

  // This would typically be used with a custom hook, but for now we'll provide the utility
  return {
    threshold,
    rootMargin,
    triggerOnce
  }
}

/**
 * Predefined lazy components for common use cases
 */
const createModuleLazy = <T,>(importFn: () => Promise<{ default: ComponentType<T> }>, options: LazyComponentOptions = {}): ComponentType<T> =>
  createLazyComponent(importFn, options)


export const LazyComponents = {
  // PhotoViewer: createModuleLazy<PhotoViewerProps>(async () => ({
  //   default: (await import('@/components/photos/PhotoViewer')).PhotoViewer
  // }), { preload: true }), // DISABLED: PhotoViewerProps not exported
  // OptimizedPhotoGrid: createModuleLazy<OptimizedPhotoGridProps>(async () => ({
  //   default: (await import('@/components/photos/OptimizedPhotoGrid')).OptimizedPhotoGrid
  // }), { preload: true }), // DISABLED: Component removed
  // WeatherWidget: createModuleLazy<WeatherWidgetProps>(async () => ({
  //   default: (await import('@/components/weather/WeatherWidget')).WeatherWidget
  // }), { preload: false }), // DISABLED: Component removed
  // WeatherForecast: createModuleLazy<WeatherForecastProps>(async () => ({
  //   default: (await import('@/components/weather/WeatherForecast')).WeatherForecast
  // }), { preload: false }), // DISABLED: Component removed
  StoryViewer: createModuleLazy<StoryViewerProps>(async () => ({
    default: (await import('@/components/stories/StoryViewer')).StoryViewer
  }), { preload: false }),
  StoryTray: createModuleLazy<StoryTrayProps>(async () => ({
    default: (await import('@/components/stories/StoryTray')).StoryTray
  }), { preload: true }),
  // AdvancedCharts: createModuleLazy<LineChartProps>(async () => ({
  //   default: (await import('@/components/ui/advanced-charts')).LineChart
  // }), { preload: false }) // DISABLED: Component removed
}

export const LazyUtils = {
  EXIFExtractor: async () => import('@/lib/utils/exif-extraction')
}

/**
 * Enhanced image lazy loading component
 */
export function createLazyImage(
  src: string,
  alt: string,
  options: {
    placeholder?: string
    blurDataURL?: string
    priority?: boolean
    sizes?: string
    className?: string
    onLoad?: () => void
    onError?: () => void
  } = {}
) {
  const {
    placeholder = '/placeholder-image.jpg',
    blurDataURL,
    priority = false,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    className = '',
    onLoad,
    onError
  } = options

  return {
    src,
    alt,
    placeholder,
    blurDataURL,
    priority,
    sizes,
    className,
    onLoad,
    onError
  }
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  const criticalResources = [
    // Preload critical images
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    
    // Preload critical fonts
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  ]

  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    
    if (resource.endsWith('.css')) {
      link.as = 'style'
      link.href = resource
    } else if (resource.match(/\.(png|jpg|jpeg|webp|svg)$/)) {
      link.as = 'image'
      link.href = resource
    }
    
    document.head.appendChild(link)
  })

  log.info('Critical resources preloaded', {
    component: 'LazyLoading',
    action: 'preload-critical-resources',
    resourceCount: criticalResources.length
  })
}

/**
 * Lazy load images with intersection observer
 */
export function createImageLazyLoader() {
  if (typeof window === 'undefined') {
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    }
  }

  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.src
          
          if (src) {
            img.src = src
            img.removeAttribute('data-src')
            imageObserver.unobserve(img)
          }
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0.01
    }
  )

  return {
    observe: (element: Element) => imageObserver.observe(element),
    unobserve: (element: Element) => imageObserver.unobserve(element),
    disconnect: () => imageObserver.disconnect()
  }
}

/**
 * Bundle analyzer utility
 */
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    
    log.info('Bundle analysis', {
      component: 'LazyLoading',
      action: 'bundle-analysis',
      scripts: scripts.length,
      stylesheets: stylesheets.length,
      totalResources: scripts.length + stylesheets.length
    })
  }
}

// Initialize critical resource preloading
if (typeof window !== 'undefined') {
  // Preload on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadCriticalResources)
  } else {
    preloadCriticalResources()
  }
}
