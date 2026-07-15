'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Camera,
  Globe,
  Users,
  Map,
  Copy,
  Check,
  Code,
  Share2,
  Compass,
  CalendarDays,
  ArrowRight,
  Plane,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserActionsMenu } from '@/components/social/UserActionsMenu'
import { ProfileGlobe } from '@/components/globe/ProfileGlobe'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getFlagEmoji } from '@/lib/utils/country'
import { getDisplayInitial } from '@/lib/utils/display-name'
import { formatDistanceKm } from '@/lib/utils/geoCalculations'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { FoundingExplorerBadge } from '@/components/profile/FoundingExplorerBadge'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import { formatTravelDate } from '@/lib/utils/travel-date'
import Image from 'next/image'
import Link from 'next/link'

interface PublicAlbum {
  id: string
  title: string
  cover_photo_url: string | null
  location_name: string | null
  country_code: string | null
  date_start: string | null
  created_at: string
  latitude: number | null
  longitude: number | null
  // Journey link for the globe's travel lines; optional so callers that
  // don't select it still typecheck (the globe just draws no legs).
  connected_from_album_id?: string | null
}

interface PublicUser {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  privacy_level: string | null
  // Optional so callers that don't select it still typecheck; the founding
  // badge simply doesn't render without it.
  created_at?: string | null
}

interface PublicProfileContentProps {
  user: PublicUser
  albums: PublicAlbum[]
  countryCodes: string[]
  followerCount: number
  totalDistance: number
}

