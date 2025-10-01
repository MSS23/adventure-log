/**
 * Bundle Optimization Configuration for Adventure Log
 *
 * This file contains optimizations to reduce bundle sizes and improve loading performance
 */

// Critical components that should always be loaded immediately
export const CRITICAL_COMPONENTS = [
  'auth',
  'layout',
  'navigation',
  'error-boundary'
] as const

// Heavy components that should be lazy loaded
export const LAZY_LOAD_COMPONENTS = [
  'globe',
  'weather',
  'charts',
  'photo-grid',
  'social-feed',
  'analytics'
] as const

// Bundle size thresholds (in KB)
export const BUNDLE_SIZE_LIMITS = {
  // Maximum size for individual route bundles
  MAX_ROUTE_SIZE: 200, // 200KB target (down from 277KB)

  // Maximum size for shared chunks
  MAX_SHARED_CHUNK: 100, // 100KB

  // Warning threshold for large components
  COMPONENT_WARNING_SIZE: 50, // 50KB

  // Critical threshold that should trigger immediate optimization
  CRITICAL_SIZE: 300 // 300KB
} as const

// Components to split into separate chunks
export const CHUNK_STRATEGY = {
  // Vendor libraries that change infrequently
  vendor: [
    'react',
    'react-dom',
    'next',
    '@supabase/supabase-js'
  ],

  // UI components (shared across routes)
  ui: [
    '@radix-ui',
    'lucide-react',
    'framer-motion'
  ],

  // Heavy 3D and visualization libraries
  visualization: [
    'three',
    'globe.gl',
    'react-globe.gl'
  ],

  // Forms and validation
  forms: [
    'react-hook-form',
    '@hookform/resolvers',
    'zod'
  ],

  // Image processing and media
  media: [
    'sharp',
    'exifr'
  ]
} as const

// Route-specific optimization strategies
export const ROUTE_OPTIMIZATIONS = {
  // Landing page - minimal bundle
  '/': {
    maxSize: 50,
    preload: ['auth', 'navigation'],
    defer: ['analytics', 'social']
  },

  // Album detail page - optimize heavy components
  '/albums/[id]': {
    maxSize: 150, // Reduced from 277KB
    preload: ['auth', 'photos'],
    defer: ['weather', 'globe', 'analytics'],
    lazyLoad: ['WeatherWidget', 'WeatherForecast', 'PhotoGrid']
  },

  // Globe page - defer 3D rendering
  '/globe': {
    maxSize: 200,
    preload: ['auth', 'navigation'],
    defer: ['globe-rendering'],
    lazyLoad: ['EnhancedGlobe', 'GlobeControls']
  },

  // Dashboard - defer charts and analytics
  '/dashboard': {
    maxSize: 120,
    preload: ['auth', 'layout'],
    defer: ['charts', 'analytics'],
    lazyLoad: ['AdvancedCharts', 'TravelInsights']
  }
} as const

// Dynamic import helpers with error handling
export const dynamicImports = {
  /**
   * Import component with loading state and error boundary
   */
  withLoadingState: <T>(
    importFn: () => Promise<{ default: T }>,
    loadingComponent?: React.ComponentType,
    errorComponent?: React.ComponentType<{ error: Error }>
  ) => {
    return async () => {
      try {
        return await importFn()
      } catch (error) {
        console.warn('Failed to load component:', error)
        return {
          default: errorComponent || (() => null) as unknown as T
        }
      }
    }
  },

  /**
   * Preload component for better UX
   */
  preload: (importFn: () => Promise<unknown>) => {
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          importFn().catch(() => {}) // Silently fail
        })
      } else {
        setTimeout(() => {
          importFn().catch(() => {}) // Silently fail
        }, 100)
      }
    }
  }
}

// Performance monitoring helpers
export const bundlePerformance = {
  /**
   * Track bundle loading performance
   */
  trackLoadTime: (componentName: string, startTime: number) => {
    const loadTime = performance.now() - startTime

    if (loadTime > 1000) { // More than 1 second
      console.warn(`Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`)
    }

    // Report to analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      interface WindowWithGtag extends Window {
        gtag: (command: string, action: string, parameters: Record<string, unknown>) => void
      }
      (window as WindowWithGtag).gtag('event', 'bundle_load_time', {
        component_name: componentName,
        load_time: Math.round(loadTime),
        custom_metric: true
      })
    }
  },

  /**
   * Monitor bundle sizes in development
   */
  logBundleSize: (routeName: string, size: number) => {
    const limit = ROUTE_OPTIMIZATIONS[routeName as keyof typeof ROUTE_OPTIMIZATIONS]?.maxSize || BUNDLE_SIZE_LIMITS.MAX_ROUTE_SIZE

    if (size > limit) {
      console.warn(`Bundle size warning: ${routeName} is ${size}KB (limit: ${limit}KB)`)
    }
  }
}

// Webpack optimization hints for Next.js
export const webpackOptimizations = {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
        name: 'vendor',
        chunks: 'all',
        priority: 20
      },
      ui: {
        test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
        name: 'ui',
        chunks: 'all',
        priority: 15
      },
      visualization: {
        test: /[\\/]node_modules[\\/](three|globe\.gl|react-globe\.gl)[\\/]/,
        name: 'visualization',
        chunks: 'all',
        priority: 10
      },
      forms: {
        test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
        name: 'forms',
        chunks: 'all',
        priority: 10
      }
    }
  }
}