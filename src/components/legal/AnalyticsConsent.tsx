'use client'

import { Analytics } from '@vercel/analytics/react'
import { useConsent } from '@/lib/hooks/useConsent'
import { ConsentBanner } from './ConsentBanner'
import { GoogleAnalytics } from './GoogleAnalytics'

/**
 * Mounts analytics only after the user opts in, and renders the consent
 * banner. Keeps analytics off by default for GDPR/UK compliance.
 *
 * GoogleAnalytics is itself a no-op unless NEXT_PUBLIC_GA_MEASUREMENT_ID is
 * set and we're on the web target (not the static mobile bundle).
 */
export function AnalyticsConsent() {
  const { analyticsAllowed } = useConsent()
  return (
    <>
      {analyticsAllowed && <Analytics />}
      {analyticsAllowed && <GoogleAnalytics />}
      <ConsentBanner />
    </>
  )
}
