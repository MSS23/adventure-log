'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlbumEditView } from '@/components/albums/AlbumEditView'

/**
 * Static twin of /albums/[id]/edit for the Capacitor bundle.
 * NativeNavigationAdapter rewrites edit links here on native.
 */
function EditInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <p className="text-foreground font-medium">Album not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link is missing an album id.</p>
        <Link href="/albums" className="mt-4">
          <Button variant="outline">Back to Albums</Button>
        </Link>
      </div>
    )
  }

  return <AlbumEditView albumId={id} />
}

export default function AlbumEditPage() {
  return (
    <Suspense fallback={null}>
      <EditInner />
    </Suspense>
  )
}
