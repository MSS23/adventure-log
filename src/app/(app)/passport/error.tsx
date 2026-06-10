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
    log.error('Passport error', { component: 'Passport', action: 'error' }, error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <span className="text-xl">!</span>
        </div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
          Failed to load passport
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Something went wrong. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-xs tracking-wide text-muted-foreground">
            ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
