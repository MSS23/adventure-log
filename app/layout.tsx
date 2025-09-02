import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { NavigationErrorBoundary } from "@/components/error-boundary";
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
  icons: {
    icon: "/favicon.ico",
    apple: [
      { url: "/icons/apple-icon-180x180.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
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

export const generateViewport = (): Viewport => ({
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
});

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
                  <NavigationErrorBoundary>
                    <AppHeader />
                  </NavigationErrorBoundary>
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
