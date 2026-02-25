'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { useWrappedData } from '@/lib/hooks/useWrappedData'
import { WrappedSlide } from '@/components/wrapped/WrappedSlide'
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Download,
  Loader2,
  MapPin,
  Camera,
  Globe,
  Sparkles,
  Plane,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const GRADIENTS = [
  'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700',
  'bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-600',
  'bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600',
  'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700',
  'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600',
  'bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-600',
]

export default function WrappedPage() {
  const { user, profile } = useAuth()
  const data = useWrappedData(user?.id)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('right')

  const displayName = profile?.display_name || profile?.username || 'Traveler'

  const goNext = useCallback(() => {
    setDirection('right')
    setCurrentSlide(prev => prev + 1)
  }, [])

  const goPrev = useCallback(() => {
    setDirection('left')
    setCurrentSlide(prev => prev - 1)
  }, [])

  const handleShare = async () => {
    const shareText = `My ${data.year} Travel Wrapped: ${data.totalTrips} trips, ${data.countryCodes.length} countries, ${data.totalPhotos} photos! I'm a "${data.personality}" - check yours on Adventure Log!`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s ${data.year} Travel Wrapped`,
          text: shareText,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        toast.success('Copied to clipboard!')
      }
    } catch {
      // User cancelled
    }
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  if (data.totalTrips === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8">
        <Plane className="h-16 w-16 text-teal-400 mb-6" />
        <h1 className="text-3xl font-bold mb-3">No Trips Yet in {data.year}</h1>
        <p className="text-slate-300 text-center mb-8 max-w-md">
          Start logging your adventures to see your year-in-review! Every trip you create will be part of your travel story.
        </p>
        <Link href="/albums/new">
          <Button className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 text-lg">
            Create Your First Album
          </Button>
        </Link>
      </div>
    )
  }

  const slides = [
    // Slide 0: Intro
    () => (
      <WrappedSlide gradient={GRADIENTS[0]} direction={direction}>
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <motion.div
            className="text-7xl mb-6"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            &#9992;
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black mb-4">
            Your {data.year}
          </h1>
          <h2 className="text-2xl md:text-3xl font-light opacity-80">Travel Wrapped</h2>
          <p className="mt-6 text-lg opacity-60">{displayName}</p>
        </motion.div>
      </WrappedSlide>
    ),

    // Slide 1: Total Trips
    () => (
      <WrappedSlide gradient={GRADIENTS[1]} direction={direction}>
        <motion.div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <p className="text-xl opacity-70 mb-2">This year you went on</p>
          <motion.p
            className="text-8xl md:text-9xl font-black"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            {data.totalTrips}
          </motion.p>
          <p className="text-2xl font-light mt-2">
            {data.totalTrips === 1 ? 'adventure' : 'adventures'}
          </p>
        </motion.div>
      </WrappedSlide>
    ),

    // Slide 2: Countries
    () => (
      <WrappedSlide gradient={GRADIENTS[2]} direction={direction}>
        <motion.div className="text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <p className="text-xl opacity-70 mb-2">You explored</p>
          <motion.p
            className="text-8xl md:text-9xl font-black"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            {data.countryCodes.length}
          </motion.p>
          <p className="text-2xl font-light mt-2">
            {data.countryCodes.length === 1 ? 'country' : 'countries'}
          </p>
          {data.countryCodes.length > 0 && (
            <motion.div
              className="flex flex-wrap justify-center gap-3 mt-8 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {data.countryCodes.map((code, i) => (
                <motion.span
                  key={code}
                  className="text-4xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                >
                  {countryCodeToFlag(code)}
                </motion.span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </WrappedSlide>
    ),

    // Slide 3: Photos
    () => (
      <WrappedSlide gradient={GRADIENTS[3]} direction={direction}>
        <motion.div className="text-center">
          <Camera className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <p className="text-xl opacity-70 mb-2">You captured</p>
          <motion.p
            className="text-8xl md:text-9xl font-black"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            {data.totalPhotos}
          </motion.p>
          <p className="text-2xl font-light mt-2">
            {data.totalPhotos === 1 ? 'moment' : 'moments'}
          </p>
          <motion.p
            className="text-sm opacity-50 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.8 }}
          >
            Every photo tells a story
          </motion.p>
        </motion.div>
      </WrappedSlide>
    ),

    // Slide 4: Travel Calendar
    () => (
      <WrappedSlide gradient={GRADIENTS[4]} direction={direction}>
        <motion.div className="text-center w-full max-w-sm">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <p className="text-xl opacity-70 mb-6">Your travel calendar</p>
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES.map((month, i) => {
              const isActive = data.travelMonths.includes(i + 1)
              return (
                <motion.div
                  key={month}
                  className={`py-3 px-2 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-white/30 text-white'
                      : 'bg-white/5 text-white/30'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05, type: 'spring' }}
                >
                  {month}
                </motion.div>
              )
            })}
          </div>
          <motion.p
            className="text-lg mt-6 opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1 }}
          >
            You traveled in {data.travelMonths.length} {data.travelMonths.length === 1 ? 'month' : 'months'}
          </motion.p>
        </motion.div>
      </WrappedSlide>
    ),

    // Slide 5: Personality + Share
    () => (
      <WrappedSlide gradient={GRADIENTS[5]} direction={direction}>
        <motion.div className="text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <p className="text-xl opacity-70 mb-2">Your travel personality is</p>
          <motion.h2
            className="text-5xl md:text-6xl font-black mb-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            {data.personality}
          </motion.h2>

          {/* Summary stats */}
          <motion.div
            className="flex gap-6 justify-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="text-center">
              <p className="text-3xl font-bold">{data.totalTrips}</p>
              <p className="text-xs opacity-60">Trips</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{data.countryCodes.length}</p>
              <p className="text-xs opacity-60">Countries</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{data.totalPhotos}</p>
              <p className="text-xs opacity-60">Photos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{data.cities.length}</p>
              <p className="text-xs opacity-60">Cities</p>
            </div>
          </motion.div>

          {/* Share buttons */}
          <motion.div
            className="flex gap-3 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={handleShare}
              className="bg-white text-purple-700 hover:bg-white/90 font-semibold px-6"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Your Wrapped
            </Button>
            {user && (
              <Button
                onClick={() => {
                  const url = `/api/travel-card?userId=${user.id}`
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${displayName}-${data.year}-wrapped.png`
                  a.click()
                  toast.success('Downloading your travel card!')
                }}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Card
              </Button>
            )}
          </motion.div>
        </motion.div>
      </WrappedSlide>
    ),
  ]

  const totalSlides = slides.length

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Close button */}
      <div className="absolute top-4 right-4 z-50">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
            Close
          </Button>
        </Link>
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-3">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%' }}
              transition={{ duration: i === currentSlide ? 0.5 : 0 }}
            />
          </div>
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <div key={currentSlide} className="absolute inset-0">
            {slides[currentSlide]()}
          </div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="absolute inset-0 flex items-stretch pointer-events-none z-40">
        {/* Left tap zone */}
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="w-1/3 pointer-events-auto opacity-0 cursor-pointer disabled:cursor-default"
          aria-label="Previous slide"
        />
        {/* Right tap zone */}
        <button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          className="w-2/3 pointer-events-auto opacity-0 cursor-pointer disabled:cursor-default"
          aria-label="Next slide"
        />
      </div>

      {/* Arrow navigation (desktop) */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-50">
        <Button
          onClick={goPrev}
          disabled={currentSlide === 0}
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 rounded-full h-12 w-12"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <span className="text-white/40 text-sm self-center">
          {currentSlide + 1} / {totalSlides}
        </span>
        <Button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 rounded-full h-12 w-12"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
