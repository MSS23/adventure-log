import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

// Check if building for mobile app.
//
// Mobile builds (Capacitor static export) are orchestrated by
// `scripts/mobile-build.mjs`, which:
//   1. Temporarily renames `src/app/api/**/route.ts`, server actions, OG image
//      routes, root middleware, and instrumentation to a `.mobile-skip`
//      extension so Next.js's `output: 'export'` mode never sees them
//      (project-wide static export refuses any server-runtime file).
//   2. Runs `next build` with `MOBILE_BUILD=true` so this file switches to
//      `output: 'export'` and writes static assets to `./out`.
//   3. Restores the renamed files on completion (even on failure).
//
// The mobile WebView calls back to the deployed web URL for `/api/*` via the
// `apiFetch()` helper in `src/lib/api/client.ts`. The deployed URL comes from
// `NEXT_PUBLIC_API_BASE_URL` at build time.
//
// Why not a per-route exclude or filesystem-isolated app dir? Next.js 15.x
// has no per-route `excludeFromExport` knob, and splitting into two project
// directories breaks shared imports between web and mobile UI. The rename
// trick keeps the source tree intact and the failure mode loud.
const isMobile = process.env.MOBILE_BUILD === 'true';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Mobile builds use static export for Capacitor
  ...(isMobile && {
    output: 'export',
    distDir: 'out',
  }),

  // Disable ESLint during builds (warnings treated as errors on Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Clean experimental config for Vercel compatibility
  experimental: {
    // Remove optimizeCss to fix routes-manifest.json generation
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
    ],
  },

  // Image optimization
  images: {
    ...(isMobile && {
      unoptimized: true, // Disable optimization for static export
    }),
    ...(!isMobile && {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'staticmap.openstreetmap.de',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'api.mapbox.com',
          port: '',
          pathname: '/**',
        }
      ],
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 60,
      deviceSizes: [640, 750, 828, 1080, 1200],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    }),
  },

  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Note: Clerk's internal server-action files (server-actions.js and
    // keyless-actions.js under @clerk/nextjs/dist/...) are stubbed at the
    // filesystem level by scripts/mobile-build.mjs during MOBILE_BUILD,
    // because Next.js's RSC compiler reads `'use server'` directives BEFORE
    // webpack alias resolution kicks in. A webpack alias here is too late.

    // Optimize bundle size
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Globe visualization (largest - Three.js + react-globe)
            globe: {
              name: 'globe',
              test: /[\\/]node_modules[\\/](react-globe\.gl|globe\.gl|three)[\\/]/,
              chunks: 'all',
              priority: 40,
              enforce: true
            },
            // Framer Motion - separate chunk, only loaded by pages that need it
            framerMotion: {
              name: 'framer-motion',
              test: /[\\/]node_modules[\\/](framer-motion|@motionone)[\\/]/,
              chunks: 'all',
              priority: 35,
              enforce: true
            },
            // Radix UI primitives
            radixUI: {
              name: 'radix-ui',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 30,
              enforce: true
            },
            // Mapbox - only loaded on map pages
            mapbox: {
              name: 'mapbox',
              test: /[\\/]node_modules[\\/](mapbox-gl|react-map-gl)[\\/]/,
              chunks: 'all',
              priority: 35,
              enforce: true
            },
            // Core vendor (Supabase, React Query, etc.)
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 10
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
              enforce: true
            },
          }
        }
      }
    }

    return config;
  },

  // Headers for security and performance (disabled for mobile builds)
  ...(!isMobile && {
    async headers() {
      // Content-Security-Policy (enforced). Origins cover Supabase, Vercel
      // Analytics, Sentry, Mapbox, OpenWeather and OSM/Nominatim.
      //
      // script-src: 'unsafe-inline' is still required (Next.js inline bootstrap
      // + the inline theme script in layout.tsx; a full nonce migration is a
      // separate follow-up). 'unsafe-eval' is only allowed in development —
      // Next.js dev/HMR needs it — and is dropped in production. We allow
      // 'wasm-unsafe-eval' in production so libraries that compile WebAssembly
      // keep working without re-enabling JS eval.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const isDev = process.env.NODE_ENV !== 'production'
      const scriptSrc = isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
        : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com"
      const csp = [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss: https://api.openweathermap.org https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://nominatim.openstreetmap.org https://*.ingest.sentry.io https://*.sentry.io https://va.vercel-scripts.com`,
        "worker-src 'self' blob:",
        "child-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')

      const securityHeaders = [
        {
          key: 'Content-Security-Policy',
          value: csp,
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
        },
      ]

      return [
        {
          // All routes except embed — deny framing
          source: '/((?!embed).*)',
          headers: [
            ...securityHeaders,
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
          ],
        },
        {
          // Embed routes — allow framing, keep other security headers
          source: '/embed/:path*',
          headers: securityHeaders,
        },
        {
          source: '/sw.js',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=0, must-revalidate',
            },
          ],
        },
        {
          source: '/manifest.json',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ];
    },

    // Redirects for SEO (disabled for mobile builds)
    async redirects() {
      return [
        {
          source: '/home',
          destination: '/',
          permanent: true,
        },
      ];
    },
  }),

  // Build tracing configuration (removed for flattened structure)
  // outputFileTracingRoot: Let Vercel auto-detect the correct root

  // Environment variables for build-time optimization
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },

  // Let Vercel handle build ID generation for proper deployment
};

// Sentry's Next.js wrapper injects server instrumentation hooks (request
// tracing, route handler wrappers, etc.) that assume a Node server is around
// to run them. In `output: 'export'` mode there isn't one, and the wrapper's
// instrumentation hook generation conflicts with the static exporter. Skip
// it for mobile builds — error reporting on the Capacitor app is handled
// client-side via `instrumentation-client` / sentry.client.config.
//
// Additionally: even on the web target, withSentryConfig pulls in
// @opentelemetry/* and Sentry instrumentation. When no Sentry env vars are
// configured (local dev with stub or missing .env.local, CI without Sentry
// secrets, freshly cloned trees), the wrapper still injects this code and
// the dev compile pipeline can race with chunk emission of the
// vendor-chunks/@opentelemetry.js file — leading to ENOENT on
// `routes-manifest.json` cascades that 500 every route.
//
// Make Sentry truly opt-in: only apply withSentryConfig when an actual DSN
// is present. Without a DSN, Sentry has nothing useful to do anyway.
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
);

const finalConfig = isMobile || !sentryEnabled
  ? withBundleAnalyzer(nextConfig)
  : withSentryConfig(withBundleAnalyzer(nextConfig), {
      // Suppresses source map upload logs during build
      silent: true,

      // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },

      // Automatically tree-shake Sentry debug statements to reduce bundle size
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
      },
    });

export default finalConfig;
