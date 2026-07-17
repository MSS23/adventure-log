/**
 * Cookie/analytics consent — framework-agnostic core.
 *
 * GDPR/UK-GDPR posture: analytics + session replay are OFF until the user
 * opts in. Essential storage (session, theme, this consent choice itself) is
 * always allowed and is NOT represented here.
 *
 * This module has no React dependency so it can be read at module-init time
 * (e.g. in instrumentation-client.ts) as well as from hooks/components.
 */

export const CONSENT_STORAGE_KEY = 'adventure-log-consent'
export const CONSENT_CHANGED_EVENT = 'adventure-log-consent-changed'

export interface ConsentState {
  /** Aggregate, cookieless analytics + error-monitoring session replay. */
  analytics: boolean
  /** ISO timestamp of the decision, for audit/version purposes. */
  decidedAt: string
}

/** Returns the stored decision, or null if the user hasn't chosen yet. */
export function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.analytics !== 'boolean') return null
    return parsed as ConsentState
  } catch {
    return null
  }
}

/** True only when the user has explicitly opted in to analytics. */
export function hasAnalyticsConsent(): boolean {
  return getStoredConsent()?.analytics === true
}

/** Persist a decision and notify listeners in this tab. */
export function setConsent(analytics: boolean): ConsentState {
  const state: ConsentState = { analytics, decidedAt: new Date().toISOString() }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))
      document.documentElement.classList.add('consent-decided')
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: state }))
    } catch {
      // Storage blocked (private mode etc.) — treat as not-consented; nothing to do.
    }
  }
  return state
}

/** Re-open the banner so the user can change their mind. */
export function openConsentManager(): void {
  if (typeof window === 'undefined') return
  document.documentElement.classList.remove('consent-decided')
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { reopen: true } }))
}
