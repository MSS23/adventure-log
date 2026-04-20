'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Sparkles, TrendingUp, Users, Trophy, ChevronRight } from 'lucide-react'
import { FriendsMapSection } from '@/components/explore/FriendsMapSection'
import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { CreatorsToFollowSection } from '@/components/explore/CreatorsToFollowSection'
import { FeaturedDestinationSection } from '@/components/explore/FeaturedDestinationSection'
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
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className="al-eyebrow mb-1">{eyebrow}</p>
        <h2
          className="font-heading text-xl font-semibold"
          style={{
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-0.5 text-[13px] font-semibold transition-colors"
          style={{ color: 'var(--color-ink-soft)' }}
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 md:pb-8 pt-4 sm:pt-6">
      {/* Editorial header */}
      <div className="mb-6">
        <p className="al-eyebrow mb-1">Discover</p>
        <h1 className="al-display text-3xl md:text-5xl leading-[1.02]">
          Where the world{' '}
          <em className="italic font-normal" style={{ color: 'var(--color-coral)' }}>
            is going.
          </em>
        </h1>
        <p className="text-sm text-[color:var(--color-muted-warm)] mt-2 max-w-xl">
          Destinations, journeys, and fellow adventurers.
        </p>
      </div>

      {/* Search pill */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-full mb-8"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--color-line-warm)',
        }}
      >
        <Search className="h-4 w-4 text-[color:var(--color-muted-warm)] pointer-events-none flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Places, people, adventures…"
          className="flex-1 bg-transparent border-none outline-none text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted-warm)]"
        />
        {searchQuery ? (
          <button
            onClick={handleClearSearch}
            className="text-[color:var(--color-muted-warm)] hover:text-[color:var(--color-ink)] transition-colors"
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

            {/* Leaderboard */}
            <motion.section
              className="pb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
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
