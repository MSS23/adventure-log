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
  const { needsDecision, accept, reject } = useConsent()
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

  const visible = needsDecision || reopened
  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use essential cookies to keep you signed in. With your consent we also use
          privacy-friendly, cookieless analytics and error monitoring to improve the app.
          See our{' '}
          <Link href="/cookies" className="text-primary underline">Cookie Policy</Link>{' '}and{' '}
          <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
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
