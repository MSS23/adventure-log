'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'

export default function AlbumError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    log.error('Album page error boundary caught error', {
      component: 'AlbumErrorBoundary',
      action: 'catch',
      message: error.message,
      digest: error.digest,
    }, error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                Something went wrong
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn&apos;t load this album. Please try again.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={reset}>
                Try Again
              </Button>
              <Link href="/albums">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Albums
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
