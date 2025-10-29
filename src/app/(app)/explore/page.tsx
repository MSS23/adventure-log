import { Metadata } from 'next'
import Link from 'next/link'
import { SearchBar } from '@/components/explore/SearchBar'
import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { CreatorsToFollowSection } from '@/components/explore/CreatorsToFollowSection'
import { FeaturedDestinationSection } from '@/components/explore/FeaturedDestinationSection'
import { UserNav } from '@/components/layout/UserNav'

export const metadata: Metadata = {
  title: 'Explore - Adventure Log',
  description: 'Discover popular journeys, connect with fellow travelers, and find your next adventure destination.',
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Header with Navigation Links */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Adventure Log</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm absolute left-1/2 -translate-x-1/2">
            <Link href="/feed" className="text-gray-600 hover:text-gray-900 transition-colors">
              Home
            </Link>
            <Link href="/albums" className="text-gray-600 hover:text-gray-900 transition-colors">
              My Log
            </Link>
            <Link href="/explore" className="text-teal-600 font-medium">
              Explore
            </Link>
          </nav>

          {/* User Avatar */}
          <UserNav />
        </div>
      </header>

      {/* Search Section - Full width with centered search bar */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <SearchBar placeholder="Search locations, users, or keywords..." />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Popular Journeys Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Popular Journeys
            </h2>
            <p className="text-gray-600 mt-1">
              Explore inspiring travel albums from our community
            </p>
          </div>
          <PopularJourneysSection limit={6} />
        </section>

        {/* Creators to Follow Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Creators to Follow
            </h2>
            <p className="text-gray-600 mt-1">
              Connect with fellow adventurers and travel enthusiasts
            </p>
          </div>
          <CreatorsToFollowSection limit={8} />
        </section>

        {/* Featured Destination Section */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Featured Destination
            </h2>
            <p className="text-gray-600 mt-1">
              Discover this week&apos;s highlighted travel destination
            </p>
          </div>
          <FeaturedDestinationSection />
        </section>
      </main>
    </div>
  )
}
