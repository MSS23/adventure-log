'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Users, Loader2, Calendar, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/avatar'
import type { Trip, TripMember, TripPin } from '@/types/trips'

const TripMap = dynamic(() => import('@/components/trips/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-olive-50 dark:bg-olive-950/20 rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
    </div>
  ),
})

interface Props {
  trip: Trip
  members: TripMember[]
  pins: TripPin[]
}

export default function PublicTripView({ trip, members, pins }: Props) {
  const colorByUser = useMemo(() => {
    const m = new Map<string, string>()
    for (const member of members) m.set(member.user_id, member.color)
    return m
  }, [members])

  const memberByUser = useMemo(() => {
    const m = new Map<string, TripMember>()
    for (const member of members) m.set(member.user_id, member)
    return m
  }, [members])

  const dateRange = useMemo(() => {
    if (!trip.start_date) return null
    const start = new Date(trip.start_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    if (!trip.end_date) return start
    const end = new Date(trip.end_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${start} – ${end}`
  }, [trip.start_date, trip.end_date])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{trip.cover_emoji || '🗺️'}</span>
          <div>
            <h1 className="text-3xl font-bold text-olive-950 dark:text-olive-50">{trip.title}</h1>
            {dateRange && (
              <p className="text-sm text-olive-600 dark:text-olive-400 flex items-center gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateRange}
              </p>
            )}
          </div>
        </div>
        {trip.description && (
          <p className="text-base text-olive-700 dark:text-olive-300 max-w-3xl">{trip.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-olive-600 dark:text-olive-400">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {pins.length} places
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {members.length} {members.length === 1 ? 'planner' : 'planners'}
          </span>
          {trip.status === 'live' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE NOW
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-stone-200 dark:border-white/10 text-xs"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: member.color }}
              />
              <span>{member.user?.display_name || member.user?.username || 'Unknown'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-[500px]">
          <TripMap pins={pins} members={members} />
        </div>
        <div className="lg:col-span-2">
          <div className="border border-stone-200 dark:border-white/10 rounded-xl bg-white dark:bg-stone-900 overflow-hidden">
            <div className="p-4 border-b border-stone-200 dark:border-white/10">
              <h2 className="font-semibold text-olive-950 dark:text-olive-50">All places</h2>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-white/5 max-h-[440px] overflow-y-auto">
              {pins.length === 0 ? (
                <p className="p-6 text-center text-sm text-olive-500">No pins yet.</p>
              ) : (
                pins.map((pin, idx) => {
                  const color = colorByUser.get(pin.user_id) || '#2563eb'
                  const member = memberByUser.get(pin.user_id)
                  return (
                    <div key={pin.id} className="flex items-start gap-3 p-3">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-olive-950 dark:text-olive-50">{pin.name}</div>
                        {pin.note && (
                          <div className="text-xs text-olive-600 dark:text-olive-400 mt-0.5">{pin.note}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage
                              src={getAvatarUrl(
                                member?.user?.avatar_url,
                                member?.user?.username
                              )}
                              alt={member?.user?.display_name || member?.user?.username || 'Planner'}
                            />
                            <AvatarFallback className="text-[10px]">
                              {(member?.user?.display_name || member?.user?.username || '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-olive-500">
                            {member?.user?.display_name || member?.user?.username || 'Unknown'}
                          </span>
                          {pin.visited_at && (
                            <span className="text-[11px] text-green-600 font-medium">✓ Visited</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-4 relative overflow-hidden rounded-xl shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-olive-800 via-olive-700 to-olive-900" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.3)_0%,_transparent_60%)]" />
            <div className="relative p-5">
              <span className="al-eyebrow text-olive-200 mb-2 block">Like this trip?</span>
              <p className="al-display text-lg text-white mb-1.5">Plan your next one together</p>
              <p className="text-sm text-white/85 leading-relaxed mb-4">
                Map places with friends, live-log as you go, and turn every trip into a story worth sharing.
              </p>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-1.5 bg-white text-olive-800 hover:bg-olive-50 font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-olive-800"
              >
                Start free — no credit card
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
