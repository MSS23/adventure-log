'use client'

import { useParams } from 'next/navigation'
import { AlbumEditView } from '@/components/albums/AlbumEditView'

/**
 * Canonical web route for editing an album. The body lives in AlbumEditView so
 * the static mobile bundle can serve the same view at /albums/edit?id=...
 */
export default function EditAlbumPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  return <AlbumEditView albumId={id ?? ''} />
}
