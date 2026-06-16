import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — Adventure Log',
  description: 'How Adventure Log collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <p className="al-eyebrow mt-8 mb-1">Last updated · June 2026</p>
        <h1 className="al-display text-3xl md:text-4xl mb-4">Privacy Policy</h1>
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-10">
          Adventure Log helps you document and share your travels. This policy explains what we collect, why, and what your rights are. We wrote it to be readable — no dark patterns. It works alongside our <Link href="/terms" className="text-primary underline">Terms of Service</Link> and <Link href="/cookies" className="text-primary underline">Cookie Policy</Link>.
        </p>

        <Section title="1. What we collect">
          <p>When you create an account we store your email address and whatever profile fields you choose to fill in (username, display name, bio, avatar, location, privacy preference).</p>
          <p>When you log a trip we store the photos you upload, the locations and dates you attach to an album, and any captions or descriptions you add.</p>
          <p><strong>Photo location data:</strong> photos often contain hidden GPS coordinates and other camera metadata (EXIF). To protect you, we <strong>strip GPS/location metadata from every photo as it is uploaded</strong> — it is not stored and is not embedded in the image other people can view or download. Location on the map comes only from the place you choose for an album, not from your photos&rsquo; hidden data.</p>
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

        <Section title="4. Analytics, error monitoring &amp; cookies">
          <p>We use <strong>privacy-friendly, cookieless</strong> product analytics (Vercel Web Analytics) to understand aggregate usage, and <strong>Sentry</strong> for error monitoring so we can fix crashes. Sentry may record a limited session replay to reproduce bugs — text is masked and images/media are blocked.</p>
          <p>Where required (e.g. in the EU/UK), analytics and session-replay are <strong>off until you consent</strong> via the cookie banner, and you can change your choice any time. We use only essential cookies/local storage (your session, theme, and consent choice) without asking. See our <Link href="/cookies" className="text-primary underline">Cookie Policy</Link> for details.</p>
        </Section>

        <Section title="5. Third-party services we rely on">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — database, file storage, authentication.</li>
            <li><strong>Vercel</strong> — hosting, edge delivery, and cookieless analytics.</li>
            <li><strong>Sentry</strong> — error and performance monitoring.</li>
            <li><strong>OpenStreetMap / Nominatim</strong> — reverse geocoding (we never send your identity with these requests).</li>
            <li><strong>Google / Discord / Apple</strong> — only when you choose SSO, for sign-in only.</li>
            <li><strong>Mapbox</strong> — map tiles, if enabled.</li>
          </ul>
        </Section>

        <Section title="6. Your rights">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access &amp; portability</strong> — download all your data from <strong>Settings → Export your data</strong> as a JSON file.</li>
            <li><strong>Deletion</strong> — <strong>Settings → Delete Account</strong> removes your account; data is purged within 30 days (see Retention).</li>
            <li><strong>Rectification</strong> — edit your profile, albums, and captions any time.</li>
            <li><strong>Objection / restriction</strong> — contact us and we will comply with GDPR, UK GDPR, and CCPA requests within 30 days. You also have the right to lodge a complaint with your local data protection authority.</li>
          </ul>
        </Section>

        <Section title="7. Children">
          <p>Adventure Log is not directed at children. You must be at least 13 years old to use it (16 in the EEA/UK, or the minimum age required by your local law). If we learn we have collected personal information from a child below the applicable age, we will delete it promptly.</p>
        </Section>

        <Section title="8. Retention">
          <p>We keep your data as long as your account exists. Deleted accounts are purged from production within 30 days; database backups may retain encrypted copies for up to 90 days before being overwritten.</p>
        </Section>

        <Section title="9. Contact">
          <p>Questions about this policy or a privacy request? Email <a className="text-primary underline" href="mailto:privacy@adventurelog.app">privacy@adventurelog.app</a>.</p>
        </Section>

        <p className="text-xs text-muted-foreground mt-10">
          This policy may change as the product evolves. We will notify you by email or in-app before any material change.
        </p>
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
