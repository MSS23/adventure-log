'use client'

import { Toaster } from 'sonner'
import { useTheme } from '@/lib/contexts/ThemeContext'

export function ThemedToaster() {
  const { currentTheme } = useTheme()
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme={currentTheme}
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border shadow-lg',
        },
      }}
    />
  )
}
