import { Metadata } from 'next'
import { SearchBar } from '@/components/explore/SearchBar'
import { PopularJourneysSection } from '@/components/explore/PopularJourneysSection'
import { CreatorsToFollowSection } from '@/components/explore/CreatorsToFollowSection'
import { FeaturedDestinationSection } from '@/components/explore/FeaturedDestinationSection'

export const metadata: Metadata = {
  title: 'Explore - Adventure Log',
  description: 'Discover popular journeys, connect with fellow travelers, and find your next adventure destination.',
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-12">
          <SearchBar />
        </div>

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
