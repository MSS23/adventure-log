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
  icon: Icon,
  iconColor,
  title,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  href?: string
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-0.5 text-sm text-stone-400 hover:text-olive-600 dark:hover:text-olive-400 transition-colors"
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
  const [isFocused, setIsFocused] = useState(false)

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
      {/* Search Section */}
      <div className="mb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight mb-0.5">Explore</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Discover destinations, journeys, and fellow adventurers
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search locations, users, or keywords..."
            className="w-full pl-12 pr-12 py-3 bg-white dark:bg-[#111111] border border-stone-200/60 dark:border-white/[0.08] rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600
                     focus:outline-none focus:border-olive-400 dark:focus:border-olive-600 focus:ring-2 focus:ring-olive-500/10
                     transition-all duration-200 text-sm"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
                icon={Sparkles}
                iconColor="bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400"
                title="Featured Destination"
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
                icon={TrendingUp}
                iconColor="bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400"
                title="Popular Journeys"
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
                icon={Users}
                iconColor="bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400"
                title="Creators to Follow"
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
                icon={Trophy}
                iconColor="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                title="Top Adventurers"
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