export function PublicProfileContent({
  user,
  albums,
  countryCodes,
  followerCount,
  totalDistance,
}: PublicProfileContentProps) {
  const displayName = user.display_name || user.username
  // Any non-public account (private or friends-only) hides its albums from
  // non-followers. RLS already returns zero albums here; this just shows the
  // correct "follow to see" lock instead of an empty-state.
  const isPrivate = user.privacy_level !== 'public'
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  // getWebOrigin (not window.location.origin — capacitor://localhost in the
  // APK); ?ref= credits the profile owner, so signups from a shared profile
  // auto-follow them.
  const profileUrl = withRef(`${getWebOrigin()}/u/${user.username}`, user.username)

  const embedCode = `<iframe src="${getWebOrigin()}/embed/${user.username}" width="100%" height="500" style="border:none;border-radius:12px;" title="${displayName}'s Travel Map"></iframe>`

  const copyToClipboard = async (text: string, type: 'url' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'url') {
        trackGrowthEvent('share_link_created', { meta: { surface: 'public_profile' } })
      }
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedEmbed(true)
        setTimeout(() => setCopiedEmbed(false), 2000)
      }
    } catch {
      // Fallback: do nothing
    }
  }

  // One-tap share: native share sheet on mobile (WhatsApp/Messages/etc.),
  // clipboard copy + confirmation as the desktop fallback. This is the
  // lowest-friction way for a visitor to pass the profile along.
  const handleShareProfile = async () => {
    const shareData = {
      title: `${displayName} on Adventure Log`,
      text: `Check out ${displayName}'s travels on Adventure Log 🌍`,
      url: profileUrl,
    }
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData)
        trackGrowthEvent('share_link_created', { meta: { surface: 'public_profile' } })
        return
      } catch {
        // User cancelled or share unavailable — fall through to copy.
      }
    }
    copyToClipboard(profileUrl, 'url')
  }

  const stats = [
    { icon: Camera, value: albums.length, label: 'Adventures' },
    { icon: Globe, value: countryCodes.length, label: 'Countries' },
    { icon: Users, value: followerCount, label: 'Followers' },
    { icon: Plane, value: formatDistanceKm(totalDistance), label: 'traveled' },
  ]

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* ───────── Hero Section ───────── */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Gradient backdrop — Field Notebook forest */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom right, var(--color-forest-deep), var(--color-forest), var(--color-forest-deep))' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.3)_0%,_transparent_60%)]" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative inline-block mb-6">
              <Avatar className="relative w-28 h-28 ring-4 ring-white/30">
                <AvatarImage
                  src={getAvatarUrl(user.avatar_url, user.username)}
                  alt={displayName}
                />
                <AvatarFallback className="bg-accent text-3xl text-accent-foreground font-heading">
                  {getDisplayInitial(user.display_name, user.username)}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h1 className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-white mb-2">
              {displayName}
            </h1>
            <p className="text-white/85 text-lg mb-4 flex items-center justify-center gap-2">
              @{user.username}
              <FoundingExplorerBadge createdAt={user.created_at} />
            </p>
            {user.bio && (
              <p className="text-white/90 max-w-prose mx-auto text-lg leading-relaxed">
                {user.bio}
              </p>
            )}
          </motion.div>
        </div>

        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto block"
            preserveAspectRatio="none"
          >
            <path
              d="M0 60V20C240 0 480 0 720 10C960 20 1200 40 1440 30V60H0Z"
              style={{ fill: 'var(--background)' }}
            />
          </svg>
        </div>
      </motion.section>

      <div className="max-w-4xl mx-auto px-6">
        {/* ───────── Stats Bar ───────── */}
        <motion.div
          className="-mt-8 relative z-10 rounded-2xl border border-border bg-card p-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="al-stat-value text-2xl md:text-3xl">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="al-caption uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ───────── Passport Strip ───────── */}
        {countryCodes.length > 0 && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <h2 className="al-eyebrow mb-4 flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Travel Passport
            </h2>
            <div className="flex flex-wrap gap-2">
              {countryCodes.slice(0, 30).map((code, i) => (
                <motion.span
                  key={code}
                  className="inline-flex items-center gap-1.5 al-badge !normal-case !text-sm !py-1.5 !px-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.5 + i * 0.03 }}
                  title={code}
                >
                  <span className="text-lg leading-none">{getFlagEmoji(code)}</span>
                  <span className="font-medium">{code}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ───────── Travel Globe ───────── */}
        {!isPrivate && albums.some((a) => a.latitude && a.longitude) && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <h2 className="al-eyebrow mb-4 flex items-center gap-2">
              <Map className="h-4 w-4" />
              Travel Footprint
            </h2>
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">
              Select a pin for an album, or tap the globe to explore their world.
            </p>
            <ProfileGlobe
              username={user.username}
              targetUserId={user.id}
              locations={albums
                .filter((a) => a.latitude != null && a.longitude != null)
                .map((a) => ({
                  id: a.id,
                  title: a.title,
                  location: a.location_name || '',
                  country_code: a.country_code || '',
                  lat: a.latitude as number,
                  lng: a.longitude as number,
                  date: a.date_start || a.created_at,
                  connectedFromAlbumId: a.connected_from_album_id ?? null,
                }))}
            />
          </motion.div>
        )}

        {/* ───────── Albums Grid ───────── */}
        {isPrivate ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Users className="h-6 w-6" />
            </div>
            <p className="font-heading font-semibold text-foreground">
              This account is private
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Follow to see their adventures
            </p>
          </div>
        ) : albums.length > 0 ? (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <h2 className="al-eyebrow mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Adventures
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {albums.map((album, i) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.65 + i * 0.04 }}
                >
                  <Link href={`/albums/${album.id}/public`}>
                    <div className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring">
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {album.cover_photo_url ? (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Globe className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Card content - always visible */}
                      <div className="p-4">
                        <h3 className="font-heading font-semibold text-foreground text-base truncate mb-1.5">
                          {album.title}
                        </h3>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm min-w-0">
                            {album.country_code && (
                              <span className="text-base leading-none flex-shrink-0">
                                {getFlagEmoji(album.country_code)}
                              </span>
                            )}
                            {album.location_name && (
                              <span className="truncate">
                                <MapPin className="h-3 w-3 inline mr-0.5 flex-shrink-0" />
                                {album.location_name.split(',')[0]}
                              </span>
                            )}
                          </div>
                          {album.date_start && (
                            <span className="text-xs text-muted-foreground font-mono tracking-wide flex items-center gap-1 flex-shrink-0">
                              <CalendarDays className="h-3 w-3" />
                              {formatTravelDate(album.date_start, {
                                view: 'fuzzy',
                                latitude: album.latitude ?? undefined,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">No public adventures yet</p>
          </div>
        )}

        {/* ───────── Conversion CTA ───────── */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="rounded-2xl border border-border bg-card px-6 py-10 md:px-10 md:py-12 text-center">
            <span className="al-eyebrow mb-3 block">Adventure Log</span>
            <h2 className="al-display text-2xl md:text-3xl mb-3">
              Map your own journey
            </h2>
            <p className="text-sm md:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed mb-7">
              Turn your trips into a living map, build your travel passport, and share
              your adventures — free, forever.
            </p>
            <Link href="/signup">
              <Button variant="coral" className="cursor-pointer px-8">
                Create your free profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <p className="text-muted-foreground text-xs mt-4">
              No credit card · Set up in under a minute
            </p>
          </div>
        </motion.div>

        {/* ───────── Share Section ───────── */}
        {!isPrivate && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <h2 className="al-eyebrow mb-4 flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share This Profile
            </h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* One-tap share — primary action */}
              <div className="p-5 border-b border-border">
                <Button
                  onClick={handleShareProfile}
                  className="cursor-pointer w-full gap-2 py-6 text-base font-semibold"
                >
                  <Share2 className="h-5 w-5" />
                  Share {displayName}&apos;s travels
                </Button>
              </div>

              {/* Copy profile URL */}
              <div className="p-5 border-b border-border">
                <p className="text-sm font-medium text-foreground mb-3">
                  Profile Link
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground truncate font-mono">
                    {profileUrl}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-xl gap-1.5 flex-shrink-0"
                    onClick={() => copyToClipboard(profileUrl, 'url')}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="h-4 w-4 text-primary" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Embed code */}
              <div className="p-5">
                <p className="text-sm font-medium text-foreground mb-1">
                  Embed on Your Website
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Add an interactive travel map to your blog or portfolio
                </p>
                <div className="flex items-start gap-2">
                  <div className="flex-1 rounded-xl bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground font-mono break-all leading-relaxed max-h-20 overflow-auto">
                    {embedCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-xl gap-1.5 flex-shrink-0 mt-0.5"
                    onClick={() => copyToClipboard(embedCode, 'embed')}
                  >
                    {copiedEmbed ? (
                      <>
                        <Check className="h-4 w-4 text-primary" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Code className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───────── Report / Block User ───────── */}
        {/* UserActionsMenu provides both Report and Block, and hides itself on
            your own profile (and for logged-out viewers). */}
        <div className="mb-10 flex justify-center">
          <UserActionsMenu userId={user.id} username={user.username} />
        </div>

        {/* ───────── Footer ───────── */}
        <motion.footer
          className="text-center py-10 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <p className="text-sm text-muted-foreground mb-4">
            Powered by{' '}
            <Link
              href="/"
              className="font-semibold text-primary transition-colors"
            >
              Adventure Log
            </Link>
          </p>
          <Link href="/signup">
            <Button className="cursor-pointer px-8">
              Start Your Adventure Log
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </motion.footer>
      </div>
    </div>
  )
}
