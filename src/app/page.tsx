import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Globe as GlobeIcon, Image as ImageIcon, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <GlobeIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Adventure Log
          </span>
        </Link>
        <nav className="ml-auto">
          <Link href="/login">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 rounded-lg">
              Sign In
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-24">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            {/* Hero Image with Gradient Overlay */}
            <div className="relative h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-purple-800/85 to-pink-700/80" />
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop')"
                }}
              />

              {/* Hero Content */}
              <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 max-w-4xl leading-tight">
                  Transform Your Journeys Into Beautiful Stories
                </h1>
                <p className="text-lg text-white/95 mb-8 max-w-2xl">
                  Join thousands of travelers documenting and sharing their adventures on an interactive 3D globe.
                </p>
                <Link href="/signup">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-6 text-base rounded-lg shadow-xl transition-all hover:scale-105">
                    Get Started for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Your Entire Adventure, Beautifully Mapped
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Discover the core features that make Adventure Log the perfect companion for documenting your travels.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Photo Albums Feature */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                <ImageIcon className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Photo Albums</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Create stunning, location-based photo galleries that bring your travel stories to life.
              </p>
            </div>

            {/* 3D Globe Feature */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <GlobeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">3D Globe</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Visualize your entire journey on an interactive and beautifully rendered 3D globe.
              </p>
            </div>

            {/* Smart Locations Feature */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Locations</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Benefit from automatic location tagging and intelligent organization of your travel spots.
              </p>
            </div>

            {/* Social Features */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Social Features</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Share your journeys with friends, family, and a community of fellow travelers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 lg:px-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 mb-6">
            <Link href="/contact" className="hover:text-gray-900 transition-colors">
              Contact Us
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2024 Adventure Log. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}