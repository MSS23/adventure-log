'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LocationFeedView } from '@/components/places/LocationFeedView'

/**
 * Static twin of /places/[slug] for the Capacitor bundle.
 * NativeNavigationAdapter rewrites place links here on native.
 */
function PlaceViewInner() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')

  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <p className="text-foreground font-medium">Place not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link is missing a place.</p>
        <Link href="/places" className="mt-4">
          <Button variant="outline">Back to Places</Button>
        </Link>
      </div>
    )
  }

  return <LocationFeedView slug={slug} />
}

export default function PlaceViewPage() {
  return (
    <Suspense fallback={null}>
      <PlaceViewInner />
    </Suspense>
  )
}
