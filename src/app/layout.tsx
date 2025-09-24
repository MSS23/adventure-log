import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalAuthProvider } from "@/components/auth/ConditionalAuthProvider";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  manifest: '/manifest.json',
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
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#ffffff',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ConditionalAuthProvider>
            {children}
          </ConditionalAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
