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
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const GlobeGL = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-olive-400/40 border-t-olive-400 animate-spin" />
    </div>
  ),
})

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
  { lat: 59.9139, lng: 10.7522, name: 'Oslo', country: 'NO', size: 0.3 },
  { lat: -1.2921, lng: 36.8219, name: 'Nairobi', country: 'KE', size: 0.3 },
]

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

const FEATURES = [
  {
    icon: GlobeIcon,
    title: 'Interactive 3D Globe',
    desc: 'Every trip pinned on a beautiful 3D globe. Spin, zoom, relive your journeys.',
  },
  {
    icon: Film,
    title: 'Flyover Videos',
    desc: 'Export cinematic flyovers of your travels to share on social media.',
  },
  {
    icon: Upload,
    title: 'Smart Photo Import',
    desc: 'Drop photos — GPS and dates extracted automatically. Albums create themselves.',
  },
  {
    icon: Stamp,
    title: 'Travel Passport',
    desc: 'Countries visited, continents explored, travel personality — all shareable.',
  },
  {
    icon: Users,
    title: 'Collaborative Albums',
    desc: 'Travel with friends? Everyone contributes their photos to the same album.',
  },
  {
    icon: Share2,
    title: 'Embeddable Globe',
    desc: 'Put your interactive travel globe on any website with one line of code.',
  },
]

