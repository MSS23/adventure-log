'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RefreshCw, Home } from 'lucide-react'
import { log } from '@/lib/utils/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    log.error('Settings error', { component: 'Settings', action: 'error' }, error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 dark:text-red-400 text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-olive-950 dark:text-olive-50 mb-2">
          Failed to load settings
        </h2>
        <p className="text-sm text-olive-600 dark:text-olive-400 mb-6">
          Something went wrong. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-olive-700 hover:bg-olive-800 text-white rounded-xl h-10 px-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button asChild variant="outline" className="rounded-xl h-10 px-4 border-olive-200 dark:border-white/[0.1]">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-[11px] text-stone-400 dark:text-stone-600 mt-6 font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
