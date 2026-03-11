import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalAuthProvider } from "@/components/auth/ConditionalAuthProvider";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { validateEnv } from "@/lib/utils/env";
import { initializeEnvironmentValidation } from "@/lib/utils/environment-validator";
import { Analytics } from '@vercel/analytics/react';

// Validate environment variables at build/startup time
if (typeof window === 'undefined') {
  // Basic Zod validation for type safety
  validateEnv();
  // Comprehensive validation with production checks (exits on errors in prod)
  initializeEnvironmentValidation();
}

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Adventure Log - Your Travel Story",
    template: "%s | Adventure Log"
  },
  description: "Transform your journeys into beautiful, shareable stories with our social travel platform. Capture memories, share adventures, and discover amazing destinations.",
  keywords: [
    "travel",
    "adventure",
    "journeys",
    "travel blog",
    "social travel",
    "travel stories",
    "photo sharing",
    "destinations",
    "explore",
    "wanderlust",
    "travel community",
    "travel planning"
  ],
  authors: [{ name: "Adventure Log Team" }],
  creator: "Adventure Log",
  publisher: "Adventure Log",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://adventurelog.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Adventure Log - Your Travel Story',
    description: 'Transform your journeys into beautiful, shareable stories with our social travel platform. Capture memories, share adventures, and discover amazing destinations.',
    siteName: 'Adventure Log',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Adventure Log - Transform your journeys into beautiful stories',
        type: 'image/png',
      },
      {
        url: '/og-image-square.png',
        width: 1200,
        height: 1200,
        alt: 'Adventure Log - Social Travel Platform',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adventure Log - Your Travel Story',
    description: 'Transform your journeys into beautiful, shareable stories with our social travel platform.',
    site: '@adventurelog',
    creator: '@adventurelog',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_SITE_VERIFICATION,
  },
  category: 'travel',
  classification: 'Travel Social Platform',
  referrer: 'origin-when-cross-origin',
  manifest: '/api/manifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Adventure Log',
    startupImage: [
      {
        url: '/apple-touch-startup-image-768x1004.png',
        media: '(device-width: 768px) and (device-height: 1024px)',
      },
      {
        url: '/apple-touch-startup-image-1536x2008.png',
        media: '(device-width: 1536px) and (device-height: 2048px)',
      }
    ],
  },
  applicationName: 'Adventure Log',
  generator: 'Next.js',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Adventure Log',
    'msapplication-TileColor': '#D97706',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#FAFAF8',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1714' }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('adventure-log-theme');
                  var theme = stored || 'system';
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.add(resolved);
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${playfair.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider>
              <ToastProvider>
                <ConditionalAuthProvider>
                  <ServiceWorkerRegistration />
                  {children}
                  <Analytics />
                </ConditionalAuthProvider>
              </ToastProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