export default function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [globeSize, setGlobeSize] = useState({ w: 1200, h: 800 })

  useEffect(() => {
    setMounted(true)
    setGlobeSize({ w: window.innerWidth, h: window.innerHeight })

    const handleScroll = () => setScrolled(window.scrollY > 20)
    const handleResize = () => setGlobeSize({ w: window.innerWidth, h: window.innerHeight })

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
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

  // Force dark context so heading colors resolve correctly
  return (
    <div className="dark">
      <div className="min-h-screen bg-[#060a03] text-stone-100 overflow-x-hidden selection:bg-olive-500/30 selection:text-white">

        {/* ── Header ── */}
        <header className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-[#060a03]/90 backdrop-blur-2xl border-b border-white/[0.05] shadow-2xl shadow-black/20"
            : "bg-transparent"
        )}>
          <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-olive-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <Compass className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-heading font-bold text-white tracking-tight">Adventure Log</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="cursor-pointer text-stone-400 hover:text-white hover:bg-white/[0.06] font-medium text-sm h-9 px-4 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a03]">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="cursor-pointer bg-olive-600 hover:bg-olive-500 text-white font-medium px-5 rounded-xl text-sm h-9 shadow-lg shadow-olive-900/30 transition-all duration-200 hover:shadow-olive-800/40 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a03]">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-16">
          {/* Globe background */}
          <div className="absolute inset-0 z-0 opacity-70">
            {/* Radial vignette */}
            <div className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, #060a03 75%)',
              }}
            />
            {/* Top/bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#060a03] via-transparent to-[#060a03] z-10 pointer-events-none opacity-60" />
            {mounted && (
              <GlobeGL
                ref={globeRef}
                globeImageUrl="/earth-dark.jpg"
                bumpImageUrl="/earth-topology.png"
                backgroundImageUrl={undefined}
                backgroundColor="rgba(6, 10, 3, 1)"
                showAtmosphere={true}
                atmosphereColor="#4A5D23"
                atmosphereAltitude={0.18}
                pointsData={DEMO_LOCATIONS}
                pointAltitude={0.01}
                pointRadius="size"
                pointColor={() => '#99B169'}
                arcsData={DEMO_ARCS}
                arcColor={() => ['rgba(153,177,105,0.2)', 'rgba(153,177,105,0.5)']}
                arcStroke={0.4}
                arcDashLength={0.5}
                arcDashGap={0.3}
                arcDashAnimateTime={3000}
                arcAltitudeAutoScale={0.3}
                enablePointerInteraction={false}
                animateIn={true}
                width={globeSize.w}
                height={globeSize.h}
              />
            )}
          </div>

          {/* Hero content */}
          <div className="relative z-20 text-center px-6 max-w-3xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-olive-500/10 border border-olive-500/15 text-olive-300 text-xs sm:text-sm font-medium mb-8 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Your travel life, on a globe
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.04em] leading-[0.92] mb-7 !text-white">
              <span className="block">Every Trip.</span>
              <span className="block text-olive-400">One Globe.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-stone-400 max-w-lg mx-auto leading-relaxed mb-10">
              Turn your adventures into a living, interactive 3D globe.
              See everywhere you&apos;ve been. Share who you are as a traveler.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Link href="/signup">
                <Button size="lg" className="cursor-pointer bg-olive-600 hover:bg-olive-500 !text-white font-semibold px-8 h-13 text-base rounded-2xl shadow-xl shadow-olive-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-olive-800/50 active:scale-[0.97] w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a03]">
                  Start Your Globe
                  <ArrowRight className="h-5 w-5 ml-1.5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="cursor-pointer h-13 px-8 text-base rounded-2xl border-white/10 !text-stone-300 hover:!text-white hover:bg-white/[0.06] hover:border-white/20 w-full sm:w-auto transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a03]">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Country flags */}
            <div className="flex justify-center gap-1.5 flex-wrap max-w-sm mx-auto">
              {DEMO_LOCATIONS.slice(0, 14).map(loc => (
                <span key={loc.country} className="text-base sm:text-lg opacity-50 hover:opacity-100 transition-opacity cursor-default" title={loc.name}>
                  {getFlag(loc.country)}
                </span>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce opacity-40">
            <ChevronDown className="h-5 w-5 text-stone-400" />
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <section className="relative z-10 py-8 border-y border-white/[0.04] bg-[#060a03]/90 backdrop-blur-2xl">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: '195', label: 'Countries' },
              { value: '3D', label: 'Globe' },
              { value: '∞', label: 'Memories' },
              { value: 'Free', label: 'Forever' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-olive-400 tracking-tight">{stat.value}</div>
                <div className="text-[11px] text-stone-500 uppercase tracking-[0.15em] mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section className="py-24 sm:py-32 px-6 lg:px-10 relative z-10">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-olive-950/5 to-transparent pointer-events-none" />

          <div className="max-w-6xl mx-auto relative">
            <div className="text-center mb-16">
              <p className="text-olive-400 text-sm font-medium uppercase tracking-[0.15em] mb-4">Why Adventure Log</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold !text-white tracking-tight mb-5">
                Not just another travel app
              </h2>
              <p className="text-base text-stone-500 max-w-prose mx-auto leading-relaxed">
                No competitor has a 3D globe. No competitor lets you export flyover videos.
                No competitor shows your travel identity like this.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group bg-white/[0.02] rounded-2xl p-6 border border-white/[0.05] hover:border-olive-500/25 hover:bg-olive-500/[0.03] hover:shadow-lg hover:shadow-olive-900/10 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-olive-500/10 border border-olive-500/10 flex items-center justify-center mb-4 group-hover:bg-olive-500/15 transition-colors">
                    <feature.icon className="h-5 w-5 text-olive-400" />
                  </div>
                  <h3 className="text-[15px] font-semibold !text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24 sm:py-32 px-6 lg:px-10 border-t border-white/[0.04] relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-olive-400 text-sm font-medium uppercase tracking-[0.15em] mb-4">How It Works</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold !text-white tracking-tight">
                Three steps to your globe
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-10 md:gap-8">
              {[
                { step: '01', icon: Camera, title: 'Upload Photos', desc: 'Drop your travel photos. GPS coordinates and dates are extracted automatically from EXIF data.' },
                { step: '02', icon: MapPin, title: 'Albums Appear', desc: 'Photos are grouped into trip albums by location and date. Rename, merge, or reorganize freely.' },
                { step: '03', icon: GlobeIcon, title: 'Globe Lights Up', desc: 'Every album pins a location on your 3D globe. Watch your travel map grow with each adventure.' },
              ].map(item => (
                <div key={item.step} className="text-center md:text-left">
                  <div className="inline-flex md:flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-olive-500/10 border border-olive-500/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-olive-400" />
                    </div>
                    <span className="text-xs font-bold text-olive-500/40 uppercase tracking-widest">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold !text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Passport Preview ── */}
        <section className="py-24 sm:py-32 px-6 lg:px-10 border-t border-white/[0.04] relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <p className="text-olive-400 text-sm font-medium uppercase tracking-[0.15em] mb-4">Travel Passport</p>
                <h2 className="text-3xl md:text-4xl font-bold !text-white tracking-tight mb-5">
                  Your travel identity,
                  <br />beautifully shareable
                </h2>
                <p className="text-base text-stone-500 leading-relaxed mb-8">
                  Countries visited, continents explored, distance traveled, and your unique
                  travel personality — all on a beautiful page you can share anywhere.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {['Globe Trotter', 'Cultural Nomad', 'World Explorer', 'Weekend Warrior'].map(type => (
                    <span key={type} className="px-3 py-1 rounded-full bg-olive-500/8 border border-olive-500/15 text-olive-300 text-xs font-medium">
                      {type}
                    </span>
                  ))}
                </div>
                <Link href="/signup">
                  <Button className="cursor-pointer bg-olive-600 hover:bg-olive-500 !text-white rounded-xl gap-2 shadow-lg shadow-olive-900/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a03]">
                    Create Your Passport
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Passport preview card */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-olive-600 to-olive-700 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-olive-900/30">
                    A
                  </div>
                  <div>
                    <div className="text-sm font-semibold !text-white">Adventure Traveler</div>
                    <div className="text-xs text-stone-500">Globe Trotter</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '23', label: 'Countries' },
                    { value: '12k km', label: 'Traveled' },
                    { value: '12%', label: 'of World' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <div className="text-lg font-bold text-olive-400">{stat.value}</div>
                      <div className="text-[10px] text-stone-600 uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['FR','IT','JP','US','AU','GB','DE','ES','TH','BR','KR','AE'].map(code => (
                    <span key={code} className="text-lg">{getFlag(code)}</span>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['Europe', 'Asia', 'N. America', 'Oceania'].map(c => (
                    <span key={c} className="px-2.5 py-1 rounded-lg text-[10px] bg-olive-500/8 text-olive-300/80 border border-olive-500/10 font-medium">
                      {c} ✓
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-24 sm:py-32 px-6 lg:px-10 border-t border-white/[0.04] relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold !text-white tracking-tight mb-5">
              Start mapping your
              <br />adventures today
            </h2>
            <p className="text-base text-stone-500 mb-10 max-w-prose mx-auto leading-relaxed">
              Free forever. No ads. Your travel story deserves better than a flat map.
            </p>
            <Link href="/signup">
              <Button size="lg" className="cursor-pointer bg-olive-600 hover:bg-olive-500 !text-white font-semibold px-10 h-14 text-lg rounded-2xl shadow-xl shadow-olive-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-olive-800/50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a03]">
                Get Started — It&apos;s Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-10 px-6 lg:px-10 border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-olive-600 flex items-center justify-center">
                <Compass className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm text-stone-600">Adventure Log</span>
            </div>
            <div className="flex gap-6 text-sm text-stone-600">
              <Link href="/privacy" className="hover:text-stone-400 transition-colors duration-200 focus-visible:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 rounded-sm">Privacy</Link>
              <Link href="/terms" className="hover:text-stone-400 transition-colors duration-200 focus-visible:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 rounded-sm">Terms</Link>
              <Link href="/contact" className="hover:text-stone-400 transition-colors duration-200 focus-visible:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 rounded-sm">Contact</Link>
            </div>
            <div className="text-xs text-stone-700">
              &copy; {new Date().getFullYear()} Adventure Log
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
