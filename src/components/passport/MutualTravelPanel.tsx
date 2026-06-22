'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plane, MapPin, Sparkles, Compass } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName } from '@/lib/utils/display-name'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { log } from '@/lib/utils/logger'

/**
 * "Places you've both been" — shown when a logged-in viewer looks at someone
 * else's public passport (e.g. after scanning their QR). Intersects the
 * viewer's visited countries/cities with the passport owner's (public) ones.
 *
 * No API/migration needed: the owner's public country/city lists arrive as
 * props (already rendered on the page), and the viewer's own albums are
 * RLS-readable by themselves.
 */

interface Props {
  ownerId: string
  ownerName: string
  ownerAvatarUrl: string | null
  ownerUsername: string
  ownerCountryCodes: string[]
  ownerCities: string[]
}

const norm = (s: string) => s.split(',')[0].trim().toLowerCase()

export function MutualTravelPanel({
  ownerId,
  ownerName,
  ownerAvatarUrl,
  ownerUsername,
  ownerCountryCodes,
  ownerCities,
}: Props) {
  const { user: currentUser, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [shared, setShared] = useState<{ countries: string[]; cities: string[] } | null>(null)

  const isViewer = !!currentUser && currentUser.id !== ownerId

  useEffect(() => {
    if (!isViewer) {
      setLoading(false)
      return
    }
    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('albums')
          .select('country_code, location_name')
          .eq('user_id', currentUser!.id)
          .not('country_code', 'is', null)

        if (error) throw error

        const myCodes = new Set(
          (data || []).map((a) => a.country_code?.toUpperCase()).filter(Boolean) as string[]
        )
        const myCities = new Set(
          (data || []).map((a) => (a.location_name ? norm(a.location_name) : '')).filter(Boolean)
        )

        const ownerCodes = [...new Set(ownerCountryCodes.map((c) => c.toUpperCase()))]
        const sharedCountries = ownerCodes.filter((c) => myCodes.has(c))
        const sharedCities = [
          ...new Set(ownerCities.filter((city) => myCities.has(norm(city)))),
        ]

        if (!cancelled) setShared({ countries: sharedCountries, cities: sharedCities })
      } catch (error) {
        log.error(
          'Failed to compute mutual travel',
          { component: 'MutualTravelPanel', action: 'compute' },
          error as Error
        )
        if (!cancelled) setShared({ countries: [], cities: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isViewer, currentUser, ownerId, ownerCountryCodes, ownerCities])

  // Only for logged-in viewers looking at someone else's passport.
  if (!isViewer) return null

  const viewerName = getDisplayName(profile?.display_name, profile?.username) || 'You'
  const viewerAvatar = getAvatarUrl(profile?.avatar_url, profile?.username)
  const count = shared?.countries.length ?? 0
  const hasOverlap = count > 0

  return (
    <motion.div
      className="-mt-6 relative z-10 mb-8 overflow-hidden rounded-2xl border border-[color:var(--color-coral)]/25 bg-gradient-to-br from-[color:var(--color-coral)]/10 via-card to-[color:var(--color-gold)]/10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="p-5 sm:p-6">
        {/* Two travelers, connected by a dashed flight path */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-4">
          <Avatar className="size-12 ring-2 ring-background shadow-sm">
            <AvatarImage src={viewerAvatar} alt={viewerName} />
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
              {viewerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="relative flex-1 max-w-[140px] flex items-center justify-center">
            <div className="h-px w-full border-t-2 border-dashed border-[color:var(--color-coral)]/40" />
            <motion.div
              className="absolute"
              initial={{ left: '0%', opacity: 0 }}
              animate={{ left: '100%', opacity: 1 }}
              transition={{ delay: 0.5, duration: 1.1, ease: 'easeInOut' }}
              style={{ transform: 'translateX(-50%)' }}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-[color:var(--color-coral)] text-white shadow-md">
                <Plane className="size-3.5 -rotate-12" />
              </span>
            </motion.div>
          </div>

          <Avatar className="size-12 ring-2 ring-background shadow-sm">
            <AvatarImage src={getAvatarUrl(ownerAvatarUrl, ownerUsername)} alt={ownerName} />
            <AvatarFallback className="bg-olive-200 text-olive-800 text-sm font-semibold">
              {ownerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Headline */}
        <div className="text-center mb-4">
          <p className="al-eyebrow text-[10px] mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="size-3 text-[color:var(--color-coral)]" />
            Where your paths cross
          </p>
          {loading ? (
            <div className="mx-auto h-7 w-44 rounded-md bg-muted animate-pulse" />
          ) : hasOverlap ? (
            <h2 className="al-display text-2xl sm:text-3xl leading-tight">
              You&apos;ve both explored{' '}
              <span className="text-[color:var(--color-coral)]">
                {count} {count === 1 ? 'country' : 'countries'}
              </span>
            </h2>
          ) : (
            <h2 className="al-display text-xl sm:text-2xl leading-tight">
              Your paths haven&apos;t crossed{' '}
              <span className="text-[color:var(--color-coral)]">yet</span>
            </h2>
          )}
        </div>

        {/* Shared countries */}
        {!loading && hasOverlap && (
          <div className="flex flex-wrap justify-center gap-2">
            {shared!.countries.map((code, i) => (
              <motion.div
                key={code}
                className="flex items-center gap-1.5 rounded-full border border-[color:var(--color-coral)]/25 bg-card/70 backdrop-blur-sm px-3 py-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.04, type: 'spring', stiffness: 220, damping: 16 }}
              >
                <span className="text-lg leading-none">{getFlagEmoji(code)}</span>
                <span className="text-xs font-semibold text-foreground">{getCountryName(code)}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Shared cities */}
        {!loading && hasOverlap && shared!.cities.length > 0 && (
          <motion.p
            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <MapPin className="size-3.5 text-[color:var(--color-coral)] shrink-0" />
            <span>
              Same cities:{' '}
              <span className="font-medium text-foreground">
                {shared!.cities.slice(0, 4).map((c) => c.split(',')[0]).join(' · ')}
              </span>
              {shared!.cities.length > 4 && ` +${shared!.cities.length - 4} more`}
            </span>
          </motion.p>
        )}

        {/* Empty state */}
        {!loading && !hasOverlap && (
          <p className="text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-1.5 w-full">
            <Compass className="size-3.5 text-[color:var(--color-coral)]" />
            Be the first to follow in {ownerName}&apos;s footsteps — their countries are below.
          </p>
        )}
      </div>
    </motion.div>
  )
}
