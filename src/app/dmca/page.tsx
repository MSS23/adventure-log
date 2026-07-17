import Link from 'next/link'
import { LegalBackLink } from '@/components/legal/LegalBackLink'

export const metadata = {
  title: 'Copyright & DMCA Policy — Adventure Log',
  description: 'How to report copyright infringement on Adventure Log and how counter-notices work.',
}

export default function DmcaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <LegalBackLink />

        <p className="al-eyebrow mt-8 mb-1">Last updated · July 2026</p>
        <h1 className="al-display text-3xl md:text-4xl mb-4">Copyright &amp; DMCA Policy</h1>
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-10">
          Adventure Log hosts content uploaded by its users. We respect the intellectual property rights of others and respond to clear notices of alleged copyright infringement. This policy explains how to report content you believe infringes your copyright, and how the person who posted it can respond.
        </p>

        <Section title="1. Reporting infringement">
          <p>If you own (or are authorised to act for the owner of) a copyrighted work that appears on Adventure Log without permission, send us a written notice containing the following:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name, postal address, email address, and a statement of your authority to act.</li>
            <li>A description of the copyrighted work you say has been infringed.</li>
            <li>The specific URL(s) or location on Adventure Log where the material appears, so we can find it.</li>
            <li>A statement that you have a good-faith belief the use is not authorised by the copyright owner, its agent, or the law.</li>
            <li>A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the owner or authorised to act on the owner&apos;s behalf.</li>
            <li>Your physical or electronic signature.</li>
          </ul>
          <p className="mt-3">Send notices to our copyright agent at <a className="text-primary underline" href="mailto:msidhu861@gmail.com?subject=Copyright%20Notice">msidhu861@gmail.com</a> with the subject line &quot;Copyright Notice&quot;.</p>
        </Section>

        <Section title="2. What happens next">
          <p>When we receive a valid notice, we will remove or disable access to the material expeditiously and make a reasonable effort to notify the user who posted it. We may provide that user with a copy of your notice (including your contact details) so they can respond.</p>
        </Section>

        <Section title="3. Counter-notice">
          <p>If your content was removed and you believe that was a mistake or misidentification, you may send a counter-notice to <a className="text-primary underline" href="mailto:msidhu861@gmail.com?subject=DMCA%20Counter-Notice">msidhu861@gmail.com</a> containing:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name, address, email, and physical or electronic signature.</li>
            <li>Identification of the content that was removed and the location where it appeared before removal.</li>
            <li>A statement, under penalty of perjury, that you have a good-faith belief the content was removed as a result of mistake or misidentification.</li>
            <li>Your consent to the jurisdiction of the appropriate courts and to accept service of process from the person who filed the original notice.</li>
          </ul>
          <p className="mt-3">If we receive a valid counter-notice, we may restore the content unless the original complainant takes legal action.</p>
        </Section>

        <Section title="4. Repeat infringers">
          <p>We will, in appropriate circumstances, suspend or terminate the accounts of users who are repeat infringers.</p>
        </Section>

        <Section title="5. Misuse">
          <p>Submitting a false or bad-faith notice or counter-notice may make you liable for damages, including costs and legal fees. If you are unsure whether material is infringing, you should seek legal advice before submitting a notice.</p>
        </Section>

        <Section title="6. Related policies">
          <p>This policy forms part of our <Link className="text-primary underline" href="/terms">Terms of Service</Link>. See also our <Link className="text-primary underline" href="/privacy">Privacy Policy</Link>.</p>
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
