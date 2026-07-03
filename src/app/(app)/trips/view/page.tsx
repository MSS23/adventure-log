'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TripDetailView } from '@/components/trips/TripDetailView'

/**
 * Static twin of /trips/[id] for the Capacitor bundle.
 * NativeNavigationAdapter rewrites trip links here on native.
 */
function TripViewInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <p className="text-foreground font-medium">Trip not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link is missing a trip id.</p>
        <Link href="/trips" className="mt-4">
          <Button variant="outline">Back to Trips</Button>
        </Link>
      </div>
    )
  }

  return <TripDetailView tripId={id} />
}

export default function TripViewPage() {
  return (
    <Suspense fallback={null}>
      <TripViewInner />
    </Suspense>
  )
}
