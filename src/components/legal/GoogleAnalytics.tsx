'use client'

import Script from 'next/script'
import { isNativePlatform } from '@/lib/api/client'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/**
 * Google Analytics 4 — consent-gated and WEB-ONLY.
 *
 * - No-op unless NEXT_PUBLIC_GA_MEASUREMENT_ID is configured, so the build
 *   stays clean until you provide a Measurement ID (G-XXXXXXXXXX).
 * - The caller must only mount this AFTER the user opts in to analytics
 *   (see AnalyticsConsent) — keeps us PECR/UK-GDPR compliant.
 * - Never loads inside the native/static Capacitor mobile bundle. Analytics
 *   belongs on the server-hosted web target, not the offline mobile shell.
 * - anonymize_ip + no Google signals / ad personalisation = privacy-first.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null
  if (isNativePlatform()) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  )
}
