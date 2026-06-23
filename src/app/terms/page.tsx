import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — Adventure Log',
  description: 'Terms governing the use of Adventure Log.',
}

export default function TermsPage() {
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
        <h1 className="al-display text-3xl md:text-4xl mb-4">Terms of Service</h1>
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-10">
          By creating an Adventure Log account you agree to these terms. They cover what you can do with the service and what we ask of you in return.
        </p>

        <Section title="1. The service">
          <p>Adventure Log is a travel logging and social platform. We may update, modify, or discontinue features with reasonable notice. Core functionality is free; certain features may become paid in the future, in which case we will notify you before charging.</p>
        </Section>

        <Section title="2. Your account">
          <p>You are responsible for the security of your account and the accuracy of the information in it. Adventure Log is an adults-only service: <strong>you must be 18 or older to create an account</strong>, and we ask for your date of birth at sign-up to confirm this. Do not share your password or log in on behalf of someone else.</p>
        </Section>

        <Section title="3. Your content">
          <p>You keep all rights to the photos, captions, and descriptions you upload. By uploading, you grant us a worldwide, royalty-free license to store, transmit, and display that content on Adventure Log solely to operate the service you have asked us to provide.</p>
          <p>You warrant that you have the right to upload every photo you post and that the content does not violate anyone else&apos;s rights.</p>
          <p>You are solely responsible for the content you upload. To the maximum extent permitted by law, you agree to indemnify and hold Adventure Log harmless from any claim, demand, loss, or cost (including reasonable legal fees) arising from content you post, your use of the service, or your breach of these Terms. We act only as a neutral host of user-generated content and do not endorse or verify what users post.</p>
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

        <Section title="7. Copyright and takedowns (DMCA)">
          <p>We respect intellectual property rights and expect our users to do the same. If you believe content on Adventure Log infringes your copyright, you can ask us to remove it. See our <Link className="text-primary underline" href="/dmca">Copyright &amp; DMCA Policy</Link> for how to file a notice and how counter-notices work. We may remove infringing content and terminate the accounts of repeat infringers.</p>
        </Section>

        <Section title="8. AI features">
          <p>Some features use artificial intelligence — for example, reading a pasted link to suggest a place. AI output can be inaccurate or incomplete, and we present it for you to review and confirm before it is saved. You are responsible for checking AI-assisted results before relying on them.</p>
        </Section>

        <Section title="9. Disclaimer and liability">
          <p>Adventure Log is provided &quot;as is.&quot; We work hard to keep it running, but we can&apos;t guarantee it&apos;s error-free, uninterrupted, or secure. To the maximum extent permitted by law, our liability to you for any claim arising from these Terms or the service is limited to the amount you&apos;ve paid us in the preceding 12 months (which, if you&apos;re on a free plan, is zero). Nothing in these Terms excludes liability that cannot be excluded under applicable law — including, for UK and EEA consumers, your statutory rights.</p>
        </Section>

        <Section title="10. Governing law and dispute resolution">
          <p>These Terms are governed by the laws of England and Wales. We&apos;d always rather sort out a problem informally first, so please contact us before taking any formal step and we&apos;ll try to resolve it.</p>
          <p>If we can&apos;t resolve a dispute within 60 days, you and Adventure Log agree that the dispute will be referred to and finally resolved by binding arbitration administered under the rules of the London Court of International Arbitration (LCIA), seated in London and conducted in English by a single arbitrator, rather than in court — except that either party may bring a claim in a small-claims court, and either party may seek injunctive relief in court to protect intellectual property or stop misuse of the service.</p>
          <p>To the extent permitted by law, disputes will be resolved on an individual basis and not as part of a class or representative action.</p>
          <p><strong>If you are a consumer:</strong> nothing in this section deprives you of the protection of mandatory consumer-law provisions, or of your right to bring proceedings in the courts of your country of residence, where applicable law gives you that right. UK and EU consumers may also use the relevant online dispute-resolution channels.</p>
        </Section>

        <Section title="11. Changes">
          <p>We may update these Terms. If a change is material, we will notify you in-app or by email at least 14 days before it takes effect. Continued use after the change means you accept the new Terms.</p>
        </Section>

        <Section title="12. Contact">
          <p>Questions about these Terms? Email <a className="text-primary underline" href="mailto:legal@adventurelog.app">legal@adventurelog.app</a>. Copyright notices: see the <Link className="text-primary underline" href="/dmca">DMCA Policy</Link>.</p>
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
