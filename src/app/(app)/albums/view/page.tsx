'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlbumDetailView } from '@/components/albums/AlbumDetailView'

/**
 * Static twin of /albums/[id] for the Capacitor bundle (query-param based so
 * it can be statically exported). Web navigations keep using the canonical
 * dynamic route; NativeNavigationAdapter rewrites them to this page on native.
 */
function AlbumViewInner() {
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

  return <AlbumDetailView albumId={id} />
}

export default function AlbumViewPage() {
  return (
    <Suspense fallback={null}>
      <AlbumViewInner />
    </Suspense>
  )
}
