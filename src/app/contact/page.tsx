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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 space-y-8">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <header className="space-y-1">
          <p className="al-eyebrow">We&apos;d love to hear from you</p>
          <h1 className="al-display text-3xl md:text-4xl">Contact Us</h1>
          <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground max-w-prose">
            Have questions, feedback, or need support? We&apos;re here to help. Pick the channel that fits best.
          </p>
        </header>

        {/* Channels grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {CHANNELS.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  {c.title}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{c.desc}</p>
              <a
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-0.5"
              >
                <c.ctaIcon className="h-4 w-4" />
                {c.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Business inquiries */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-base md:text-lg font-semibold text-foreground mb-2">
            Business Inquiries
          </h2>
          <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-4">
            For partnerships, press inquiries, or other business matters:
          </p>
          <a
            href="mailto:business@adventurelog.app"
            className="font-mono text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            business@adventurelog.app
          </a>
        </div>

        {/* Response time */}
        <div className="rounded-2xl bg-muted/50 p-6">
          <h2 className="font-heading text-base font-semibold text-foreground mb-2">
            Response Time
          </h2>
          <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
            We typically respond within 24–48 hours during business days. For urgent issues, please add &quot;URGENT&quot; to your subject line.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Prefer to look around first?{' '}
          <Link href="/discover" className="text-primary underline">
            Explore the community globe
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
