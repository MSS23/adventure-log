import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Adventure Log',
  description: 'Terms governing the use of Adventure Log.',
}

export default function TermsPage() {
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
        <h1 className="al-display text-4xl mb-4">Terms of Service</h1>
        <p className="al-body mb-8">
          By creating an Adventure Log account you agree to these terms. They cover what you can do with the service and what we ask of you in return.
        </p>

        <Section title="1. The service">
          <p>Adventure Log is a travel logging and social platform. We may update, modify, or discontinue features with reasonable notice. Core functionality is free; certain features may become paid in the future, in which case we will notify you before charging.</p>
        </Section>

        <Section title="2. Your account">
          <p>You are responsible for the security of your account and the accuracy of the information in it. You must be at least 13 years old (16 in the EEA) to create an account. Do not share your password or log in on behalf of someone else.</p>
        </Section>

        <Section title="3. Your content">
          <p>You keep all rights to the photos, captions, and descriptions you upload. By uploading, you grant us a worldwide, royalty-free license to store, transmit, and display that content on Adventure Log solely to operate the service you have asked us to provide.</p>
          <p>You warrant that you have the right to upload every photo you post and that the content does not violate anyone else&apos;s rights.</p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Post unlawful, harassing, threatening, or sexually explicit content.</li>
            <li>Impersonate another person or misrepresent your affiliation with anyone.</li>
            <li>Upload content you don&apos;t have permission to share, or violate someone&apos;s copyright, trademark, or privacy.</li>
            <li>Scrape the service, reverse-engineer it, or attempt to break its security.</li>
            <li>Use the service to send spam, malware, or unsolicited commercial messages.</li>
          </ul>
          <p className="mt-3">Violations may result in content removal, suspension, or termination of your account.</p>
        </Section>

        <Section title="5. Moderation">
          <p>Anyone can report content using the report button. We review reports and may remove content, warn, suspend, or terminate accounts that breach these Terms. We also let you block other users — blocked users can&apos;t follow you or see your non-public content.</p>
        </Section>

        <Section title="6. Termination">
          <p>You may delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms or create legal, security, or abuse risk. On termination, your content is deleted within 30 days per our Privacy Policy.</p>
        </Section>

        <Section title="7. Disclaimer and liability">
          <p>Adventure Log is provided &quot;as is.&quot; We work hard to keep it running, but we can&apos;t guarantee it&apos;s error-free, uninterrupted, or secure. To the maximum extent permitted by law, our liability to you for any claim arising from these Terms or the service is limited to the amount you&apos;ve paid us in the preceding 12 months (which, if you&apos;re on a free plan, is zero).</p>
        </Section>

        <Section title="8. Changes">
          <p>We may update these Terms. If a change is material, we will notify you in-app or by email at least 14 days before it takes effect. Continued use after the change means you accept the new Terms.</p>
        </Section>

        <Section title="9. Contact">
          <p>Questions about these Terms? Email <a className="underline" style={{ color: 'var(--color-coral)' }} href="mailto:hello@adventure-log.app">hello@adventure-log.app</a>.</p>
        </Section>
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
