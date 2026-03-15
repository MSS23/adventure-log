import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

// Check if building for mobile app
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
    // Optimize bundle size
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            // Globe visualization (large library)
            globe: {
              name: 'globe',
              test: /[\\/]node_modules[\\/](react-globe\.gl|globe\.gl|three)[\\/]/,
              chunks: 'all',
              priority: 30
            },
            // UI libraries
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/](@radix-ui|framer-motion)[\\/]/,
              chunks: 'all',
              priority: 25
            }
          }
        }
      }
    }

    return config;
  },

  // Headers for security and performance (disabled for mobile builds)
  ...(!isMobile && {
    async headers() {
      const securityHeaders = [
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

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
