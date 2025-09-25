import type { NextConfig } from "next";
import path from "path";

// Check if building for mobile app
const isMobile = process.env.MOBILE_BUILD === 'true';

const nextConfig: NextConfig = {
  // Mobile builds use regular build with custom distDir
  ...(isMobile && {
    distDir: 'dist',
  }),

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // Clean experimental config for Vercel compatibility
  experimental: {
    // Remove optimizeCss to fix routes-manifest.json generation
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
        }
      ],
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 60,
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    }),
  },

  // Bundle optimization - simplified for Vercel compatibility
  webpack: (config) => {
    // Let Vercel handle optimization
    return config;
  },

  // Headers for security and performance (disabled for mobile builds)
  ...(!isMobile && {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            // Security headers
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
            },
          ],
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

export default nextConfig;
