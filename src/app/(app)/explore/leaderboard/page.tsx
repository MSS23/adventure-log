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
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Explore
          </Link>
          <p className="al-eyebrow">Leaderboard</p>
          <h1 className="al-display text-3xl md:text-4xl leading-[1.02]">
            Top <em className="italic font-normal text-accent">adventurers.</em>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            See who&apos;s leading the community across albums, countries, and more.
          </p>
        </header>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'score', label: 'Adventure Score' },
            { value: 'albums', label: 'Most Albums' },
            { value: 'countries', label: 'Most Countries' },
            { value: 'photos', label: 'Most Photos' },
            { value: 'followers', label: 'Most Followers' }
          ].map((metric) => {
            const active = selectedMetric === metric.value
            return (
              <button
                type="button"
                key={metric.value}
                onClick={() => setSelectedMetric(metric.value as 'score' | 'albums' | 'countries' | 'photos' | 'followers')}
                className={
                  active
                    ? 'rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    : 'rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 cursor-pointer hover:text-foreground hover:border-primary/30 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                }
              >
                {metric.label}
              </button>
            )
          })}
        </div>

        {/* Leaderboard */}
        <Leaderboard metric={selectedMetric} limit={50} />

        {/* Info Footer */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs text-muted-foreground">
            Only public profiles appear on the leaderboard. Rankings update in real-time as the community keeps exploring.
          </p>
        </div>
      </div>
    </div>
  )
}
