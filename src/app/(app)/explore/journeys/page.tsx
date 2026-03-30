'use client'

import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Force dynamic rendering to prevent build-time prerendering errors
export const dynamic = 'force-dynamic'

export default function PopularJourneysPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-[#111] border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/explore">
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer transition-all duration-200 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500">
                <ArrowLeft className="h-4 w-4" />
                Back to Explore
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-olive-100 to-olive-100 dark:from-olive-900 dark:to-olive-800 rounded-xl">
              <TrendingUp className="h-6 w-6 text-olive-600 dark:text-olive-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                Popular Journeys
              </h1>
              <p className="text-stone-600 dark:text-stone-400 mt-1">
                Discover the most inspiring travel albums from our community
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
