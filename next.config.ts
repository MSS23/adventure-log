import path from "path";

import type { NextConfig } from "next";
import { isProduction } from "./src/env";

const nextConfig: NextConfig = {
  // Vercel deployment optimization
  output: "standalone",

  // Enhanced performance optimizations
  compiler: {
    removeConsole: isProduction,
    // Remove React DevTools in production
    reactRemoveProperties: isProduction,
  },

  // Progressive Web App optimizations
  experimental: {
    // optimizeCss is now default in production
    scrollRestoration: true,
    // TODO: Runtime environment configuration - only expose safe public keys
    // runtimeEnv: {
    //   // Client-side environment variables (safe to expose)
    //   NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    //   NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    //   NEXT_PUBLIC_SUPABASE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
    //   NEXT_PUBLIC_PWA_ENABLED: process.env.NEXT_PUBLIC_PWA_ENABLED,
    //   NEXT_PUBLIC_IS_MOBILE: process.env.NEXT_PUBLIC_IS_MOBILE,
    //   NODE_ENV: process.env.NODE_ENV,
    // },
  },

  // Image optimization for mobile and Vercel
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ["supabase.co", "googleusercontent.com", "vercel-storage.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "**",
      },
    ],
  },

  // Mobile-optimized bundling (swcMinify removed as default in Next.js 15)
  poweredByHeader: false,
  generateEtags: true,

  // Headers for PWA and security (Phase 9.1 - Security headers & CSP)
  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), xr-spatial-tracking=(), gyroscope=(), magnetometer=(), accelerometer=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://ssl.gstatic.com https://www.google.com https://vercel.live",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://vercel.com https://www.google.com https://maps.gstatic.com",
          "media-src 'self' blob: https://*.supabase.co",
          "connect-src 'self' https://api.github.com https://*.supabase.co https://accounts.google.com https://www.googleapis.com https://vercel.live wss://vercel.live",
          "worker-src 'self' blob:",
          "child-src 'self' blob:",
          "frame-src 'self' https://accounts.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "X-PWA-Version",
            value: "2.3.0",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
          {
            key: "X-Icon-Version",
            value: "2.3.0",
          },
        ],
      },
      {
        source: "/((?!api).*)",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Rewrites for PWA functionality
  async rewrites() {
    return [
      {
        source: "/sw.js",
        destination: "/sw.js",
      },
    ];
  },

  // Turbopack for development speed
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Webpack optimizations for mobile
  webpack: (config, { dev, isServer }) => {
    // Optimize for mobile bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: "vendor",
            chunks: "all",
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: "common",
            chunks: "all",
            minChunks: 2,
            priority: 10,
          },
        },
      };
    }

    // Performance optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    return config;
  },

  // TypeScript optimization
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint optimization - only ignore in development
  eslint: {
    ignoreDuringBuilds: !isProduction,
  },
};

export default nextConfig;
