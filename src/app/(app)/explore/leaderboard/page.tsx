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
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 mb-4 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">Leaderboard</h1>
          <p className="text-stone-600 dark:text-stone-400">
            See who&apos;s leading the adventure community across different metrics
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
            ].map((metric) => (
              <button
                key={metric.value}
                onClick={() => setSelectedMetric(metric.value as 'score' | 'albums' | 'countries' | 'photos' | 'followers')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none ${
                  selectedMetric === metric.value
                    ? 'bg-olive-500 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard metric={selectedMetric} limit={50} />

        {/* Info Footer */}
        <div className="mt-12 p-6 bg-stone-50 dark:bg-[#111] rounded-xl border border-stone-100 dark:border-stone-800">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">How Rankings Work</h3>
          <div className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <p>
              <strong className="text-stone-800 dark:text-stone-200">Overall Score:</strong> Calculated from albums (10 pts), countries visited (15 pts),
              photos uploaded (2 pts), and followers (5 pts)
            </p>
            <p>
              <strong className="text-stone-800 dark:text-stone-200">Other Metrics:</strong> Ranked by the specific count (albums, countries, photos, or followers)
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 mt-3">
              Only public profiles are included in rankings. Rankings update in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
