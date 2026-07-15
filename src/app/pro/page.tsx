import { LegalBackLink } from '@/components/legal/LegalBackLink'
import { Sparkles, BarChart3, Images } from 'lucide-react'

export const metadata = {
  title: 'Roamkeep Pro — $29/year',
  description: 'Unlimited AI link imports, deep travel insights, and 4× photo capacity. Everything social stays free, forever.',
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Unlimited AI link imports',
    description:
      'Paste as many TikTok, Google Maps, and Instagram links as you like — AI turns them into wishlist places. Free includes 10 per month.',
  },
  {
    icon: BarChart3,
    title: 'Travel Insights',
    description:
      'Deep stats on your travels — activity heatmaps, top destinations, and year-by-year charts of everywhere you have been.',
  },
  {
    icon: Images,
    title: '4× photo capacity per album',
    description:
      'Up to 120 photos per album instead of 30 — keep the whole trip in one place.',
  },
]

export default function ProPage() {
  // Inlined at build time. When unset, the CTA renders disabled.
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <LegalBackLink />

        <p className="al-eyebrow mt-8 mb-1">Upgrade</p>
        <h1 className="al-display text-3xl md:text-4xl mb-4">
          Roamkeep Pro — $29/year
        </h1>
        <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-10">
          One flat price for the power features. No tiers, no add-ons — just more room for
          your travels.
        </p>

        <div className="space-y-4 mb-10">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <feature.icon className="h-5 w-5 text-primary" />
                <h2 className="al-display text-lg md:text-xl">{feature.title}</h2>
              </div>
              <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {paymentLink ? (
          <a
            href={paymentLink}
            className="block w-full rounded-xl bg-primary px-6 py-4 text-center text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get Pro — $29/year
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="block w-full rounded-xl bg-primary/50 px-6 py-4 text-center text-base font-semibold text-primary-foreground cursor-not-allowed"
          >
            Coming very soon
          </button>
        )}

        <p className="text-sm leading-relaxed text-muted-foreground text-center mt-8">
          Everything social stays free, forever — sharing, the globe, Wrapped, and your feed.
        </p>
      </div>
    </div>
  )
}
