'use client'

import { useParams } from 'next/navigation'
import { LocationFeedView } from '@/components/places/LocationFeedView'

/**
 * Canonical web route for a place feed. The body lives in LocationFeedView so
 * the static mobile bundle can serve the same view at /places/view?slug=...
 */
export default function LocationFeedPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  return <LocationFeedView slug={slug ?? ''} />
}
