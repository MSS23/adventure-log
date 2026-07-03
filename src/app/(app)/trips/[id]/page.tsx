'use client'

import { useParams } from 'next/navigation'
import { TripDetailView } from '@/components/trips/TripDetailView'

/**
 * Canonical web route for a trip board. The body lives in TripDetailView so
 * the static mobile bundle can serve the same view at /trips/view?id=...
 * (this dynamic route cannot be statically exported).
 */
export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  return <TripDetailView tripId={params?.id ?? ''} />
}
