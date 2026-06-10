'use client'

import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering to prevent build-time prerendering errors
export const dynamic = 'force-dynamic'

export default function PopularJourneysPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Explore
          </Link>
          <p className="al-eyebrow">Rising</p>
          <h1 className="al-display text-3xl md:text-4xl leading-[1.02]">
            Popular journeys
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            The most inspiring travel albums from our community.
          </p>
        </header>

        {/* Content */}
        <main>
          <PopularJourneysSection limit={24} />
        </main>
      </div>
    </div>
  )
}
