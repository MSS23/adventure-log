'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Globe, MapPin, Camera, Plane, Users, Share2, Copy, Check, ArrowRight,
  Stamp, Trophy, Calendar
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function countryCodeToFlag(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function formatDistance(km: number): string {
  if (km >= 10000) return `${(km / 1000).toFixed(0)}k`
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`
  return km.toLocaleString()
}

const continentEmoji: Record<string, string> = {
  'Europe': '🏰', 'Asia': '🏯', 'North America': '🗽',
  'South America': '🌿', 'Africa': '🦁', 'Oceania': '🏝️',
}

interface Props {
  user: { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null; created_at: string }
  countryCodes: string[]
  cities: string[]
  totalAlbums: number
  totalPhotos: number
  totalDistance: number
  followerCount: number
  continentsVisited: string[]
  personality: string
  firstTrip: { title: string; location: string | null; date: string } | null
  latestTrip: { title: string; location: string | null; date: string } | null
  memberSince: string
}

export function PublicPassportContent({
  user, countryCodes, cities, totalAlbums, totalPhotos, totalDistance,
  followerCount, continentsVisited, personality, firstTrip, latestTrip, memberSince
}: Props) {
  const displayName = user.display_name || user.username
  const [copied, setCopied] = useState(false)
  const worldPercent = Math.round((countryCodes.length / 195) * 100)

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const text = `Check out ${displayName}'s Travel Passport: ${countryCodes.length} countries, ${totalAlbums} adventures, and a "${personality}" personality!`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName}'s Travel Passport`, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* cancelled */ }
  }

  const allContinents = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania']

  return (
    <div className="min-h-screen bg-[#F5F7F0] dark:bg-black">
      {/* Hero */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-olive-900 via-olive-800 to-olive-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.2)_0%,_transparent_60%)]" />

        <div className="relative max-w-3xl mx-auto px-6 pt-14 pb-20 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Stamp className="h-5 w-5 text-olive-300" />
              <span className="text-olive-300 text-sm font-semibold uppercase tracking-wider">Travel Passport</span>
            </div>
            <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-white/20 shadow-2xl">
              <AvatarImage src={getPhotoUrl(user.avatar_url) || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl bg-olive-600 text-white font-heading">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{displayName}</h1>
            <p className="text-olive-300 mb-3">@{user.username}</p>
          </motion.div>

          {/* Personality badge */}
          <motion.div
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Trophy className="h-4 w-4 text-olive-300" />
            <span className="text-white font-semibold">{personality}</span>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-auto block" preserveAspectRatio="none">
            <path d="M0 60V20C240 0 480 0 720 10C960 20 1200 40 1440 30V60H0Z" className="fill-[#F5F7F0] dark:fill-black" />
          </svg>
        </div>
      </motion.section>

      <div className="max-w-3xl mx-auto px-6">
        {/* Stats bar */}
        <motion.div
          className="-mt-6 relative z-10 bg-white dark:bg-[#111] rounded-2xl shadow-lg border border-stone-200/60 dark:border-stone-800 p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { icon: Globe, value: countryCodes.length, label: 'Countries' },
              { icon: MapPin, value: cities.length, label: 'Cities' },
              { icon: Camera, value: totalPhotos, label: 'Photos' },
              { icon: Plane, value: `${formatDistance(totalDistance)}km`, label: 'Traveled' },
              { icon: Users, value: followerCount, label: 'Followers' },
              { icon: Globe, value: `${worldPercent}%`, label: 'of World' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <stat.icon className="h-4 w-4 mx-auto mb-1 text-olive-500" />
                <p className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* World Coverage Ring */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8"
                className="text-stone-200 dark:text-stone-800" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8"
                className="text-olive-500"
                strokeDasharray={`${worldPercent * 3.27} ${327 - worldPercent * 3.27}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-stone-900 dark:text-white">{worldPercent}%</span>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Explored</span>
            </div>
          </div>
        </motion.div>

        {/* Continent Progress */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Continents</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allContinents.map((continent, i) => {
              const visited = continentsVisited.includes(continent)
              return (
                <motion.div
                  key={continent}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    visited
                      ? "bg-olive-50 dark:bg-olive-950/30 border-olive-200 dark:border-olive-800"
                      : "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-50"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: visited ? 1 : 0.5, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <span className="text-xl">{continentEmoji[continent] || '🌍'}</span>
                  <div>
                    <p className={cn("text-sm font-medium", visited ? "text-olive-800 dark:text-olive-200" : "text-stone-400")}>
                      {continent}
                    </p>
                    <p className="text-xs text-stone-400">
                      {visited ? '✓ Visited' : 'Not yet'}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Country Passport Strip */}
        {countryCodes.length > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Countries Visited</h2>
            <div className="flex flex-wrap gap-2">
              {countryCodes.map((code, i) => (
                <motion.span
                  key={code}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-[#111] border border-stone-200 dark:border-stone-800 rounded-full px-3 py-1.5 text-sm shadow-sm"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.02 }}
                >
                  <span className="text-lg leading-none">{countryCodeToFlag(code)}</span>
                  <span className="text-stone-600 dark:text-stone-300 font-medium">{code}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Travel Timeline */}
        {(firstTrip || latestTrip) && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Journey</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {firstTrip && (
                <div className="bg-white dark:bg-[#111] rounded-xl border border-stone-200 dark:border-stone-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-olive-500" />
                    <span className="text-xs text-stone-500 uppercase tracking-wider">First Adventure</span>
                  </div>
                  <p className="font-semibold text-stone-900 dark:text-white">{firstTrip.title}</p>
                  {firstTrip.location && (
                    <p className="text-sm text-stone-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {firstTrip.location.split(',')[0]}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">
                    {new Date(firstTrip.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {latestTrip && latestTrip !== firstTrip && (
                <div className="bg-white dark:bg-[#111] rounded-xl border border-stone-200 dark:border-stone-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-olive-500" />
                    <span className="text-xs text-stone-500 uppercase tracking-wider">Latest Adventure</span>
                  </div>
                  <p className="font-semibold text-stone-900 dark:text-white">{latestTrip.title}</p>
                  {latestTrip.location && (
                    <p className="text-sm text-stone-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {latestTrip.location.split(',')[0]}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">
                    {new Date(latestTrip.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Share + CTA */}
        <motion.div
          className="mb-8 flex flex-col sm:flex-row items-center gap-3 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button onClick={handleShare} variant="outline" className="rounded-xl gap-2">
            {copied ? <Check className="h-4 w-4 text-olive-500" /> : <Share2 className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share Passport'}
          </Button>
          <Button onClick={() => {
            const url = typeof window !== 'undefined'
              ? `${window.location.origin}/u/${user.username}`
              : `/u/${user.username}`
            navigator.clipboard?.writeText(url)
          }} variant="outline" className="rounded-xl gap-2">
            <Copy className="h-4 w-4" />
            Copy Profile Link
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="text-center py-10 border-t border-stone-200/60 dark:border-stone-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <p className="text-xs text-stone-400 mb-1">
            Member since {new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">
            Powered by{' '}
            <Link href="/" className="text-olive-600 dark:text-olive-400 hover:text-olive-700 font-semibold transition-colors">
              Adventure Log
            </Link>
          </p>
          <Link href="/signup">
            <Button className="bg-olive-600 hover:bg-olive-700 text-white px-8 rounded-xl shadow-md gap-2">
              Create Your Passport
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.footer>
      </div>
    </div>
  )
}
