'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Globe2, Share2, Users, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'

interface FriendUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface ComparisonData {
  shared: string[]
  onlyYou: string[]
  onlyThem: string[]
  overlapPercent: number
}

function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase()
  const offset = 0x1F1E6 - 65
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset)
}

function FriendPicker({
  friends,
  loading,
  onSelect,
}: {
  friends: FriendUser[]
  loading: boolean
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-olive-600 dark:text-olive-400" />
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-20 text-stone-500 dark:text-stone-400">
        <Users className="size-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No friends yet</p>
        <p className="text-sm mt-1">Follow some travelers to compare maps!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {friends.map((friend, i) => (
        <motion.div
          key={friend.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card
            className="cursor-pointer hover:border-olive-300 dark:hover:border-olive-700 transition-colors"
            onClick={() => onSelect(friend.id)}
          >
            <CardContent className="flex flex-col items-center gap-2 py-4">
              <Avatar className="size-14">
                <AvatarImage src={getPhotoUrl(friend.avatar_url, 'avatars') || ''} />
                <AvatarFallback className="bg-olive-100 dark:bg-olive-900 text-olive-700 dark:text-olive-300 text-lg">
                  {(friend.display_name || friend.username)?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate max-w-full">
                {friend.display_name || friend.username}
              </span>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function CountryColumn({
  title,
  countries,
  color,
}: {
  title: string
  countries: string[]
  color: 'olive' | 'stone' | 'amber'
}) {
  const bgMap = {
    olive: 'bg-olive-50 dark:bg-olive-950/30',
    stone: 'bg-stone-50 dark:bg-stone-900/30',
    amber: 'bg-amber-50 dark:bg-amber-950/30',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {title}
      </h3>
      <div
        className={cn(
          'rounded-xl p-3 w-full min-h-[80px] flex flex-wrap justify-center gap-2',
          bgMap[color]
        )}
      >
        {countries.length === 0 ? (
          <span className="text-stone-400 dark:text-stone-600 text-sm">None</span>
        ) : (
          countries.map((code) => (
            <motion.span
              key={code}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-2xl"
              title={code.toUpperCase()}
            >
              {countryCodeToFlag(code)}
            </motion.span>
          ))
        )}
      </div>
      <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
        {countries.length}
      </span>
    </div>
  )
}

function GlobeCompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const withUserId = searchParams.get('with')

  const [friends, setFriends] = useState<FriendUser[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<FriendUser | null>(null)
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [comparing, setComparing] = useState(false)

  const supabase = createClient()

  // Fetch followed users
  useEffect(() => {
    if (!user || withUserId) return
    let cancelled = false

    async function fetchFriends() {
      setFriendsLoading(true)
      const { data } = await supabase
        .from('follows')
        .select('following_id, users!follows_following_id_fkey(id, username, display_name, avatar_url)')
        .eq('follower_id', user!.id)
        .eq('status', 'accepted')

      if (cancelled) return

      const mapped: FriendUser[] = (data || [])
        .map((row: Record<string, unknown>) => {
          const u = row.users as Record<string, unknown> | null
          if (!u) return null
          return {
            id: u.id as string,
            username: u.username as string,
            display_name: u.display_name as string | null,
            avatar_url: u.avatar_url as string | null,
          }
        })
        .filter(Boolean) as FriendUser[]

      setFriends(mapped)
      setFriendsLoading(false)
    }

    fetchFriends()
    return () => { cancelled = true }
  }, [user, withUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compare when withUserId is set
  const runComparison = useCallback(async (otherId: string) => {
    if (!user) return
    setComparing(true)

    // Fetch other user profile
    const { data: otherProfile } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', otherId)
      .single()

    if (otherProfile) {
      setOtherUser(otherProfile as FriendUser)
    }

    // Fetch both users' albums in parallel
    const [myAlbums, theirAlbums] = await Promise.all([
      supabase
        .from('albums')
        .select('country_code')
        .eq('user_id', user.id)
        .not('country_code', 'is', null),
      supabase
        .from('albums')
        .select('country_code')
        .eq('user_id', otherId)
        .eq('visibility', 'public')
        .not('country_code', 'is', null),
    ])

    const myCountries = [...new Set((myAlbums.data || []).map((a) => a.country_code as string))]
    const theirCountries = [...new Set((theirAlbums.data || []).map((a) => a.country_code as string))]

    const mySet = new Set(myCountries)
    const theirSet = new Set(theirCountries)

    const shared = myCountries.filter((c) => theirSet.has(c)).sort()
    const onlyYou = myCountries.filter((c) => !theirSet.has(c)).sort()
    const onlyThem = theirCountries.filter((c) => !mySet.has(c)).sort()

    const totalUnique = new Set([...myCountries, ...theirCountries]).size
    const overlapPercent = totalUnique > 0 ? Math.round((shared.length / totalUnique) * 100) : 0

    setComparison({ shared, onlyYou, onlyThem, overlapPercent })
    setComparing(false)
  }, [user, supabase])

  useEffect(() => {
    if (withUserId && user) {
      runComparison(withUserId)
    }
  }, [withUserId, user, runComparison])

  function handleSelectFriend(id: string) {
    router.push(`/globe/compare?with=${id}`)
  }

  async function handleShare() {
    if (!comparison || !otherUser) return
    const text = `I share ${comparison.shared.length} countries with @${otherUser.username}! Our travel overlap is ${comparison.overlapPercent}%.`
    if (navigator.share) {
      await navigator.share({ text, url: window.location.href }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`)
    }
  }

  if (!user) return null

  // Friend picker view
  if (!withUserId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                Compare Maps
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Pick a friend to compare travel maps
              </p>
            </div>
          </div>
        </motion.div>
        <FriendPicker friends={friends} loading={friendsLoading} onSelect={handleSelectFriend} />
      </div>
    )
  }

  // Comparison view
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/globe/compare')}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Map Comparison
          </h1>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {comparing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <Globe2 className="size-10 animate-spin text-olive-600 dark:text-olive-400" />
            <p className="text-stone-500 dark:text-stone-400">Comparing travel maps...</p>
          </motion.div>
        ) : comparison && otherUser ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Avatars + VS */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <Avatar className="size-16 ring-2 ring-olive-300 dark:ring-olive-700">
                  <AvatarImage src={getPhotoUrl(null, 'avatars') || ''} />
                  <AvatarFallback className="bg-olive-100 dark:bg-olive-900 text-olive-700 dark:text-olive-300 text-xl">
                    You
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">You</span>
              </div>

              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-2xl font-black text-olive-600 dark:text-olive-400"
              >
                vs
              </motion.span>

              <div className="flex flex-col items-center gap-1">
                <Avatar className="size-16 ring-2 ring-stone-300 dark:ring-stone-600">
                  <AvatarImage src={getPhotoUrl(otherUser.avatar_url, 'avatars') || ''} />
                  <AvatarFallback className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xl">
                    {(otherUser.display_name || otherUser.username)?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400 truncate max-w-[100px]">
                  {otherUser.display_name || otherUser.username}
                </span>
              </div>
            </div>

            {/* Overlap Score */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-center"
            >
              <div className="text-6xl font-black text-olive-700 dark:text-olive-400">
                {comparison.overlapPercent}%
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Travel Overlap
              </p>
            </motion.div>

            {/* Stats Row */}
            <Card>
              <CardContent className="grid grid-cols-3 gap-4 text-center py-4">
                <div>
                  <div className="text-xl font-bold text-olive-700 dark:text-olive-400">
                    {comparison.shared.length}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">Shared</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-stone-700 dark:text-stone-300">
                    {comparison.onlyYou.length}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">Only You</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-stone-700 dark:text-stone-300">
                    {comparison.onlyThem.length}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">Only Them</div>
                </div>
              </CardContent>
            </Card>

            {/* Country Flag Grid */}
            <div className="grid grid-cols-3 gap-3">
              <CountryColumn title="Only You" countries={comparison.onlyYou} color="olive" />
              <CountryColumn title="Shared" countries={comparison.shared} color="amber" />
              <CountryColumn title="Only Them" countries={comparison.onlyThem} color="stone" />
            </div>

            {/* Share Button */}
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleShare} className="gap-2">
                <Share2 className="size-4" />
                Share Comparison
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default function GlobeComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-olive-600 dark:text-olive-400" />
        </div>
      }
    >
      <GlobeCompareContent />
    </Suspense>
  )
}
