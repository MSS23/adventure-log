'use client'

// OAuth / PKCE callback. After an IDP (Google/Apple/Discord) redirects the
// browser back here with a `code` in the URL, we exchange it for a Supabase
// session and then navigate into the app. On any failure we bounce to
// `/login?error=oauth` so the user gets a recoverable entry point.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SSOCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const finishAuth = async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        )
        if (cancelled) return
        if (error) {
          router.replace('/login?error=oauth')
          return
        }
        router.replace('/dashboard')
      } catch {
        if (!cancelled) router.replace('/login?error=oauth')
      }
    }

    finishAuth()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F1] dark:bg-black px-4 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      <p className="text-sm text-olive-600 dark:text-olive-400">Finishing sign-in…</p>
    </div>
  )
}
