'use client'

import { useParams } from 'next/navigation'
import { AlbumDetailView } from '@/components/albums/AlbumDetailView'

/**
 * Canonical web route for an album. The body lives in AlbumDetailView so the
 * static mobile bundle can serve the same view at /albums/view?id=... (this
 * dynamic route cannot be statically exported — see scripts/mobile-build.mjs).
 */
export default function AlbumDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  return <AlbumDetailView albumId={id ?? ''} />
}
