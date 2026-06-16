'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CONSENT_CHANGED_EVENT,
  getStoredConsent,
  setConsent as persistConsent,
  type ConsentState,
} from '@/lib/consent'

interface UseConsent {
  /** null until the client has read storage (avoids SSR/first-paint mismatch). */
  consent: ConsentState | null
  /** True once we've read storage and the user has made no choice yet. */
  needsDecision: boolean
  analyticsAllowed: boolean
  accept: () => void
  reject: () => void
}

/** React access to the cookie-consent decision, reactive to changes. */
export function useConsent(): UseConsent {
  const [consent, setConsentState] = useState<ConsentState | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setConsentState(getStoredConsent())
    setHydrated(true)

    const onChange = () => setConsentState(getStoredConsent())
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const accept = useCallback(() => setConsentState(persistConsent(true)), [])
  const reject = useCallback(() => setConsentState(persistConsent(false)), [])

  return {
    consent,
    needsDecision: hydrated && consent === null,
    analyticsAllowed: consent?.analytics === true,
    accept,
    reject,
  }
}
