import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Camera, Map, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <Globe className="h-6 w-6 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">Adventure Log</span>
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium hover:text-blue-600 transition-colors"
            href="/login"
          >
            Sign In
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Journeys Into
            <span className="text-blue-600"> Beautiful Stories</span>
          </h1>
          <p className="text-xl text-gray-800 mb-8 max-w-2xl mx-auto">
            Share your travel adventures with interactive albums, stunning photo galleries, 
            and an immersive 3D globe that brings your journeys to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Your Adventure
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Everything you need to share your adventures
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Camera className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Photo Albums</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create stunning albums with drag-and-drop photo uploads and automatic location tagging
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>3D Globe</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Visualize your travels on an interactive 3D globe showing all the places you&apos;ve been
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Map className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Smart Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic GPS extraction from photos with reverse geocoding for city and country names
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Social Features</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Follow friends, like adventures, and get inspired by the global travel community
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to start your adventure log?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of travelers already sharing their stories
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-white">
        <div className="max-w-6xl mx-auto text-center text-gray-800">
          <p>&copy; 2024 Adventure Log. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}