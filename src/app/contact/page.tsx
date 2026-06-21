import Link from 'next/link'
import { ArrowLeft, MessageSquare, MessageCircle, Mail } from 'lucide-react'
import { FeedbackLauncher } from '@/components/feedback/FeedbackLauncher'

export const metadata = {
  title: 'Contact — Adventure Log',
  description: 'Get in touch with the Adventure Log team — support, bugs, and feature requests.',
}

// Optional channels — only rendered when configured, so we never advertise a
// dead address. Set these in your env when they exist.
const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

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
            Have a bug, an idea, or a question? The fastest way to reach us is the in-app
            feedback form — it lands straight with the team.
          </p>
        </header>

        {/* Primary: in-app feedback */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-base font-semibold text-foreground">Send feedback</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-prose">
            Report a bug, request a feature, or just say hi. Takes a few seconds — no account needed.
          </p>
          <FeedbackLauncher label="Open feedback form" />
        </div>

        {/* Optional secondary channels (only shown when configured) */}
        {(DISCORD_INVITE_URL || SUPPORT_EMAIL) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {DISCORD_INVITE_URL && (
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-base font-semibold text-foreground">Community Discord</h2>
                </div>
                <p className="text-sm text-muted-foreground">Chat with the team and other travelers.</p>
              </a>
            )}

            {SUPPORT_EMAIL && (
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-base font-semibold text-foreground">Email</h2>
                </div>
                <p className="text-sm text-muted-foreground break-all">{SUPPORT_EMAIL}</p>
              </a>
            )}
          </div>
        )}

        {/* Response time */}
        <div className="rounded-2xl bg-muted/50 p-6">
          <h2 className="font-heading text-base font-semibold text-foreground mb-2">Response Time</h2>
          <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
            We&apos;re a small team and read everything. We typically respond within a few days.
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
