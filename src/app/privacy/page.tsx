import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Adventure Log',
  description: 'How Adventure Log collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider hover:underline"
          style={{ color: 'var(--color-muted-warm)' }}
        >
          ← Home
        </Link>

        <p className="al-eyebrow mt-6 mb-2">Last updated · April 2026</p>
        <h1 className="al-display text-4xl mb-4">Privacy Policy</h1>
        <p className="al-body mb-8">
          Adventure Log helps you document and share your travels. This policy explains what we collect, why, and what your rights are. We wrote it to be readable — no dark patterns.
        </p>

        <Section title="1. What we collect">
          <p>When you create an account we store your email address and whatever profile fields you choose to fill in (username, display name, bio, avatar, location, privacy preference).</p>
          <p>When you log a trip we store the photos you upload, the locations and dates attached to them, and any captions or descriptions you add.</p>
          <p>We collect minimal device information (browser, OS, approximate region inferred from IP) to keep the service running, detect abuse, and debug errors. We do <strong>not</strong> use third-party ad trackers.</p>
        </Section>

        <Section title="2. How we use your data">
          <ul className="list-disc pl-5 space-y-1">
            <li>To run the product — show your albums, render your globe, power search and discovery.</li>
            <li>To deliver social features — show your public albums to people you allow, deliver follow notifications.</li>
            <li>To improve the product — aggregate, anonymised usage metrics (never sold or shared with third parties).</li>
            <li>To keep the service safe — detect spam, respond to abuse reports, enforce our Terms.</li>
          </ul>
          <p className="mt-3">We do not sell your personal data. We do not train AI models on your photos.</p>
        </Section>

        <Section title="3. Who can see your content">
          <p>Every album has a visibility setting you control: <strong>Public</strong> (anyone), <strong>Friends</strong> (people you follow mutually), or <strong>Private</strong> (only you). You can change it any time.</p>
          <p>Your globe, passport, and stats visibility mirror the visibility of the albums that feed into them.</p>
        </Section>

        <Section title="4. Third-party services we rely on">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — database, file storage, authentication.</li>
            <li><strong>Vercel</strong> — hosting and edge delivery.</li>
            <li><strong>OpenStreetMap / Nominatim</strong> — reverse geocoding (we never send your identity with these requests).</li>
            <li><strong>Google / Discord / Apple</strong> — only when you choose SSO, for sign-in only.</li>
            <li><strong>Mapbox</strong> — map tiles, if enabled.</li>
          </ul>
        </Section>

        <Section title="5. Your rights">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access</strong> — you can download all your data from Settings → Export (coming soon; email us meanwhile).</li>
            <li><strong>Deletion</strong> — Settings → Delete Account permanently removes your account and associated content.</li>
            <li><strong>Rectification</strong> — edit your profile, albums, captions any time.</li>
            <li><strong>Objection / portability</strong> — contact us and we will comply with GDPR and CCPA requests within 30 days.</li>
          </ul>
        </Section>

        <Section title="6. Children">
          <p>Adventure Log is not directed at children under 13. If we learn we have collected information from a child under 13, we will delete it promptly.</p>
        </Section>

        <Section title="7. Retention">
          <p>We keep your data as long as your account exists. Deleted accounts are purged from production within 30 days; database backups may retain encrypted copies for up to 90 days before being overwritten.</p>
        </Section>

        <Section title="8. Contact">
          <p>Questions about this policy or a privacy request? Email <a className="underline" style={{ color: 'var(--color-coral)' }} href="mailto:privacy@adventure-log.app">privacy@adventure-log.app</a>.</p>
        </Section>

        <p className="al-caption mt-10">
          This policy may change as the product evolves. We will notify you by email or in-app before any material change.
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="font-heading text-xl font-semibold mb-3"
        style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}
      >
        {title}
      </h2>
      <div className="al-body space-y-3">{children}</div>
    </section>
  )
}
