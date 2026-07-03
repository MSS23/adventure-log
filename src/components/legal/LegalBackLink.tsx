'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

/**
 * Back affordance for the bare legal pages (/terms, /privacy, /dmca,
 * /cookies). They render without app chrome, so "back" must work for both
 * entry paths: from inside the app (LegalFooter link → real history back)
 * and as a direct/external visit (no useful history → marketing home).
 */
export function LegalBackLink() {
  const router = useRouter()

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-mono text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm cursor-pointer"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  )
}
