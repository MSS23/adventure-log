import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { PWAProvider } from "@/components/providers/pwa-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Adventure Log - Travel Journal & Social Platform",
  description:
    "Log your adventures, share with friends, and visualize your travels on an interactive 3D globe",
  keywords: [
    "travel",
    "journal",
    "social",
    "adventure",
    "photos",
    "globe",
    "PWA",
    "mobile",
  ],
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      {
        url: "/apple-touch-icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        url: "/apple-touch-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adventure Log",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Adventure Log",
    title: "Adventure Log - Travel Journal & Social Platform",
    description: "Log your adventures and share with friends",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adventure Log",
    description: "Log your adventures and share with friends",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Adventure Log",
    "application-name": "Adventure Log",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PWAProvider>
            <AuthProvider>
              <QueryProvider>
                <div className="min-h-screen bg-background">
                  <AppHeader />
                  <main>{children}</main>
                </div>
                <ToastProvider />
              </QueryProvider>
            </AuthProvider>
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
