'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, RefreshCw, Compass } from 'lucide-react'
import { log } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    log.error('Application error', { component: 'ErrorBoundary', action: 'unhandled-error' }, error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}
    >
      <div className="max-w-sm w-full text-center">
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: 'var(--color-forest)', boxShadow: '0 8px 24px rgba(74,93,35,0.28)' }}
        >
          <Compass className="h-7 w-7 text-white" />
        </div>

        <p className="al-eyebrow mb-3">Something went wrong</p>
        <h1 className="al-display text-2xl mb-2" style={{ color: 'var(--color-ink)' }}>
          We hit a detour
        </h1>
        <p className="al-body mb-8">
          An unexpected error came up. Try refreshing, or head back home.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            variant="coral"
            className="font-semibold h-11 px-5 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-xl h-11 px-5 cursor-pointer"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="al-caption mt-8">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
