'use client'

import { openConsentManager } from '@/lib/consent'

/** Re-opens the cookie-consent banner so users can change their choice. */
export function ManageCookiesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openConsentManager()}
      className={
        className ??
        'text-sm font-medium text-primary underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm'
      }
    >
      Manage cookie preferences
    </button>
  )
}
