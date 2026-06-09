import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, Github, Twitter, Send } from 'lucide-react'

export const metadata = {
  title: 'Contact — Adventure Log',
  description: 'Get in touch with the Adventure Log team — support, bugs, feature requests, and press.',
}

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email Support',
    desc: 'For general inquiries and support.',
    cta: 'support@adventurelog.app',
    href: 'mailto:support@adventurelog.app',
    ctaIcon: Send,
    external: false,
  },
  {
    icon: Github,
    title: 'Bug Reports',
    desc: 'Found a bug? Report it on GitHub.',
    cta: 'Open an Issue',
    href: 'https://github.com/adventurelog/issues',
    ctaIcon: Github,
    external: true,
  },
  {
    icon: MessageSquare,
    title: 'Feature Requests',
    desc: 'Suggest new features and improvements.',
    cta: 'feedback@adventurelog.app',
    href: 'mailto:feedback@adventurelog.app',
    ctaIcon: Send,
    external: false,
  },
  {
    icon: Twitter,
    title: 'Social Media',
    desc: 'Follow us for updates and news.',
    cta: '@adventurelog',
    href: 'https://twitter.com/adventurelog',
    ctaIcon: Twitter,
    external: true,
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-forest)] rounded-sm"
          style={{ color: 'var(--color-muted-warm)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <p className="al-eyebrow mt-6 mb-2">We&apos;d love to hear from you</p>
        <h1 className="al-display text-4xl mb-4">Contact Us</h1>
        <p className="al-body mb-10 max-w-prose">
          Have questions, feedback, or need support? We&apos;re here to help. Pick the channel that fits best.
        </p>

        {/* Channels grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {CHANNELS.map((c) => (
            <div
              key={c.title}
              className="al-card p-5 transition-all duration-200 hover:-translate-y-0.5"
              style={{ boxShadow: '0 1px 2px rgba(26,20,14,0.04), 0 4px 16px rgba(26,20,14,0.06)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: 'var(--color-forest-tint)' }}
                >
                  <c.icon className="h-5 w-5" style={{ color: 'var(--color-forest)' }} />
                </div>
                <h2 className="font-heading text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {c.title}
                </h2>
              </div>
              <p className="al-body text-sm mb-4">{c.desc}</p>
              <a
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-forest)] rounded-sm py-0.5"
                style={{ color: 'var(--color-forest)' }}
              >
                <c.ctaIcon className="h-4 w-4" />
                {c.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Business inquiries */}
        <div className="al-card p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
            Business Inquiries
          </h2>
          <p className="al-body mb-4">
            For partnerships, press inquiries, or other business matters:
          </p>
          <a
            href="mailto:business@adventurelog.app"
            className="font-mono text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-forest)] rounded-sm"
            style={{ color: 'var(--color-coral)' }}
          >
            business@adventurelog.app
          </a>
        </div>

        {/* Response time */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--color-gold-tint)',
            border: '1px solid var(--color-line-warm)',
          }}
        >
          <h2 className="font-heading text-base font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
            Response Time
          </h2>
          <p className="al-body">
            We typically respond within 24–48 hours during business days. For urgent issues, please add &quot;URGENT&quot; to your subject line.
          </p>
        </div>

        <p className="al-caption mt-10">
          Prefer to look around first?{' '}
          <Link href="/discover" className="underline" style={{ color: 'var(--color-forest)' }}>
            Explore the community globe
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
