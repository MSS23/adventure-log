'use client'

// Legacy compatibility shim. Auth is now owned by Supabase and the canonical
// sign-up route is `/signup`. This client component immediately redirects any
// hit to the old Clerk `/sign-up` (and its catch-all sub-paths) to `/signup`,
// preserving an inbound `redirect` / `redirect_url` query param.

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LegacySignUpRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirectParam =
      searchParams.get('redirect') ?? searchParams.get('redirect_url')
    const target =
      redirectParam && redirectParam.startsWith('/')
        ? `/signup?redirectTo=${encodeURIComponent(redirectParam)}`
        : '/signup'
    router.replace(target)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F1] dark:bg-[#0a0a0a] px-4 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      <p className="text-sm text-olive-600 dark:text-olive-400">Redirecting…</p>
    </div>
  )
}
