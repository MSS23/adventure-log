'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { CreatorsToFollowSection } from '@/components/explore/CreatorsToFollowSection'
import { FeaturedDestinationSection } from '@/components/explore/FeaturedDestinationSection'
import { UserNav } from '@/components/layout/UserNav'
import { ExploreSearchResults } from '@/components/explore/ExploreSearchResults'

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const showDefaultContent = !searchQuery.trim()

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/feed" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">AL</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Adventure Log</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <Link
                href="/feed"
                className="text-gray-500 hover:text-gray-900 transition-colors font-normal"
              >
                Home
              </Link>
              <Link
                href="/albums"
                className="text-gray-500 hover:text-gray-900 transition-colors font-normal"
              >
                My Log
              </Link>
              <Link
                href="/explore"
                className="text-teal-600 font-medium border-b-2 border-teal-600 pb-0.5"
              >
                Explore
              </Link>
            </nav>

            {/* User Navigation */}
            <UserNav />
          </div>
        </div>
      </header>

      {/* Search Bar Section */}
      <div className="bg-gray-50 py-6 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations, users, or keywords..."
              className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-full text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showDefaultContent ? (
          <>
            {/* Popular Journeys Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Popular Journeys
              </h2>
              <PopularJourneysSection limit={3} />
            </section>

            {/* Creators to Follow Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Creators to Follow
              </h2>
              <CreatorsToFollowSection limit={4} />
            </section>

            {/* Featured Destination Section */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Featured Destination
              </h2>
              <FeaturedDestinationSection />
            </section>
          </>
        ) : (
          <ExploreSearchResults query={searchQuery} />
        )}
      </main>
    </div>
  )
}
