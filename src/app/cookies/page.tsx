import Link from 'next/link'
import { LegalBackLink } from '@/components/legal/LegalBackLink'
import { ManageCookiesButton } from '@/components/legal/ManageCookiesButton'

export const metadata = {
  title: 'Cookie Policy — Roamkeep',
  description: 'How Roamkeep uses cookies and local storage, and how to control them.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <LegalBackLink />

        <p className="al-eyebrow mt-8 mb-1">Last updated · July 2026</p>
        <h1 className="al-display text-3xl md:text-4xl mb-4">Cookie Policy</h1>
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-10">
          This policy explains the cookies and similar local-storage technologies Roamkeep uses, and how you can control them. It complements our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
        </p>

        <Section title="1. What we use">
          <p>We keep this minimal. We split storage into two categories:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Essential</strong> — required for the app to work. Your sign-in session (set by Supabase), your theme choice, and your cookie-consent choice. These are always on; the app cannot function without them, so they don&rsquo;t require consent.</li>
            <li><strong>Analytics &amp; monitoring</strong> — privacy-friendly, cookieless usage analytics (Vercel Web Analytics) and error monitoring with limited session replay (Sentry, with text masked and media blocked). These help us understand usage and fix bugs.</li>
          </ul>
        </Section>

        <Section title="2. Your choice">
          <p>Where required by law (including the EU and UK), analytics and session replay stay <strong>off until you opt in</strong> using the cookie banner shown on your first visit. Essential storage is always active.</p>
          <p>You can change your decision at any time:</p>
          <p><ManageCookiesButton /></p>
        </Section>

        <Section title="3. Third parties">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — sets the cookies that keep you signed in (essential).</li>
            <li><strong>Vercel Web Analytics</strong> — aggregate, cookieless usage measurement (consent-gated).</li>
            <li><strong>Google Analytics 4</strong> — aggregate usage analytics with IP anonymisation and ad-personalisation signals disabled (web only, consent-gated; not used in the mobile app).</li>
            <li><strong>Sentry</strong> — error/performance monitoring and limited session replay (consent-gated).</li>
          </ul>
          <p>We do not use advertising cookies or third-party ad trackers.</p>
        </Section>

        <Section title="4. Managing cookies in your browser">
          <p>You can also block or delete cookies and local storage through your browser settings. Note that blocking essential storage will sign you out and may break parts of the app.</p>
        </Section>

        <Section title="5. Contact">
          <p>Questions about cookies? Email <a className="text-primary underline" href="mailto:msidhu861@gmail.com?subject=Cookie%20Question">msidhu861@gmail.com</a>.</p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="al-display text-xl md:text-2xl mb-3">
        {title}
      </h2>
      <div className="text-sm md:text-[15px] leading-relaxed text-muted-foreground space-y-3 [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
    </section>
  )
}
