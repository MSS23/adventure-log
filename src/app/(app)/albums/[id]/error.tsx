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
    <div className="min-h-screen bg-[#FAF7F1] dark:bg-black flex items-center justify-center px-4">
      <Card className="max-w-md w-full border-stone-200 dark:border-stone-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-stone-900 dark:text-stone-100 font-medium text-lg">
                Something went wrong
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
                We couldn&apos;t load this album. Please try again.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={reset} className="bg-olive-600 hover:bg-olive-700 text-white">
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
