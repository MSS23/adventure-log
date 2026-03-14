'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Globe as GlobeIcon,
  ArrowRight,
  Compass,
  MapPin,
  Camera,
  Users,
  Share2,
  Stamp,
  Film,
  Upload,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-olive-400 border-t-transparent animate-spin" />
    </div>
  ),
})

// Demo travel locations for the hero globe
const DEMO_LOCATIONS = [
  { lat: 48.8566, lng: 2.3522, name: 'Paris', country: 'FR', size: 0.5 },
  { lat: 41.9028, lng: 12.4964, name: 'Rome', country: 'IT', size: 0.5 },
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo', country: 'JP', size: 0.5 },
  { lat: 40.7128, lng: -74.006, name: 'New York', country: 'US', size: 0.5 },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney', country: 'AU', size: 0.5 },
  { lat: 51.5074, lng: -0.1278, name: 'London', country: 'GB', size: 0.5 },
  { lat: 55.7558, lng: 37.6173, name: 'Moscow', country: 'RU', size: 0.4 },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore', country: 'SG', size: 0.4 },
  { lat: -22.9068, lng: -43.1729, name: 'Rio', country: 'BR', size: 0.4 },
  { lat: 25.2048, lng: 55.2708, name: 'Dubai', country: 'AE', size: 0.4 },
  { lat: 37.5665, lng: 126.978, name: 'Seoul', country: 'KR', size: 0.4 },
  { lat: 13.7563, lng: 100.5018, name: 'Bangkok', country: 'TH', size: 0.4 },
  { lat: 52.52, lng: 13.405, name: 'Berlin', country: 'DE', size: 0.4 },
  { lat: 41.3874, lng: 2.1686, name: 'Barcelona', country: 'ES', size: 0.4 },
  { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires', country: 'AR', size: 0.3 },
  { lat: 28.6139, lng: 77.209, name: 'Delhi', country: 'IN', size: 0.3 },
  { lat: 30.0444, lng: 31.2357, name: 'Cairo', country: 'EG', size: 0.3 },
  { lat: 64.1466, lng: -21.9426, name: 'Reykjavik', country: 'IS', size: 0.3 },
  { lat: -8.3405, lng: 115.092, name: 'Bali', country: 'ID', size: 0.3 },
  { lat: 35.6892, lng: 51.389, name: 'Tehran', country: 'IR', size: 0.3 },
  { lat: 59.9139, lng: 10.7522, name: 'Oslo', country: 'NO', size: 0.3 },
  { lat: -1.2921, lng: 36.8219, name: 'Nairobi', country: 'KE', size: 0.3 },
]

// Demo flight arcs
const DEMO_ARCS = [
  { startLat: 51.5074, startLng: -0.1278, endLat: 40.7128, endLng: -74.006 },
  { startLat: 48.8566, startLng: 2.3522, endLat: 35.6762, endLng: 139.6503 },
  { startLat: 41.9028, startLng: 12.4964, endLat: 25.2048, endLng: 55.2708 },
  { startLat: 40.7128, startLng: -74.006, endLat: -22.9068, endLng: -43.1729 },
  { startLat: 35.6762, startLng: 139.6503, endLat: -33.8688, endLng: 151.2093 },
  { startLat: 1.3521, startLng: 103.8198, endLat: 13.7563, endLng: 100.5018 },
  { startLat: 52.52, startLng: 13.405, endLat: 55.7558, endLng: 37.6173 },
  { startLat: 41.3874, startLng: 2.1686, endLat: 30.0444, endLng: 31.2357 },
]

function getFlag(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

const STATS = [
  { value: '195', label: 'Countries' },
  { value: '3D', label: 'Globe' },
  { value: '∞', label: 'Memories' },
  { value: 'Free', label: 'Forever' },
]

const FEATURES = [
  {
    icon: GlobeIcon,
    title: 'Interactive 3D Globe',
    desc: 'See every trip pinned on a beautiful 3D globe. Spin it, zoom in, relive your journey.',
  },
  {
    icon: Film,
    title: 'Flyover Videos',
    desc: 'Export animated flyovers of your travels. Share stunning globe videos on social media.',
  },
  {
    icon: Upload,
    title: 'Smart Photo Import',
    desc: 'Drop your photos — GPS and dates are extracted automatically. Albums create themselves.',
  },
  {
    icon: Stamp,
    title: 'Travel Passport',
    desc: 'Your travel identity. Countries visited, continents explored, travel personality — all shareable.',
  },
  {
    icon: Users,
    title: 'Collaborative Albums',
    desc: 'Travel with friends? Everyone adds their photos to the same album.',
  },
  {
    icon: Share2,
    title: 'Embeddable Globe',
    desc: 'Put your interactive travel globe on your website, portfolio, or blog with one line of code.',
  },
]

export default function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!mounted || !globeRef.current) return
    const timer = setTimeout(() => {
      if (!globeRef.current) return
      globeRef.current.pointOfView({ lat: 30, lng: 10, altitude: 2.2 }, 0)
      const controls = globeRef.current.controls()
      if (controls) {
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.4
        controls.enableZoom = false
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [mounted])

  return (
    <div className="min-h-screen bg-[#0a0f05] text-white overflow-x-hidden">
      {/* ── Header ── */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#0a0f05]/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-olive-600 flex items-center justify-center">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-white">Adventure Log</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/[0.06] font-medium text-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-olive-600 hover:bg-olive-500 text-white font-medium px-5 rounded-xl text-sm h-9">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero: Globe ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16">
        {/* Globe background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f05] via-transparent to-[#0a0f05] z-10 pointer-events-none" />
          {mounted && (
            <GlobeGL
              ref={globeRef}
              globeImageUrl="/earth-dark.jpg"
              bumpImageUrl="/earth-topology.png"
              backgroundImageUrl={undefined}
              backgroundColor="rgba(10, 15, 5, 1)"
              showAtmosphere={true}
              atmosphereColor="#4A5D23"
              atmosphereAltitude={0.2}
              pointsData={DEMO_LOCATIONS}
              pointAltitude={0.01}
              pointRadius="size"
              pointColor={() => '#99B169'}
              arcsData={DEMO_ARCS}
              arcColor={() => ['rgba(153,177,105,0.3)', 'rgba(153,177,105,0.6)']}
              arcStroke={0.4}
              arcDashLength={0.5}
              arcDashGap={0.3}
              arcDashAnimateTime={3000}
              arcAltitudeAutoScale={0.3}
              enablePointerInteraction={false}
              animateIn={true}
              width={typeof window !== 'undefined' ? window.innerWidth : 1200}
              height={typeof window !== 'undefined' ? window.innerHeight : 800}
            />
          )}
        </div>

        {/* Hero content overlay */}
        <div className="relative z-20 text-center px-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-olive-500/10 border border-olive-500/20 text-olive-300 text-sm font-medium mb-6">
            <GlobeIcon className="h-3.5 w-3.5" />
            Your travel life, on a globe
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6">
            <span className="text-white">Every Trip.</span>
            <br />
            <span className="text-olive-400">One Globe.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-xl mx-auto leading-relaxed mb-10">
            The travel app that turns your adventures into a living, interactive 3D globe.
            See everywhere you&apos;ve been. Share who you are as a traveler.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/signup">
              <Button size="lg" className="bg-olive-600 hover:bg-olive-500 text-white font-semibold px-8 h-13 text-base rounded-2xl shadow-lg shadow-olive-600/20 transition-all hover:-translate-y-0.5 w-full sm:w-auto">
                Start Your Globe
                <ArrowRight className="h-5 w-5 ml-1.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-13 px-8 text-base rounded-2xl border-white/10 text-white/70 hover:text-white hover:bg-white/[0.06] w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Demo flags row */}
          <div className="flex justify-center gap-1 flex-wrap max-w-md mx-auto opacity-60">
            {DEMO_LOCATIONS.slice(0, 14).map(loc => (
              <span key={loc.country} className="text-lg" title={loc.name}>
                {getFlag(loc.country)}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <ChevronDown className="h-5 w-5 text-white/30" />
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative z-10 py-6 border-y border-white/[0.06] bg-[#0a0f05]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-4 gap-4">
          {STATS.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-olive-400">{stat.value}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-24 px-6 lg:px-10 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Not just another travel app
            </h2>
            <p className="text-base text-white/40 max-w-xl mx-auto">
              No competitor has a 3D globe. No competitor lets you export flyover videos.
              No competitor shows your travel identity like this.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white/[0.03] rounded-2xl p-6 border border-white/[0.06] hover:border-olive-500/30 hover:bg-olive-500/[0.04] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-olive-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-olive-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 lg:px-10 border-t border-white/[0.06] relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Three steps to your globe
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Photos', desc: 'Drop your travel photos. GPS coordinates and dates are extracted automatically from EXIF data.' },
              { step: '02', title: 'Albums Appear', desc: 'Photos are grouped into trip albums by location and date. Rename, merge, or reorganize as you like.' },
              { step: '03', title: 'Globe Lights Up', desc: 'Every album pins a location on your 3D globe. Watch your travel map grow with each adventure.' },
            ].map(item => (
              <div key={item.step} className="text-center md:text-left">
                <div className="text-4xl font-bold text-olive-500/20 mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof / Passport Preview ── */}
      <section className="py-24 px-6 lg:px-10 border-t border-white/[0.06] relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Your Travel Passport
              </h2>
              <p className="text-base text-white/40 leading-relaxed mb-6">
                A shareable travel identity that shows who you are as a traveler. Countries visited,
                continents explored, distance traveled, and your travel personality — all on a beautiful
                page you can share anywhere.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {['Globe Trotter', 'Cultural Nomad', 'World Explorer', 'Weekend Warrior', 'Rising Explorer'].map(type => (
                  <span key={type} className="px-3 py-1 rounded-full bg-olive-500/10 border border-olive-500/20 text-olive-300 text-xs font-medium">
                    {type}
                  </span>
                ))}
              </div>
              <Link href="/signup">
                <Button className="bg-olive-600 hover:bg-olive-500 text-white rounded-xl gap-2">
                  Create Your Passport
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {/* Passport preview card */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-olive-600 flex items-center justify-center text-lg font-bold text-white">
                  A
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Adventure Traveler</div>
                  <div className="text-xs text-white/40">Globe Trotter</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: '23', label: 'Countries' },
                  { value: '12k km', label: 'Traveled' },
                  { value: '12%', label: 'of World' },
                ].map(stat => (
                  <div key={stat.label} className="text-center py-2 rounded-lg bg-white/[0.03]">
                    <div className="text-lg font-bold text-olive-400">{stat.value}</div>
                    <div className="text-[10px] text-white/30 uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {['FR','IT','JP','US','AU','GB','DE','ES','TH','BR','KR','AE'].map(code => (
                  <span key={code} className="text-lg">{getFlag(code)}</span>
                ))}
              </div>
              <div className="flex gap-2">
                {['Europe', 'Asia', 'N. America', 'Oceania'].map(c => (
                  <span key={c} className="px-2 py-0.5 rounded text-[10px] bg-olive-500/10 text-olive-300 border border-olive-500/20">
                    {c} ✓
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 lg:px-10 border-t border-white/[0.06] relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Start mapping your adventures
          </h2>
          <p className="text-base text-white/40 mb-8">
            Free forever. No ads. Your travel story deserves better than a flat map.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-olive-600 hover:bg-olive-500 text-white font-semibold px-10 h-14 text-lg rounded-2xl shadow-lg shadow-olive-600/20 transition-all hover:-translate-y-0.5">
              Get Started — It&apos;s Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-olive-600 flex items-center justify-center">
              <Compass className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm text-white/40">Adventure Log</span>
          </div>
          <div className="flex gap-6 text-sm text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
          </div>
          <div className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Adventure Log
          </div>
        </div>
      </footer>
    </div>
  )
}
