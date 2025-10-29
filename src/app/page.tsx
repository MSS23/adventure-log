import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Globe as GlobeIcon, Image as ImageIcon, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center border-b border-gray-200">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <GlobeIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Adventure Log
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          <Link
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            href="/login"
          >
            Sign In
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold px-6 shadow-lg shadow-teal-500/30">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            {/* Hero Image with Gradient Overlay */}
            <div className="relative h-[500px] md:h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/80 to-pink-900/70" />
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop')"
                }}
              />

              {/* Hero Content */}
              <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 max-w-4xl leading-tight">
                  Transform Your Journeys Into Beautiful Stories
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl">
                  Join thousands of travelers documenting and sharing their adventures on an interactive 3D globe.
                </p>
                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold px-10 py-6 text-lg shadow-2xl shadow-teal-500/50 transition-all hover:scale-105">
                    Get Started for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 lg:px-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your Entire Adventure, Beautifully Mapped
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Discover the core features that make Adventure Log the perfect companion for documenting your travels.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Photo Albums Feature */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6">
                <ImageIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Photo Albums</h3>
              <p className="text-gray-600 leading-relaxed">
                Create stunning, location-based photo galleries that bring your travel stories to life.
              </p>
            </div>

            {/* 3D Globe Feature */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-6">
                <GlobeIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3D Globe</h3>
              <p className="text-gray-600 leading-relaxed">
                Visualize your entire journey on an interactive and beautifully rendered 3D globe.
              </p>
            </div>

            {/* Smart Locations Feature */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-6">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Locations</h3>
              <p className="text-gray-600 leading-relaxed">
                Benefit from automatic location tagging and intelligent organization of your travel spots.
              </p>
            </div>

            {/* Social Features */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Social Features</h3>
              <p className="text-gray-600 leading-relaxed">
                Share your journeys with friends, family, and a community of fellow travelers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <GlobeIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Adventure Log
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              <Link href="/terms" className="hover:text-teal-600 transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-teal-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-teal-600 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>&copy; 2024 Adventure Log. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}