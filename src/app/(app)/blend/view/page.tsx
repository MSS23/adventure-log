'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BlendContent } from '@/components/blend/BlendContent'

/**
 * Static twin of /blend/[username] for the Capacitor bundle.
 * NativeNavigationAdapter rewrites blend links here on native.
 */
function BlendViewInner() {
  const searchParams = useSearchParams()
  const u = searchParams.get('u')

  if (!u) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <p className="text-foreground font-medium">Blend not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link is missing a traveler.</p>
        <Link href="/passport" className="mt-4">
          <Button variant="outline">Back to Passport</Button>
        </Link>
      </div>
    )
  }

  return <BlendContent username={u} />
}

export default function BlendViewPage() {
  return (
    <Suspense fallback={null}>
      <BlendViewInner />
    </Suspense>
  )
}
