'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Sparkles, TrendingUp, Users, Trophy } from 'lucide-react'
import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { CreatorsToFollowSection } from '@/components/explore/CreatorsToFollowSection'
import { FeaturedDestinationSection } from '@/components/explore/FeaturedDestinationSection'
import { ExploreSearchResults } from '@/components/explore/ExploreSearchResults'
import { ExploreSidebar } from '@/components/explore/ExploreSidebar'
import { Leaderboard } from '@/components/leaderboard/Leaderboard'

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Sync search query with URL params
  useEffect(() => {
    const query = searchParams.get('q') || ''
    setSearchQuery(query)
  }, [searchParams])

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const showDefaultContent = !searchQuery.trim()

  return (
    <div className="min-h-screen bg-white">
      {/* Right Sidebar for My Albums */}
      <ExploreSidebar />

      {/* Main Content - adjusted for sidebar spacing */}
      <div className="xl:mr-[340px]">
        {/* Enhanced Search Bar Section */}
        <div className="relative bg-white border-b border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-cyan-500/5 to-blue-500/5"></div>
          <div className="relative py-6 sm:py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Search Title */}
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Discover Amazing Journeys
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Explore destinations, find travel inspiration, and connect with fellow adventurers
                </p>
              </div>

              {/* Search Input */}
              <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full blur-xl opacity-0 transition-opacity duration-300"
                     style={{ opacity: isFocused ? '0.15' : '0' }}
                />
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Search locations, users, or keywords..."
                    className="w-full pl-14 pr-14 py-4 bg-white border-2 border-gray-200 rounded-full text-gray-900 placeholder:text-gray-400
                             focus:outline-none focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10
                             transition-all duration-300 text-[15px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700
                               transition-colors duration-200 hover:scale-110"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {showDefaultContent ? (
            <div className="space-y-12 sm:space-y-16">
              {/* Featured Destination Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-orange-100 to-pink-100 rounded-lg">
                    <Sparkles className="h-5 w-5 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Featured Destination
                  </h2>
                </div>
                <FeaturedDestinationSection />
              </section>

              {/* Popular Journeys Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Popular Journeys
                    </h2>
                  </div>
                  <Link
                    href="/explore/journeys"
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors duration-200"
                  >
                    View all →
                  </Link>
                </div>
                <PopularJourneysSection limit={3} />
              </section>

              {/* Creators to Follow Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Creators to Follow
                    </h2>
                  </div>
                  <Link
                    href="/explore/creators"
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors duration-200"
                  >
                    View all →
                  </Link>
                </div>
                <CreatorsToFollowSection limit={4} />
              </section>

              {/* Leaderboard Section */}
              <section className="pb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Top Adventurers
                    </h2>
                  </div>
                  <Link
                    href="/explore/leaderboard"
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors duration-200"
                  >
                    View all →
                  </Link>
                </div>
                <Leaderboard limit={10} metric="score" />
              </section>
            </div>
          ) : (
            <ExploreSearchResults query={searchQuery} />
          )}
        </main>
      </div>
    </div>
  )
}
