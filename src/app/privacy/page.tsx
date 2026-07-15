import Link from 'next/link'
import { LegalBackLink } from '@/components/legal/LegalBackLink'

export const metadata = {
  title: 'Privacy Policy — Adventure Log',
  description: 'How Adventure Log collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <LegalBackLink />

        <p className="al-eyebrow mt-8 mb-1">Last updated · July 2026</p>
        <h1 className="al-display text-3xl md:text-4xl mb-4">Privacy Policy</h1>
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-10">
          Adventure Log helps you document and share your travels. This policy explains what we collect, why, and what your rights are. We wrote it to be readable — no dark patterns. It works alongside our <Link href="/terms" className="text-primary underline">Terms of Service</Link> and <Link href="/cookies" className="text-primary underline">Cookie Policy</Link>.
        </p>

        <Section title="1. Who we are">
          <p>Adventure Log (&quot;we&quot;, &quot;us&quot;) is the data controller for the personal data described in this policy. For any privacy question or to exercise your rights, contact <a className="text-primary underline" href="mailto:msidhu861@gmail.com?subject=Privacy%20Request">msidhu861@gmail.com</a>.</p>
        </Section>

        <Section title="2. What we collect">
          <p>When you create an account we store your email address and whatever profile fields you choose to fill in (username, display name, bio, avatar, location, privacy preference). We also record that you confirmed you meet the minimum age and accepted these terms.</p>
          <p>When you log a trip we store the photos you upload, the locations and dates you attach to an album, and any captions or descriptions you add.</p>
          <p><strong>Photo location data:</strong> photos often contain hidden GPS coordinates and other camera metadata (EXIF). To protect you, we <strong>re-encode every photo as it is uploaded, which removes embedded GPS/EXIF metadata</strong> so it is not stored in the image other people can view or download. The location shown on your map comes only from the place you choose for an album, never from a photo&rsquo;s hidden data. Photos uploaded before this protection existed may still hold coordinates in our database; you can remove them via Settings or by emailing us.</p>
          <p><strong>When you paste a link</strong> (for example a TikTok or Google Maps link to save a place), we send the contents of that link to an AI provider (Anthropic) to work out the place details, which you then review before saving.</p>
          <p>We collect minimal device information (browser, OS, approximate region inferred from IP) to keep the service running, detect abuse, and debug errors. We do <strong>not</strong> use third-party ad trackers.</p>
        </Section>

        <Section title="3. How we use your data">
          <ul className="list-disc pl-5 space-y-1">
            <li>To run the product — show your albums, render your globe, power search and discovery.</li>
            <li>To deliver social features — show your public albums to people you allow, deliver follow notifications and transactional emails.</li>
            <li>To power optional AI features — read a link you paste to suggest a place, or generate a trip plan you ask for.</li>
            <li>To improve the product — aggregate, anonymised usage metrics (never sold or shared with advertisers).</li>
            <li>To keep the service safe — detect spam, respond to abuse reports, enforce our Terms.</li>
          </ul>
          <p className="mt-3">We do not sell your personal data. We do not train AI models on your photos or content.</p>
        </Section>

        <Section title="4. Legal basis for processing">
          <p>Under the UK GDPR and EU GDPR we rely on:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract</strong> — to create and run your account and deliver the features you ask for.</li>
            <li><strong>Legitimate interests</strong> — to keep the service secure, prevent abuse, monitor errors, and understand aggregate usage (balanced against your rights).</li>
            <li><strong>Consent</strong> — for non-essential analytics and session replay, which stay off until you opt in. You can withdraw consent at any time.</li>
            <li><strong>Legal obligation</strong> — where we must retain or disclose data to comply with the law.</li>
          </ul>
        </Section>

        <Section title="5. Who can see your content">
          <p>Every album has a visibility setting you control: <strong>Public</strong> (anyone), <strong>Friends</strong> (people you follow mutually), or <strong>Private</strong> (only you). You can change it any time.</p>
          <p>Your globe, passport, and stats visibility mirror the visibility of the albums that feed into them. Other travelers see trip timing as a season and year, never your exact travel day or month.</p>
        </Section>

        <Section title="6. Analytics, error monitoring &amp; cookies">
          <p>We use <strong>privacy-friendly, cookieless</strong> product analytics (Vercel Web Analytics), optionally <strong>Google Analytics 4</strong> (with IP anonymisation and ad-personalisation signals turned off, on the website only — not the mobile app), and <strong>Sentry</strong> for error monitoring so we can fix crashes. Sentry may record a limited session replay to reproduce bugs — text is masked and images/media are blocked.</p>
          <p>Where required (e.g. in the EU/UK), analytics and session-replay are <strong>off until you consent</strong> via the cookie banner, and you can change your choice any time. We use only essential cookies/local storage (your session, theme, and consent choice) without asking. See our <Link href="/cookies" className="text-primary underline">Cookie Policy</Link> for details.</p>
        </Section>

        <Section title="7. Third-party services we rely on">
          <p>We share personal data with these processors only as needed to run the service:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — database, file storage, authentication.</li>
            <li><strong>Vercel</strong> — hosting, edge delivery, and cookieless analytics.</li>
            <li><strong>Google Analytics</strong> — aggregate website analytics (consent-gated, web only).</li>
            <li><strong>Sentry</strong> — error and performance monitoring.</li>
            <li><strong>Resend</strong> — sending transactional emails (e.g. notifications, account emails).</li>
            <li><strong>Anthropic (Claude)</strong> — reading a link you paste to extract place details (only when you use that feature).</li>
            <li><strong>Groq</strong> — generating an AI trip plan when you request one.</li>
            <li><strong>OpenWeather</strong> — weather forecasts for trip planning (we send coordinates and dates, not your identity).</li>
            <li><strong>OpenStreetMap / Nominatim</strong> — reverse geocoding (we never send your identity with these requests).</li>
            <li><strong>TikTok / Google Maps</strong> — when you paste one of their links, we fetch its public details to read the place.</li>
            <li><strong>Google / Discord / Apple</strong> — only when you choose SSO, for sign-in only.</li>
            <li><strong>Mapbox</strong> — map tiles, if enabled.</li>
          </ul>
        </Section>

        <Section title="8. International data transfers">
          <p>Some of these providers process data outside the UK and EEA (for example in the United States). Where that happens, we rely on appropriate safeguards — such as the UK International Data Transfer Agreement / Addendum and the EU Standard Contractual Clauses — to protect your data. You can ask us for details of the safeguards in place.</p>
        </Section>

        <Section title="9. Your rights">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access &amp; portability</strong> — download your data from <strong>Settings → Export your data</strong> as a machine-readable JSON file.</li>
            <li><strong>Deletion</strong> — <strong>Settings → Delete Account</strong> removes your account; data is purged within 30 days (see Retention).</li>
            <li><strong>Rectification</strong> — edit your profile, albums, and captions any time.</li>
            <li><strong>Objection / restriction / withdraw consent</strong> — contact us and we will comply with UK GDPR, EU GDPR, and CCPA requests within 30 days.</li>
          </ul>
          <p className="mt-3">If you are in the UK, you also have the right to complain to the <a className="text-primary underline" href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">Information Commissioner&rsquo;s Office (ICO)</a>. In the EEA, you may complain to your local data protection authority.</p>
        </Section>

        <Section title="10. Age — adults only (18+)">
          <p>Adventure Log is an adults-only service. <strong>You must be 18 or older to create an account or use it.</strong> We ask for your date of birth at sign-up to confirm this and record that you confirmed you are 18+. The service is not directed at children, and we do not knowingly collect personal data from anyone under 18. If we learn that an account holder is under 18, we will close the account and delete their data.</p>
        </Section>

        <Section title="11. Retention">
          <p>We keep your data as long as your account exists. Deleted accounts are purged from production within 30 days; database backups may retain encrypted copies for up to 90 days before being overwritten. Error logs and aggregate analytics are retained only as long as needed for those purposes.</p>
        </Section>

        <Section title="12. Contact">
          <p>Questions about this policy or a privacy request? Email <a className="text-primary underline" href="mailto:msidhu861@gmail.com?subject=Privacy%20Request">msidhu861@gmail.com</a>.</p>
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
