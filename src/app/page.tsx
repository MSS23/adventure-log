import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Globe as GlobeIcon, Image as ImageIcon, Users, ArrowRight, Compass } from 'lucide-react'

// Landing page for Adventure Log
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F7F0] dark:bg-black">
      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-olive-700 flex items-center justify-center">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-heading font-bold text-olive-900 dark:text-olive-100">
            Adventure Log
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-olive-700 dark:text-olive-300 font-medium">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-olive-700 hover:bg-olive-800 text-white font-medium px-6 rounded-xl">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 text-sm font-medium">
              <GlobeIcon className="h-4 w-4" />
              Your journeys, beautifully mapped
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-olive-950 dark:text-white leading-[1.1] tracking-tight">
              Transform Your
              <span className="block text-olive-600 dark:text-olive-400">Adventures</span>
              Into Stories
            </h1>
            <p className="text-lg text-olive-700/80 dark:text-olive-300/80 max-w-lg leading-relaxed">
              Join thousands of travelers documenting and sharing their adventures on an interactive 3D globe. Every trip deserves to be remembered.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-olive-700 hover:bg-olive-800 text-white font-semibold px-8 h-14 text-base rounded-2xl shadow-lg shadow-olive-700/20 transition-all hover:shadow-xl hover:shadow-olive-700/30 hover:-translate-y-0.5">
                  Start Your Log
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-2xl border-olive-300 dark:border-olive-700 text-olive-700 dark:text-olive-300 hover:bg-olive-50 dark:hover:bg-olive-900/20">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-olive-900/15 aspect-[4/3]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop')"
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-olive-950/70 via-olive-900/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                  <MapPin className="h-4 w-4" />
                  Swiss Alps, Switzerland
                </div>
                <p className="text-white font-heading font-bold text-2xl">Mountain Expedition</p>
              </div>
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-6 -left-4 bg-white dark:bg-[#111111] rounded-2xl p-4 shadow-xl border border-olive-100 dark:border-white/[0.08]">
              <div className="text-2xl font-bold text-olive-800 dark:text-olive-200">127</div>
              <div className="text-sm text-olive-600 dark:text-olive-400">Countries explored</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 lg:px-12 bg-white dark:bg-[#111111]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-olive-950 dark:text-olive-50 mb-4">
              Everything You Need to Document Your Travels
            </h2>
            <p className="text-base text-olive-600 dark:text-olive-400 max-w-2xl mx-auto">
              Powerful features designed for travelers who want to preserve and share their adventures.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ImageIcon,
                title: 'Photo Albums',
                desc: 'Create stunning, location-based photo galleries that bring your travel stories to life.',
                gradient: 'from-olive-100 to-olive-200 dark:from-olive-900/30 dark:to-olive-800/30',
                iconColor: 'text-olive-700 dark:text-olive-300',
              },
              {
                icon: GlobeIcon,
                title: '3D Globe',
                desc: 'Visualize your entire journey on an interactive and beautifully rendered 3D globe.',
                gradient: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30',
                iconColor: 'text-emerald-700 dark:text-emerald-300',
              },
              {
                icon: MapPin,
                title: 'Smart Locations',
                desc: 'Automatic location tagging and intelligent organization of your travel spots.',
                gradient: 'from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30',
                iconColor: 'text-lime-700 dark:text-lime-300',
              },
              {
                icon: Users,
                title: 'Social Features',
                desc: 'Share your journeys with friends, family, and a community of fellow travelers.',
                gradient: 'from-olive-100 to-stone-200 dark:from-olive-900/30 dark:to-stone-800/30',
                iconColor: 'text-olive-700 dark:text-stone-300',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-[#F5F7F0] dark:bg-[#0A0A0A] rounded-2xl p-6 border border-olive-100 dark:border-white/[0.06] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-olive-900 dark:text-olive-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-olive-600 dark:text-olive-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-olive-200 dark:border-white/[0.06] bg-[#F5F7F0] dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-olive-600 dark:text-olive-400 mb-6">
            <Link href="/contact" className="hover:text-olive-900 dark:hover:text-olive-200 transition-colors">
              Contact Us
            </Link>
            <Link href="/privacy" className="hover:text-olive-900 dark:hover:text-olive-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-olive-900 dark:hover:text-olive-200 transition-colors">
              Terms of Service
            </Link>
          </div>

          <div className="text-center text-sm text-olive-500 dark:text-olive-500">
            <p>&copy; 2024 Adventure Log. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
