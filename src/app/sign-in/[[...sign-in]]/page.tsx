'use client'

// Legacy compatibility shim. Auth is now owned by Supabase and the canonical
// sign-in route is `/login`. This client component immediately redirects any
// hit to the old Clerk `/sign-in` (and its catch-all sub-paths) to `/login`,
// preserving an inbound `redirect` / `redirect_url` query param so post-login
// "return to" flows survive the bounce.

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LegacySignInRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirectParam =
      searchParams.get('redirect') ?? searchParams.get('redirect_url')
    const target =
      redirectParam && redirectParam.startsWith('/')
        ? `/login?redirectTo=${encodeURIComponent(redirectParam)}`
        : '/login'
    router.replace(target)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  )
}
