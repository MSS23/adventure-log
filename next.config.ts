import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel deployment optimization
  output: "standalone",

  // Enhanced performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === "production",
  },

  // Progressive Web App optimizations
  experimental: {
    // optimizeCss is now default in production
    scrollRestoration: true,
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

  // Headers for PWA and security
  async headers() {
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
            value: "public, max-age=300, must-revalidate",
          },
          {
            key: "X-PWA-Version",
            value: "2.1.0",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        source: "/((?!api).*)",
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
            key: "X-XSS-Protection",
            value: "1; mode=block",
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
    ignoreDuringBuilds: process.env.NODE_ENV !== "production",
  },

  // Environment variables for mobile
  env: {
    NEXT_PUBLIC_IS_MOBILE: process.env.NEXT_PUBLIC_IS_MOBILE || "auto",
    NEXT_PUBLIC_PWA_ENABLED: "true",
  },
};

export default nextConfig;
