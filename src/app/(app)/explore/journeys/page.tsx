'use client'

import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Force dynamic rendering to prevent build-time prerendering errors
export const dynamic = 'force-dynamic'

export default function PopularJourneysPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-ivory)' }}>
      {/* Header */}
      <div className="border-b border-[color:var(--color-line-warm)]" style={{ background: 'var(--card)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-coral)] transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Explore
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: 'var(--color-forest-tint)' }}>
              <TrendingUp className="h-6 w-6" style={{ color: 'var(--color-forest)' }} />
            </div>
            <div>
              <p className="al-eyebrow mb-1">Rising</p>
              <h1 className="al-display text-3xl md:text-4xl leading-[1.02]">
                Popular journeys
              </h1>
              <p className="text-sm text-[color:var(--color-muted-warm)] mt-1">
                The most inspiring travel albums from our community.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PopularJourneysSection limit={24} />
      </main>
    </div>
  )
}
