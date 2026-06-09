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
  Flag,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ReportDialog } from '@/components/social/ReportDialog'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import Image from 'next/image'
import Link from 'next/link'

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k`
  }
  return km.toLocaleString()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

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
}

interface PublicUser {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  privacy_level: string | null
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
  const isPrivate = user.privacy_level === 'private'
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const profileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/u/${user.username}`
      : `/u/${user.username}`

  const embedCode = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/${user.username}" width="100%" height="500" style="border:none;border-radius:12px;" title="${displayName}'s Travel Map"></iframe>`

  const copyToClipboard = async (text: string, type: 'url' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text)
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
    { icon: Plane, value: formatDistance(totalDistance), label: 'km traveled' },
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
              <div className="absolute -inset-1.5 bg-gradient-to-br from-white/30 to-white/10 rounded-full blur-sm" />
              <Avatar className="relative w-28 h-28 ring-4 ring-white/30 shadow-2xl">
                <AvatarImage
                  src={getAvatarUrl(user.avatar_url, user.username)}
                  alt={displayName}
                />
                <AvatarFallback className="text-3xl text-white font-heading" style={{ background: 'var(--color-coral)' }}>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
              {displayName}
            </h1>
            <p className="text-white/70 text-lg mb-4">@{user.username}</p>
            {user.bio && (
              <p className="text-white/80 max-w-prose mx-auto text-lg leading-relaxed">
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
          className="-mt-8 relative z-10 al-card p-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-2" style={{ color: 'var(--color-forest)' }} />
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
                  <span className="text-lg leading-none">{countryCodeToFlag(code)}</span>
                  <span className="font-medium">{code}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ───────── Travel Map entry point ───────── */}
        {!isPrivate && albums.some((a) => a.latitude && a.longitude) && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <h2 className="al-eyebrow mb-4 flex items-center gap-2">
              <Map className="h-4 w-4" />
              Travel Map
            </h2>
            <Link href={`/embed/${user.username}`} target="_blank">
              <div className="al-card p-5 flex items-center gap-4 cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-forest-tint)' }}
                >
                  <Globe className="h-6 w-6" style={{ color: 'var(--color-forest)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[color:var(--color-ink)]">View travel map</p>
                  <p className="text-sm text-[color:var(--color-muted-warm)]">
                    {albums.filter((a) => a.latitude && a.longitude).length} locations on the interactive 3D globe
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" style={{ color: 'var(--color-muted-warm)' }} />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ───────── Albums Grid ───────── */}
        {isPrivate ? (
          <div className="al-card text-center py-16">
            <Users className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-muted-warm)' }} />
            <p className="font-medium text-[color:var(--color-ink)]">
              This account is private
            </p>
            <p className="text-[color:var(--color-muted-warm)] text-sm mt-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {albums.map((album, i) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.65 + i * 0.04 }}
                >
                  <Link href={`/albums/${album.id}/public`}>
                    <div className="group cursor-pointer al-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[color:var(--color-coral)]">
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--color-ivory-alt)' }}>
                        {album.cover_photo_url ? (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Globe className="h-10 w-10" style={{ color: 'var(--color-muted-warm)' }} />
                          </div>
                        )}
                        {/* Subtle gradient overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>

                      {/* Card content - always visible */}
                      <div className="p-4">
                        <h3 className="font-semibold text-[color:var(--color-ink)] text-base truncate mb-1.5">
                          {album.title}
                        </h3>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[color:var(--color-muted-warm)] text-sm min-w-0">
                            {album.country_code && (
                              <span className="text-base leading-none flex-shrink-0">
                                {countryCodeToFlag(album.country_code)}
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
                            <span className="text-xs text-[color:var(--color-muted-warm)] flex items-center gap-1 flex-shrink-0">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(album.date_start)}
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
          <div className="al-card text-center py-16 mb-10">
            <Globe className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-muted-warm)' }} />
            <p className="text-[color:var(--color-muted-warm)]">No public adventures yet</p>
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
          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            {/* Forest gradient backdrop */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom right, var(--color-forest-deep), var(--color-forest), var(--color-forest-deep))' }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.3)_0%,_transparent_60%)]" />
            <div className="relative px-6 py-10 md:px-10 md:py-12 text-center">
              <span className="al-eyebrow text-white/70 mb-3 block">Adventure Log</span>
              <h2 className="al-display text-2xl md:text-3xl text-white mb-3">
                Map your own journey
              </h2>
              <p className="text-white/85 max-w-md mx-auto leading-relaxed mb-7">
                Turn your trips into a living map, build your travel passport, and share
                your adventures — free, forever.
              </p>
              <Link href="/sign-up">
                <Button className="cursor-pointer bg-white font-semibold px-8 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white" style={{ color: 'var(--color-forest-deep)' }}>
                  Create your free profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="text-white/70 text-xs mt-4">
                No credit card · Set up in under a minute
              </p>
            </div>
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
            <div className="al-card overflow-hidden">
              {/* One-tap share — primary action */}
              <div className="p-5 border-b border-[color:var(--color-line-warm)]">
                <Button
                  onClick={handleShareProfile}
                  className="al-btn-coral cursor-pointer w-full gap-2 py-6 text-base font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]"
                >
                  <Share2 className="h-5 w-5" />
                  Share {displayName}&apos;s travels
                </Button>
              </div>

              {/* Copy profile URL */}
              <div className="p-5 border-b border-[color:var(--color-line-warm)]">
                <p className="text-sm font-medium text-[color:var(--color-ink-soft)] mb-3">
                  Profile Link
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl px-4 py-2.5 text-sm text-[color:var(--color-muted-warm)] truncate font-mono" style={{ background: 'var(--color-ivory-alt)' }}>
                    {profileUrl}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-xl gap-1.5 flex-shrink-0 transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]"
                    onClick={() => copyToClipboard(profileUrl, 'url')}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="h-4 w-4" style={{ color: 'var(--color-forest)' }} />
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
                <p className="text-sm font-medium text-[color:var(--color-ink-soft)] mb-1">
                  Embed on Your Website
                </p>
                <p className="text-xs text-[color:var(--color-muted-warm)] mb-3">
                  Add an interactive travel map to your blog or portfolio
                </p>
                <div className="flex items-start gap-2">
                  <div className="flex-1 rounded-xl px-4 py-2.5 text-xs text-[color:var(--color-muted-warm)] font-mono break-all leading-relaxed max-h-20 overflow-auto" style={{ background: 'var(--color-ivory-alt)' }}>
                    {embedCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-xl gap-1.5 flex-shrink-0 mt-0.5 transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]"
                    onClick={() => copyToClipboard(embedCode, 'embed')}
                  >
                    {copiedEmbed ? (
                      <>
                        <Check className="h-4 w-4" style={{ color: 'var(--color-forest)' }} />
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

        {/* ───────── Report User ───────── */}
        <div className="mb-10 flex justify-center">
          <button
            onClick={() => setReportOpen(true)}
            className="cursor-pointer flex items-center gap-1.5 text-xs text-[color:var(--color-muted-warm)] hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 py-2 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none min-h-[44px]"
          >
            <Flag className="h-3 w-3" />
            Report this profile
          </button>
        </div>
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={user.id}
          targetUserId={user.id}
        />

        {/* ───────── Footer ───────── */}
        <motion.footer
          className="text-center py-10 border-t border-[color:var(--color-line-warm)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <p className="text-sm text-[color:var(--color-muted-warm)] mb-4">
            Powered by{' '}
            <Link
              href="/"
              className="font-semibold transition-colors"
              style={{ color: 'var(--color-forest)' }}
            >
              Adventure Log
            </Link>
          </p>
          <Link href="/sign-up">
            <Button className="al-btn-coral cursor-pointer px-8 py-2.5 transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]">
              Start Your Adventure Log
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </motion.footer>
      </div>
    </div>
  )
}
