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
    <div className="min-h-screen bg-[#FAF7F1] dark:bg-black flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {/* Logo */}
        <div className="w-14 h-14 bg-olive-700 rounded-2xl flex items-center justify-center shadow-lg shadow-olive-700/20 mx-auto mb-6">
          <Compass className="h-7 w-7 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-olive-950 dark:text-olive-50 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-olive-600 dark:text-olive-400 mb-8">
          We hit an unexpected error. Try refreshing, or head back home.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20 h-11 px-5"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="rounded-xl h-11 px-5 border-olive-200 dark:border-white/[0.1] text-olive-700 dark:text-olive-300">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="text-[11px] text-stone-400 dark:text-stone-600 mt-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
