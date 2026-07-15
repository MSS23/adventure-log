import Link from 'next/link'

/**
 * Compact legal footer shown at the bottom of the in-app scroll region, so
 * authenticated/PWA users (who never see the marketing landing page) always
 * have access to the privacy policy, terms, cookie policy, and DMCA page.
 */
const LINKS: Array<{ href: string; label: string }> = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/dmca', label: 'DMCA' },
  { href: '/contact', label: 'Contact' },
]

export function LegalFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 pt-6 pb-2">
      <nav
        aria-label="Legal"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
          >
            {l.label}
          </Link>
        ))}
        <span className="text-muted-foreground/50">·</span>
        <span className="text-muted-foreground/60">© Roamkeep</span>
      </nav>
    </footer>
  )
}
