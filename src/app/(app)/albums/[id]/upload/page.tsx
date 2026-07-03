'use client'

import { useParams } from 'next/navigation'
import { UploadPhotosView } from '@/components/albums/upload/UploadPhotosView'

/**
 * Canonical web route for adding photos to an album. The body lives in
 * UploadPhotosView so the static mobile bundle can serve the same view at
 * /albums/upload?id=...
 */
export default function UploadPhotosPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  return <UploadPhotosView albumId={id ?? ''} />
}
