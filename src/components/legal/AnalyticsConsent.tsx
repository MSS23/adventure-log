'use client'

import { Analytics } from '@vercel/analytics/react'
import { useConsent } from '@/lib/hooks/useConsent'
import { ConsentBanner } from './ConsentBanner'

/**
 * Mounts Vercel Web Analytics only after the user opts in, and renders the
 * consent banner. Keeps analytics off by default for GDPR/UK compliance.
 */
export function AnalyticsConsent() {
  const { analyticsAllowed } = useConsent()
  return (
    <>
      {analyticsAllowed && <Analytics />}
      <ConsentBanner />
    </>
  )
}
