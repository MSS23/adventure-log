'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Leaderboard } from '@/components/leaderboard/Leaderboard'

// Force dynamic rendering to prevent build-time prerendering errors
export const dynamic = 'force-dynamic'

export default function LeaderboardPage() {
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'albums' | 'countries' | 'photos' | 'followers'>('score')

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-ivory)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-coral)] mb-5 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Explore
          </Link>
          <p className="al-eyebrow mb-1">Leaderboard</p>
          <h1 className="al-display text-3xl md:text-5xl leading-[1.02]">
            Top{' '}
            <em className="italic font-normal" style={{ color: 'var(--color-coral)' }}>
              adventurers.
            </em>
          </h1>
          <p className="text-sm text-[color:var(--color-muted-warm)] mt-2 max-w-xl">
            See who&apos;s leading the community across albums, countries, and more.
          </p>
        </div>

        {/* Metric Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'score', label: 'Overall Score' },
              { value: 'albums', label: 'Most Albums' },
              { value: 'countries', label: 'Most Countries' },
              { value: 'photos', label: 'Most Photos' },
              { value: 'followers', label: 'Most Followers' }
            ].map((metric) => {
              const active = selectedMetric === metric.value
              return (
                <button
                  key={metric.value}
                  onClick={() => setSelectedMetric(metric.value as 'score' | 'albums' | 'countries' | 'photos' | 'followers')}
                  className="px-4 py-2 rounded-full font-semibold text-[13px] transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]"
                  style={
                    active
                      ? { background: 'var(--color-forest)', color: 'var(--color-ivory)' }
                      : { background: 'var(--card)', color: 'var(--color-ink-soft)', border: '1px solid var(--color-line-warm)' }
                  }
                >
                  {metric.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard metric={selectedMetric} limit={50} />

        {/* Info Footer */}
        <div
          className="mt-12 p-6 rounded-2xl border border-[color:var(--color-line-warm)]"
          style={{ background: 'var(--card)' }}
        >
          <p className="al-eyebrow mb-2">How rankings work</p>
          <div className="space-y-2 text-sm text-[color:var(--color-ink-soft)]">
            <p>
              <strong className="text-[color:var(--color-ink)]">Overall Score:</strong> Calculated from albums (10 pts), countries visited (15 pts),
              photos uploaded (2 pts), and followers (5 pts)
            </p>
            <p>
              <strong className="text-[color:var(--color-ink)]">Other Metrics:</strong> Ranked by the specific count (albums, countries, photos, or followers)
            </p>
            <p className="text-xs text-[color:var(--color-muted-warm)] mt-3">
              Only public profiles are included in rankings. Rankings update in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
