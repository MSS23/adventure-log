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

  const stats = [
    {
      icon: Camera,
      value: albums.length,
      label: 'Adventures',
      color: 'text-olive-600',
    },
    {
      icon: Globe,
      value: countryCodes.length,
      label: 'Countries',
      color: 'text-olive-600',
    },
    {
      icon: Users,
      value: followerCount,
      label: 'Followers',
      color: 'text-olive-600',
    },
    {
      icon: Plane,
      value: formatDistance(totalDistance),
      label: 'km traveled',
      color: 'text-olive-600',
      suffix: '',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7F0] dark:bg-black">
      {/* ───────── Hero Section ───────── */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-olive-800 via-olive-700 to-olive-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(153,177,105,0.3)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(74,93,35,0.4)_0%,_transparent_60%)]" />
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
                  src={getPhotoUrl(user.avatar_url) || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-olive-400 to-olive-600 text-white font-heading">
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
            <p className="text-olive-200 text-lg mb-4">@{user.username}</p>
            {user.bio && (
              <p className="text-white/80 max-w-lg mx-auto text-lg leading-relaxed">
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
              className="fill-[#F5F7F0] dark:fill-black"
            />
          </svg>
        </div>
      </motion.section>

      <div className="max-w-4xl mx-auto px-6">
        {/* ───────── Stats Bar ───────── */}
        <motion.div
          className="-mt-8 relative z-10 bg-white dark:bg-[#111111] rounded-2xl shadow-lg border border-stone-200/60 dark:border-stone-800 p-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
              >
                <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </motion.div>
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
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Travel Passport
            </h2>
            <div className="flex flex-wrap gap-2">
              {countryCodes.slice(0, 30).map((code, i) => (
                <motion.span
                  key={code}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-[#111111] border border-stone-200 dark:border-stone-800 rounded-full px-3 py-1.5 text-sm shadow-sm hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.5 + i * 0.03 }}
                  title={code}
                >
                  <span className="text-lg leading-none">{countryCodeToFlag(code)}</span>
                  <span className="text-stone-600 dark:text-stone-300 font-medium">{code}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ───────── Travel Map Preview ───────── */}
        {!isPrivate && albums.some((a) => a.latitude && a.longitude) && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Map className="h-4 w-4" />
              Travel Map
            </h2>
            <div className="relative bg-gradient-to-br from-olive-900 via-olive-800 to-olive-950 rounded-2xl overflow-hidden shadow-lg border border-stone-200/60 dark:border-stone-800">
              {/* Map dots preview */}
              <div className="relative h-48 md:h-64 overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <svg viewBox="0 0 800 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    {/* Simplified world map outline */}
                    <ellipse cx="400" cy="200" rx="350" ry="170" fill="none" stroke="rgba(153,177,105,0.3)" strokeWidth="1" />
                    <ellipse cx="400" cy="200" rx="250" ry="170" fill="none" stroke="rgba(153,177,105,0.15)" strokeWidth="1" />
                    <line x1="50" y1="200" x2="750" y2="200" stroke="rgba(153,177,105,0.15)" strokeWidth="1" />
                    <line x1="400" y1="30" x2="400" y2="370" stroke="rgba(153,177,105,0.15)" strokeWidth="1" />
                  </svg>
                </div>
                {/* Plot album locations as dots */}
                {albums
                  .filter((a) => a.latitude && a.longitude)
                  .slice(0, 20)
                  .map((album, i) => {
                    // Simple Mercator-ish projection onto the box
                    const x = ((album.longitude! + 180) / 360) * 100
                    const y = ((90 - album.latitude!) / 180) * 100
                    return (
                      <motion.div
                        key={album.id}
                        className="absolute w-3 h-3 rounded-full bg-olive-400 shadow-[0_0_8px_rgba(153,177,105,0.6)]"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
                      />
                    )
                  })}
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="h-8 w-8 mx-auto text-olive-400/60 mb-2" />
                    <p className="text-olive-200/80 text-sm">
                      {albums.filter((a) => a.latitude && a.longitude).length} locations pinned
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA bar */}
              <div className="px-5 py-4 bg-olive-900/50 border-t border-olive-700/30 flex items-center justify-between">
                <p className="text-olive-200 text-sm">
                  Explore the interactive 3D globe
                </p>
                <Link href={`/embed/${user.username}`} target="_blank">
                  <Button
                    size="sm"
                    className="bg-olive-500 hover:bg-olive-400 text-white rounded-xl gap-1.5 shadow-md"
                  >
                    View Travel Map
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───────── Albums Grid ───────── */}
        {isPrivate ? (
          <div className="text-center py-16 bg-white dark:bg-[#111111] rounded-2xl border border-stone-200/60 dark:border-stone-800 shadow-sm">
            <Users className="h-12 w-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-stone-500 dark:text-stone-400 font-medium">
              This account is private
            </p>
            <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">
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
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
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
                    <div className="group bg-white dark:bg-[#111111] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-stone-200/60 dark:border-stone-800 transition-all duration-300 hover:-translate-y-0.5">
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-900">
                        {album.cover_photo_url ? (
                          <Image
                            src={getPhotoUrl(album.cover_photo_url) || ''}
                            alt={album.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-olive-50 to-stone-100 dark:from-olive-950 dark:to-stone-900">
                            <Globe className="h-10 w-10 text-olive-300 dark:text-olive-700" />
                          </div>
                        )}
                        {/* Subtle gradient overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>

                      {/* Card content - always visible */}
                      <div className="p-4">
                        <h3 className="font-semibold text-stone-900 dark:text-white text-base truncate mb-1.5">
                          {album.title}
                        </h3>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-sm min-w-0">
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
                            <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1 flex-shrink-0">
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
          <div className="text-center py-16 bg-white dark:bg-[#111111] rounded-2xl border border-stone-200/60 dark:border-stone-800 shadow-sm mb-10">
            <Globe className="h-12 w-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-stone-500 dark:text-stone-400">No public adventures yet</p>
          </div>
        )}

        {/* ───────── Share Section ───────── */}
        {!isPrivate && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share This Profile
            </h2>
            <div className="bg-white dark:bg-[#111111] rounded-2xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden">
              {/* Copy profile URL */}
              <div className="p-5 border-b border-stone-100 dark:border-stone-800">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
                  Profile Link
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-stone-50 dark:bg-stone-900 rounded-xl px-4 py-2.5 text-sm text-stone-600 dark:text-stone-400 truncate font-mono">
                    {profileUrl}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 flex-shrink-0"
                    onClick={() => copyToClipboard(profileUrl, 'url')}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="h-4 w-4 text-olive-500" />
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
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Embed on Your Website
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">
                  Add an interactive travel map to your blog or portfolio
                </p>
                <div className="flex items-start gap-2">
                  <div className="flex-1 bg-stone-50 dark:bg-stone-900 rounded-xl px-4 py-2.5 text-xs text-stone-500 dark:text-stone-400 font-mono break-all leading-relaxed max-h-20 overflow-auto">
                    {embedCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 flex-shrink-0 mt-0.5"
                    onClick={() => copyToClipboard(embedCode, 'embed')}
                  >
                    {copiedEmbed ? (
                      <>
                        <Check className="h-4 w-4 text-olive-500" />
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
            className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
          className="text-center py-10 border-t border-stone-200/60 dark:border-stone-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">
            Powered by{' '}
            <Link
              href="/"
              className="text-olive-600 dark:text-olive-400 hover:text-olive-700 dark:hover:text-olive-300 font-semibold transition-colors"
            >
              Adventure Log
            </Link>
          </p>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-olive-600 to-olive-500 hover:from-olive-700 hover:to-olive-600 text-white px-8 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all">
              Start Your Adventure Log
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </motion.footer>
      </div>
    </div>
  )
}
