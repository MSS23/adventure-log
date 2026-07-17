'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useConsent } from '@/lib/hooks/useConsent'
import { CONSENT_CHANGED_EVENT } from '@/lib/consent'
import { Button } from '@/components/ui/button'

/**
 * GDPR/UK cookie-consent banner. Shown on first visit (no decision yet) and
 * whenever the user re-opens it via "Manage cookies". Analytics + Sentry replay
 * stay off until the user accepts here.
 */
export function ConsentBanner() {
  const { consent, needsDecision, accept, reject } = useConsent()
  const [reopened, setReopened] = useState(false)

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.reopen) setReopened(true)
      else setReopened(false)
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
  }, [])

  // Render the first-visit banner in the server HTML so it is present at the
  // first paint. Returning null until React hydrates caused the late fixed
  // overlay to invalidate LCP on every public entry page. Visitors who have
  // already decided get the same DOM during hydration, but the tiny head
  // script in app/layout.tsx hides it before paint via `consent-decided`.
  const visible = consent === null || needsDecision || reopened
  if (!visible) return null

  return (
    <div
      id="cookie-consent-banner"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg sm:flex-row sm:items-center sm:gap-4">
        <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
          Essential storage keeps you signed in. Optional analytics only runs with your consent.{' '}
          <Link href="/cookies" className="text-primary underline">Cookie settings</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reject()
              setReopened(false)
            }}
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => {
              accept()
              setReopened(false)
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
