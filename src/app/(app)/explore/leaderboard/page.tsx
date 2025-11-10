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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-gray-600">
            See who's leading the adventure community across different metrics
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
                onClick={() => setSelectedMetric(metric.value as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  selectedMetric === metric.value
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">How Rankings Work</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Overall Score:</strong> Calculated from albums (10 pts), countries visited (15 pts),
              photos uploaded (2 pts), and followers (5 pts)
            </p>
            <p>
              <strong>Other Metrics:</strong> Ranked by the specific count (albums, countries, photos, or followers)
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Only public profiles are included in rankings. Rankings update in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
