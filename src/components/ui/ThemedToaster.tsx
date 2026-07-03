'use client'

import { Toaster } from 'sonner'

export function ThemedToaster() {
  // App is light-only (see ThemeContext) — pin the toaster to match.
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme="light"
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border shadow-lg',
        },
      }}
    />
  )
}
