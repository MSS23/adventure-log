'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  Images,
  Globe2,
  MapPin,
  Camera,
  Route,
  Calendar,
  BarChart3,
  TrendingUp,
  Heart,
  MessageCircle,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { ErrorBoundary } from '@/components/ui/error-boundary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TravelStats {
  totalAlbums: number
  totalPhotos: number
  totalCountries: number
  totalCities: number
  totalDistance: number
  avgTripDuration: number
  photosByYear: { year: string; count: number }[]
  topDestinations: { country_code: string; country_name: string; count: number }[]
  averagePhotosPerAlbum: number
  heatmapData: Record<string, number>
  photosByMonth: { month: string; count: number }[]
  followerCount: number
  followingCount: number
  totalLikes: number
  totalComments: number
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------
function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) { setCount(value); return }
    const step = value / (duration * 60)
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= value) { setCount(value); clearInterval(timer) }
      else { setCount(Math.floor(current)) }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration, prefersReducedMotion])

  return <span>{count.toLocaleString()}</span>
}

// ---------------------------------------------------------------------------
// Heatmap calendar
// ---------------------------------------------------------------------------
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function TravelHeatmap({ data, year }: { data: Record<string, number>; year: number }) {
  const CELL = 11  // cell size in px
  const GAP = 3    // gap between cells

  const cells = useMemo(() => {
    const result: { date: string; count: number; dayOfWeek: number; week: number }[] = []
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    const firstDayOffset = (startDate.getDay() + 6) % 7

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = (d.getDay() + 6) % 7
      const dayOfYear = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      result.push({
        date: dateStr,
        count: data[dateStr] || 0,
        dayOfWeek,
        week: Math.floor((dayOfYear + firstDayOffset) / 7),
      })
    }
    return result
  }, [data, year])

  const maxCount = Math.max(...Object.values(data), 1)
  const totalWeeks = cells.length > 0 ? cells[cells.length - 1].week + 1 : 53
  const activeDays = useMemo(() => cells.filter(c => c.count > 0).length, [cells])

  function getColor(count: number): string {
    if (count === 0) return 'bg-stone-100 dark:bg-stone-800/60'
    const ratio = count / maxCount
    if (ratio > 0.75) return 'bg-olive-600 dark:bg-olive-400'
    if (ratio > 0.5) return 'bg-olive-500 dark:bg-olive-500'
    if (ratio > 0.25) return 'bg-olive-300 dark:bg-olive-600'
    return 'bg-olive-200 dark:bg-olive-700'
  }

  // Group cells into weeks for rendering
  const weeks = useMemo(() => {
    const w: (typeof cells[0] | null)[][] = Array.from({ length: totalWeeks }, () => Array(7).fill(null))
    for (const cell of cells) {
      w[cell.week][cell.dayOfWeek] = cell
    }
    return w
  }, [cells, totalWeeks])

  // Month label positions — find the first week of each month
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIdx: number }[] = []
    let lastMonth = -1
    for (const cell of cells) {
      const m = new Date(cell.date).getMonth()
      if (m !== lastMonth) {
        labels.push({ month: MONTH_LABELS[m], weekIdx: cell.week })
        lastMonth = m
      }
    }
    return labels
  }, [cells])

  const DAY_LABEL_W = 20 // px for M/W/F column
  const gridW = totalWeeks * (CELL + GAP) - GAP

  return (
    <div>
      {/* Active days summary */}
      <div className="flex items-baseline gap-1.5 mb-4">
        <span className="text-2xl font-bold text-stone-900 dark:text-white">{activeDays}</span>
        <span className="text-sm text-stone-400">active days in {year}</span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div style={{ minWidth: gridW + DAY_LABEL_W + 8 }}>
          {/* Month labels row */}
          <div className="flex mb-2" style={{ paddingLeft: DAY_LABEL_W + 4 }}>
            {monthLabels.map((m, i) => {
              const nextWeek = i < monthLabels.length - 1 ? monthLabels[i + 1].weekIdx : totalWeeks
              const span = nextWeek - m.weekIdx
              return (
                <div
                  key={`${m.month}-${i}`}
                  className="text-[11px] text-stone-400 dark:text-stone-500 font-medium"
                  style={{ width: span * (CELL + GAP) }}
                >
                  {m.month}
                </div>
              )
            })}
          </div>

          {/* Grid rows (Mon–Sun) */}
          <div className="flex flex-col" style={{ gap: GAP }}>
            {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
              <div key={dayIdx} className="flex items-center" style={{ gap: GAP }}>
                {/* Day label */}
                <div
                  className="text-[10px] text-stone-400 dark:text-stone-500 text-right shrink-0"
                  style={{ width: DAY_LABEL_W }}
                >
                  {dayIdx === 0 ? 'M' : dayIdx === 2 ? 'W' : dayIdx === 4 ? 'F' : ''}
                </div>

                {/* Week cells for this day */}
                {weeks.map((week, weekIdx) => {
                  const cell = week[dayIdx]
                  if (!cell) {
                    return <div key={weekIdx} style={{ width: CELL, height: CELL }} />
                  }
                  return (
                    <div
                      key={weekIdx}
                      className={cn(
                        'rounded-sm transition-all duration-150 hover:ring-1 hover:ring-olive-400/50',
                        cell.count > 0 && 'cursor-pointer',
                        getColor(cell.count)
                      )}
                      style={{ width: CELL, height: CELL }}
                      title={`${new Date(cell.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${cell.count} ${cell.count === 1 ? 'activity' : 'activities'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-3 text-[11px] text-stone-400 dark:text-stone-500">
            <span>Less</span>
            {[
              'bg-stone-100 dark:bg-stone-800/60',
              'bg-olive-200 dark:bg-olive-700',
              'bg-olive-300 dark:bg-olive-600',
              'bg-olive-500 dark:bg-olive-500',
              'bg-olive-600 dark:bg-olive-400',
            ].map((c, i) => (
              <div key={i} className={cn('rounded-sm', c)} style={{ width: CELL, height: CELL }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------
function Section({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      className={cn(
        'rounded-2xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-800/80 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-sm',
        className
      )}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay }}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-stone-900 dark:text-white flex items-center gap-2 mb-5">
      <Icon className="h-5 w-5 text-olive-500" />
      {children}
    </h2>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<TravelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear())
  const prefersReducedMotion = useReducedMotion()
  const isAuthLoading = authLoading || profileLoading

  useEffect(() => {
    if (!user) return

    const fetchAnalytics = async () => {
      try {
        setLoading(true)

        const { data: albums, error: albumsError } = await supabase
          .from('albums')
          .select('id, title, location_name, country_code, latitude, longitude, date_start, date_end, created_at, photos(id, taken_at, created_at)')
          .eq('user_id', user.id)
          .order('date_start', { ascending: true })

        if (albumsError) throw albumsError

        const { data: photos } = await supabase
          .from('photos')
          .select('id, taken_at, created_at, album_id')
          .eq('user_id', user.id)

        const [likesResult, commentsResult, followersResult, followingResult] = await Promise.all([
          supabase.from('likes').select('id').eq('target_type', 'album').in('target_id', (albums || []).map(a => a.id)),
          supabase.from('comments').select('id').eq('target_type', 'album').in('target_id', (albums || []).map(a => a.id)),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id).eq('status', 'accepted'),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id).eq('status', 'accepted'),
        ])

        const totalAlbums = albums?.length || 0
        const totalPhotos = photos?.length || 0
        const countries = new Set(albums?.filter(a => a.country_code).map(a => a.country_code) || [])
        const cities = new Set(albums?.filter(a => a.location_name).map(a => a.location_name) || [])

        let totalDistance = 0
        const sorted = [...(albums || [])].sort((a, b) => new Date(a.date_start || a.created_at).getTime() - new Date(b.date_start || b.created_at).getTime())
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1], curr = sorted[i]
          if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
            totalDistance += haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
          }
        }

        let totalTripDays = 0, tripsWithDuration = 0
        albums?.forEach(album => {
          if (album.date_start && album.date_end) {
            const days = Math.ceil((new Date(album.date_end).getTime() - new Date(album.date_start).getTime()) / (1000 * 60 * 60 * 24))
            if (days > 0 && days < 365) { totalTripDays += days; tripsWithDuration++ }
          }
        })

        // Photos by year — use album trip date, not photo upload/taken date
        const photosByYearMap: Record<string, number> = {}
        const currentYear = new Date().getFullYear()
        for (let y = 2020; y <= currentYear; y++) photosByYearMap[y.toString()] = 0
        // Build album date lookup: album_id → date_start
        const albumDateMap: Record<string, string | null> = {}
        albums?.forEach(a => { albumDateMap[a.id] = a.date_start || a.created_at })
        photos?.forEach(p => {
          const date = albumDateMap[p.album_id] || p.taken_at || p.created_at
          if (date) {
            const y = new Date(date).getFullYear().toString()
            if (y in photosByYearMap) photosByYearMap[y] = (photosByYearMap[y] || 0) + 1
          }
        })

        // Top destinations
        const countryCount: Record<string, number> = {}
        albums?.forEach(a => { if (a.country_code) countryCount[a.country_code] = (countryCount[a.country_code] || 0) + 1 })
        const topDestinations = Object.entries(countryCount)
          .map(([country_code, count]) => ({ country_code, country_name: getCountryName(country_code), count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

        // Heatmap data
        const heatmapData: Record<string, number> = {}
        albums?.forEach(album => {
          if (album.date_start) {
            const start = new Date(album.date_start)
            const end = album.date_end ? new Date(album.date_end) : start
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const key = d.toISOString().split('T')[0]
              heatmapData[key] = (heatmapData[key] || 0) + 1
            }
          }
        })
        photos?.forEach(p => {
          const date = albumDateMap[p.album_id] || p.taken_at || p.created_at
          if (date) { const key = new Date(date).toISOString().split('T')[0]; heatmapData[key] = (heatmapData[key] || 0) + 1 }
        })

        // Photos by month
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthCount: Record<string, number> = {}
        monthNames.forEach(m => (monthCount[m] = 0))
        photos?.forEach(p => {
          const date = albumDateMap[p.album_id] || p.taken_at || p.created_at
          if (date) { const m = monthNames[new Date(date).getMonth()]; monthCount[m] = (monthCount[m] || 0) + 1 }
        })

        setStats({
          totalAlbums,
          totalPhotos,
          totalCountries: countries.size,
          totalCities: cities.size,
          totalDistance: Math.round(totalDistance),
          avgTripDuration: tripsWithDuration > 0 ? Math.round(totalTripDays / tripsWithDuration) : 0,
          photosByYear: Object.entries(photosByYearMap).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year)),
          topDestinations,
          averagePhotosPerAlbum: totalAlbums > 0 ? Math.round(totalPhotos / totalAlbums) : 0,
          heatmapData,
          photosByMonth: monthNames.map(month => ({ month, count: monthCount[month] })),
          followerCount: followersResult.count || 0,
          followingCount: followingResult.count || 0,
          totalLikes: likesResult.data?.length || 0,
          totalComments: commentsResult.data?.length || 0,
        })

        log.info('Analytics loaded', { component: 'AnalyticsPage', userId: user.id, totalAlbums })
      } catch (error) {
        log.error('Failed to load analytics', { component: 'AnalyticsPage', userId: user?.id, error })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, supabase])

  // --- Auth / Loading / Error states ---
  if (!isAuthLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-7 w-7 text-stone-400" />
          </div>
          <p className="text-stone-500 dark:text-stone-400 mb-4">Log in to view your analytics</p>
          <Link href="/login"><Button className="cursor-pointer bg-olive-600 hover:bg-olive-700 active:scale-[0.97] text-white transition-all duration-200">Log In</Button></Link>
        </div>
      </div>
    )
  }

  if (loading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div
            className="h-10 w-10 rounded-full border-3 border-olive-200 dark:border-olive-800 border-t-olive-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-stone-500 dark:text-stone-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Globe2 className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 dark:text-stone-400">Unable to load analytics</p>
        </div>
      </div>
    )
  }

  const maxPhotoCount = Math.max(...stats.photosByYear.map(y => y.count), 1)
  const maxMonthCount = Math.max(...stats.photosByMonth.map(m => m.count), 1)
  const maxCountryCount = Math.max(...stats.topDestinations.map(d => d.count), 1)
  const worldPercentage = Math.round((stats.totalCountries / 195) * 100 * 10) / 10

  return (
    <ErrorBoundary>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 md:pb-8 pt-4 sm:pt-6">
        {/* Page Header */}
        <motion.div
          className="mb-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Your travel stats at a glance</p>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { icon: Images, value: stats.totalAlbums, label: 'Albums' },
            { icon: Camera, value: stats.totalPhotos, label: 'Photos' },
            { icon: Globe2, value: stats.totalCountries, label: 'Countries' },
            { icon: MapPin, value: stats.totalCities, label: 'Cities' },
            { icon: Route, value: stats.totalDistance, label: 'km Traveled' },
            { icon: Calendar, value: stats.avgTripDuration, label: 'Avg Days/Trip' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              className="rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white dark:bg-stone-800/80 p-4 hover:border-olive-300/50 dark:hover:border-olive-700/40 hover:shadow-sm transition-all duration-200"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
            >
              <card.icon className="h-5 w-5 text-olive-500 mb-2" />
              <div className="text-2xl font-bold text-stone-900 dark:text-white">
                <AnimatedCounter value={card.value} duration={0.6} />
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Activity Heatmap ── */}
        <Section className="mb-6" delay={0.1}>
          <div className="flex items-center justify-between mb-6">
            <SectionTitle icon={Calendar}>Travel Activity</SectionTitle>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setHeatmapYear(y => y - 1)} className="cursor-pointer h-8 w-8 p-0 text-xs active:scale-[0.93] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500" aria-label="Previous year">&larr;</Button>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 min-w-[3.5rem] text-center tabular-nums">{heatmapYear}</span>
              <Button variant="outline" size="sm" onClick={() => setHeatmapYear(y => Math.min(y + 1, new Date().getFullYear()))} disabled={heatmapYear >= new Date().getFullYear()} className="cursor-pointer h-8 w-8 p-0 text-xs active:scale-[0.93] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-olive-500" aria-label="Next year">&rarr;</Button>
            </div>
          </div>
          <TravelHeatmap data={stats.heatmapData} year={heatmapYear} />
        </Section>

        {/* ── Two Column: Destinations + Photos by Month ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Destinations */}
          <Section delay={0.15}>
            <div className="flex items-center justify-between mb-5">
              <SectionTitle icon={Globe2}>Top Destinations</SectionTitle>
              <div className="text-right">
                <p className="text-xl font-bold text-olive-600 dark:text-olive-400">{worldPercentage}%</p>
                <p className="text-[11px] text-stone-400">of the world</p>
              </div>
            </div>
            <div className="space-y-3">
              {stats.topDestinations.map((dest) => {
                const widthPct = (dest.count / maxCountryCount) * 100
                return (
                  <div key={dest.country_code}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getFlagEmoji(dest.country_code)}</span>
                        <span className="text-sm text-stone-700 dark:text-stone-300">{dest.country_name}</span>
                      </div>
                      <span className="text-xs text-stone-400">{dest.count} {dest.count === 1 ? 'album' : 'albums'}</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-olive-500 dark:bg-olive-400"
                        initial={prefersReducedMotion ? { width: `${widthPct}%` } : { width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
              {stats.topDestinations.length === 0 && (
                <p className="text-stone-400 text-sm text-center py-6">No country data yet</p>
              )}
            </div>
          </Section>

          {/* Photos by Month */}
          <Section delay={0.2}>
            <SectionTitle icon={Camera}>Photos by Month</SectionTitle>
            <div className="flex items-end justify-between gap-1 h-[140px]">
              {stats.photosByMonth.map((m) => {
                const heightPct = maxMonthCount > 0 ? (m.count / maxMonthCount) * 100 : 0
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end group cursor-pointer">
                    <div className="text-[10px] text-stone-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {m.count || ''}
                    </div>
                    <motion.div
                      className="w-full rounded-t bg-olive-500 dark:bg-olive-400 group-hover:bg-olive-600 dark:group-hover:bg-olive-300 transition-colors duration-200"
                      initial={prefersReducedMotion ? { height: `${Math.max(heightPct, m.count > 0 ? 8 : 0)}%` } : { height: 0 }}
                      animate={{ height: `${Math.max(heightPct, m.count > 0 ? 8 : 0)}%` }}
                      transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.3 }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-700 pt-2 mt-1">
              {stats.photosByMonth.map(m => (
                <div key={m.month} className="flex-1 text-center">
                  <span className="text-[10px] text-stone-400">{m.month}</span>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-stone-100 dark:border-stone-700">
              <div className="text-center">
                <p className="text-xl font-bold text-stone-900 dark:text-white">{stats.averagePhotosPerAlbum}</p>
                <p className="text-xs text-stone-400">Avg photos/album</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-stone-900 dark:text-white">
                  {stats.photosByYear.reduce((max, y) => y.count > max.count ? y : max, stats.photosByYear[0])?.year || '—'}
                </p>
                <p className="text-xs text-stone-400">Most active year</p>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Two Column: Photos by Year + Social ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photos by Year */}
          <Section className="lg:col-span-2" delay={0.25}>
            <SectionTitle icon={TrendingUp}>Photos by Year</SectionTitle>
            <div className="flex items-end justify-between gap-3 h-[180px]">
              {stats.photosByYear.map((yearData) => {
                const heightPct = maxPhotoCount > 0 ? (yearData.count / maxPhotoCount) * 100 : 0
                const isHighest = yearData.count === maxPhotoCount && yearData.count > 0
                return (
                  <div key={yearData.year} className="flex-1 flex flex-col items-center justify-end group cursor-pointer">
                    <div className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 font-medium">
                      {yearData.count || ''}
                    </div>
                    <motion.div
                      className={cn(
                        'w-full rounded-t-lg',
                        isHighest
                          ? 'bg-olive-600 dark:bg-olive-400'
                          : 'bg-olive-400 dark:bg-olive-600 group-hover:bg-olive-500 dark:group-hover:bg-olive-500 transition-colors duration-200'
                      )}
                      initial={prefersReducedMotion ? { height: `${Math.max(heightPct, yearData.count > 0 ? 10 : 0)}%` } : { height: 0 }}
                      animate={{ height: `${Math.max(heightPct, yearData.count > 0 ? 10 : 0)}%` }}
                      transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.3 }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-700 pt-2.5 mt-1">
              {stats.photosByYear.map(y => (
                <div key={y.year} className="flex-1 text-center">
                  <span className="text-xs text-stone-500 dark:text-stone-400">{y.year}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Social Overview */}
          <Section delay={0.3}>
            <SectionTitle icon={Users}>Social</SectionTitle>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-stone-50 dark:bg-stone-700/40 rounded-xl p-3 text-center transition-colors duration-200 hover:bg-stone-100 dark:hover:bg-stone-700/60">
                <p className="text-2xl font-bold text-stone-900 dark:text-white">
                  <AnimatedCounter value={stats.followerCount} />
                </p>
                <p className="text-xs text-stone-500">Followers</p>
              </div>
              <div className="bg-stone-50 dark:bg-stone-700/40 rounded-xl p-3 text-center transition-colors duration-200 hover:bg-stone-100 dark:hover:bg-stone-700/60">
                <p className="text-2xl font-bold text-stone-900 dark:text-white">
                  <AnimatedCounter value={stats.followingCount} />
                </p>
                <p className="text-xs text-stone-500">Following</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-red-400" /> Likes Received
                </span>
                <span className="text-sm font-semibold text-stone-900 dark:text-white">{stats.totalLikes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-olive-400" /> Comments
                </span>
                <span className="text-sm font-semibold text-stone-900 dark:text-white">{stats.totalComments}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </ErrorBoundary>
  )
}
