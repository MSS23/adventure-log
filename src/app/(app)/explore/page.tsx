'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronRight } from 'lucide-react'
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
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pb-24 md:pb-8 pt-6 md:pt-8">
      {/* Editorial header */}
      <header className="space-y-1 mb-6">
        <p className="al-eyebrow">Discover</p>
        <h1 className="al-display text-3xl md:text-5xl leading-[1.02]">
          Where the world{' '}
          <em className="italic font-normal text-accent">is going.</em>
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Destinations, journeys, and fellow adventurers.
        </p>
      </header>

      {/* Search pill */}
      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-3 mb-8 shadow-[var(--shadow-resting)] transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
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
                title="Popular journeys"
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
                eyebrow="Follow"
                title="Creators for you"
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
              <Leaderboard limit={10} metric="score" />
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
