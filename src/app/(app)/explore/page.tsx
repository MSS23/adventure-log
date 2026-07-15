'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronRight, MapPinned, UsersRound } from 'lucide-react'
import { FriendsMapSection } from '@/components/explore/FriendsMapSection'
import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { CreatorsToFollowSection } from '@/components/explore/CreatorsToFollowSection'
import { FeaturedDestinationSection } from '@/components/explore/FeaturedDestinationSection'
import { RecommendationsSection } from '@/components/explore/RecommendationsSection'
import { ExploreSearchResults } from '@/components/explore/ExploreSearchResults'
import { Leaderboard } from '@/components/leaderboard/Leaderboard'

function SectionHeader({
  eyebrow,
  title,
  href,
}: {
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  eyebrow: string
  title: string
  href?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <p className="al-eyebrow mb-0.5">{eyebrow}</p>
        <h2 className="al-display text-xl md:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-0.5 rounded-full px-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors cursor-pointer hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [, setIsFocused] = useState(false)

  useEffect(() => {
    const query = searchParams.get('q') || ''
    setSearchQuery(query)
  }, [searchParams])

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const showDefaultContent = !searchQuery.trim()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-24 md:pb-8 pt-6 md:pt-8">
      {/* Editorial header */}
      <header className="relative mb-5 overflow-hidden rounded-3xl border border-border bg-card px-5 pb-12 pt-7 shadow-[var(--shadow-resting)] sm:px-8 sm:pb-14 sm:pt-9">
        <div aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <p className="al-eyebrow">Discover</p>
          <h1 className="al-display text-3xl md:text-5xl leading-[1.02]">
            Find somewhere worth{' '}
            <em className="italic font-normal text-accent">remembering.</em>
          </h1>
          <div className="mt-3 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Places your friends loved, people with a footprint like yours, and ideas for the next adventure.
            </p>
          {/* Places + Map moved out of the bottom tab bar (5-tab limit) —
              these are their mobile entry points now. */}
          <span className="grid shrink-0 grid-cols-3 gap-1.5">
            <Link
              href="/map"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/65 px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MapPinned className="h-4 w-4" />
              Your Map
            </Link>
            <Link
              href="/places"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/65 px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Places
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/travel-twins"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/65 px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UsersRound className="h-4 w-4" />
              Travel twins
            </Link>
            </span>
          </div>
        </div>
      </header>

      {/* Search pill */}
      <div className="relative z-10 mx-3 -mt-11 mb-8 flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-[var(--shadow-overlay)] backdrop-blur-xl transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background sm:mx-6">
        <Search className="h-4 w-4 text-muted-foreground pointer-events-none flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Places, people, adventures…"
          aria-label="Search destinations, people, and adventures"
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={handleClearSearch}
            className="flex items-center justify-center rounded-full p-1.5 text-muted-foreground transition-colors cursor-pointer hover:text-foreground hover:bg-muted active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="al-badge">⌘K</span>
        )}
      </div>

      {/* One-tap starting points — searching from a blank box is the hardest
          first step on a discovery page. Hidden once a query is typed. */}
      {showDefaultContent && (
        <div className="-mt-4 mb-8 flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {['Japan', 'Italy', 'Beaches', 'Road trips', 'Greece', 'Hiking'].map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setSearchQuery(term)}
              className="min-h-9 shrink-0 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground shadow-[var(--shadow-resting)] transition-colors cursor-pointer hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {showDefaultContent ? (
          <motion.div
            key="default-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Friends' Recent Adventures (self-contained — renders its own header or nothing) */}
            <FriendsMapSection />

            {/* Featured Destination */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
            >
              <SectionHeader
                eyebrow="Spotlight"
                title="Featured destination"
              />
              <FeaturedDestinationSection />
            </motion.section>

            {/* Popular Journeys */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <SectionHeader
                eyebrow="Rising"
                title="Popular albums"
                href="/explore/journeys"
              />
              <PopularJourneysSection limit={3} />
            </motion.section>

            {/* Creators to Follow */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <SectionHeader
                eyebrow="Discover people"
                title="Travelers for you"
                href="/explore/creators"
              />
              <CreatorsToFollowSection limit={4} />
            </motion.section>

            {/* Top Recommendations */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
            >
              <SectionHeader
                eyebrow="Recommended"
                title="Top recommendations"
                href="/explore/recommendations"
              />
              <RecommendationsSection limit={3} />
            </motion.section>

            {/* Leaderboard */}
            <motion.section
              className="pb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <SectionHeader
                eyebrow="Leaderboard"
                title="Top adventurers"
                href="/explore/leaderboard"
              />
              {/* Top 5 keeps the page from ending in a wall of rows — the
                  full board lives behind "View all". */}
              <Leaderboard limit={5} metric="score" />
            </motion.section>
          </motion.div>
        ) : (
          <motion.div
            key="search-results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <ExploreSearchResults query={searchQuery} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
