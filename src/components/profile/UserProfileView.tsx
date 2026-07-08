'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Camera,
  Lock,
  UserPlus,
  UserMinus,
  Loader2,
  Users
} from 'lucide-react'
import { User, Album } from '@/types/database'
import { PUBLIC_USER_COLUMNS } from '@/lib/constants/user-columns'
import { useFollows } from '@/lib/hooks/useFollows'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getDisplayInitial } from '@/lib/utils/display-name'
import { getFlagEmoji } from '@/lib/utils/country'
import Image from 'next/image'
import Link from 'next/link'
// Interactive travel globe teaser (navigation inside handles native routes) — same earth texture, pins, and travel-line
// "spider's web" as the main /globe page. It lazy-loads react-globe.gl
// internally with ssr:false, so no dynamic() wrapper is needed here.
import { ProfileGlobe, type ProfileGlobeLocation } from '@/components/globe/ProfileGlobe'

// View-model returned by the profile query. The sentinel `redirectToOwn`
// signals that the viewer is looking at their own profile.
type ProfileViewModel = {
  redirectToOwn?: boolean
  profile: User
  isPrivate: boolean
  followStatus: 'not_following' | 'following' | 'pending' | 'blocked'
  albums: Album[]
  followStats: { followersCount: number; followingCount: number }
}

export function UserProfileView({ userIdOrUsername }: { userIdOrUsername: string }) {
  const router = useRouter()
  const { user: currentUser, authLoading } = useAuth()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const { getFollowStatus, followUser, unfollowUser } = useFollows()
  const [followLoading, setFollowLoading] = useState(false)

  const viewerId = currentUser?.id ?? null

  // Helper: count followers/following for a profile (shared by query + toggle)
  const fetchFollowStats = useMemo(
    () => async (profileId: string) => {
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', profileId)
          .eq('status', 'accepted'),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', profileId)
          .eq('status', 'accepted')
      ])
      return {
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0
      }
    },
    [supabase]
  )

  const {
    data: viewModel,
    isLoading: queryLoading,
    error: queryError
  } = useQuery<ProfileViewModel>({
    // Include the viewer so a follow-status change re-resolves privacy gating.
    queryKey: ['profile', userIdOrUsername, viewerId],
    // Wait for auth to settle so privacy decisions use a known viewer.
    enabled: !!userIdOrUsername && !authLoading,
    queryFn: async () => {
      // Validate userIdOrUsername exists
      if (!userIdOrUsername) {
        throw new Error('Invalid user identifier')
      }

      // Check if it's a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername)

      // Check if it's a generated username pattern (user_XXXXXXXX)
      const generatedUsernameMatch = userIdOrUsername.match(/^user_([0-9a-f]{8})$/i)

      // Fetch user profile by UUID or username
      let userData: User | null = null
      let userError: { code?: string; message?: string } | null = null

      // Cross-user read: explicit safe columns only — select('*') is
      // permission-denied once migration 76 locks down the PII columns.
      if (isUUID) {
        // Direct UUID lookup
        const { data, error } = await supabase
          .from('users')
          .select(PUBLIC_USER_COLUMNS)
          .eq('id', userIdOrUsername)
          .single()
        userData = data as User | null
        userError = error
      } else if (generatedUsernameMatch) {
        // Generated username pattern
        const { data, error } = await supabase
          .from('users')
          .select(PUBLIC_USER_COLUMNS)
          .ilike('username', userIdOrUsername)
          .maybeSingle()
        userData = data as User | null
        userError = error
      } else {
        // Regular username lookup (case-insensitive)
        const { data, error } = await supabase
          .from('users')
          .select(PUBLIC_USER_COLUMNS)
          .ilike('username', userIdOrUsername)
          .maybeSingle()
        userData = data as User | null
        userError = error
      }

      if (userError) {
        if (userError.code === 'PGRST116') {
          throw new Error('User not found')
        }
        throw new Error(userError.message || 'Failed to fetch user')
      }

      if (!userData) {
        throw new Error('User not found')
      }

      // Redirect to own profile if viewing own page (only if logged in)
      if (currentUser && currentUser.id === userData.id) {
        return {
          redirectToOwn: true,
          profile: userData,
          isPrivate: false,
          followStatus: 'not_following',
          albums: [],
          followStats: { followersCount: 0, followingCount: 0 }
        }
      }

      // Check privacy level and follow status
      const privacyLevel = userData.privacy_level || (userData.is_private ? 'private' : 'public')

      let resolvedFollowStatus: 'not_following' | 'following' | 'pending' | 'blocked' = 'not_following'

      // Only check follow status if logged in
      if (currentUser) {
        try {
          const status = await getFollowStatus(userData.id)
          resolvedFollowStatus = status

          // Check if content should be hidden based on privacy level
          if (privacyLevel === 'private' && status !== 'following') {
            return {
              profile: userData,
              isPrivate: true,
              followStatus: status,
              albums: [],
              followStats: await fetchFollowStats(userData.id)
            }
          }

          if (privacyLevel === 'friends' && status !== 'following') {
            return {
              profile: userData,
              isPrivate: true,
              followStatus: status,
              albums: [],
              followStats: await fetchFollowStats(userData.id)
            }
          }
        } catch (err) {
          log.error('Error checking follow status', { component: 'ProfilePage', userId: userData.id }, err instanceof Error ? err : new Error(String(err)))
          // Assume not following on error for non-public accounts
          if (privacyLevel !== 'public') {
            return {
              profile: userData,
              isPrivate: true,
              followStatus: 'not_following',
              albums: [],
              followStats: await fetchFollowStats(userData.id)
            }
          }
        }
      } else {
        // Not logged in - show private message for non-public accounts
        if (privacyLevel !== 'public') {
          return {
            profile: userData,
            isPrivate: true,
            followStatus: 'not_following',
            albums: [],
            followStats: await fetchFollowStats(userData.id)
          }
        }
      }

      // Fetch user's albums
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (albumsError) {
        log.error('Error fetching albums', {
          component: 'ProfilePage',
          userId: userData.id
        }, albumsError)
        throw albumsError
      }

      return {
        profile: userData,
        isPrivate: false,
        followStatus: resolvedFollowStatus,
        albums: albumsData || [],
        followStats: await fetchFollowStats(userData.id)
      }
    },
    // Supabase free-tier cold starts fail the first queries at the network
    // layer for up to ~30s; the provider default (2 retries, ~3s) gives up
    // inside that window and strands the profile on the error card — the same
    // failure mode the feed fixed with per-query retry. "User not found" is
    // a real answer, not a transient error, so it must surface immediately.
    retry: (failureCount, err) =>
      failureCount < 5 && !(err instanceof Error && err.message === 'User not found'),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
  })

  // Perform the own-profile redirect once the query resolves to that sentinel.
  useEffect(() => {
    if (viewModel?.redirectToOwn) {
      router.push('/profile')
    }
  }, [viewModel?.redirectToOwn, router])

  const profile = viewModel && !viewModel.redirectToOwn ? viewModel.profile : null
  const isPrivate = viewModel?.isPrivate ?? false
  const albums = useMemo(() => viewModel?.albums ?? [], [viewModel?.albums])

  // Local follow status/stats, seeded from the query and updated by the toggle.
  const [followStatusOverride, setFollowStatusOverride] = useState<'not_following' | 'following' | 'pending' | 'blocked' | null>(null)
  const [followStatsOverride, setFollowStatsOverride] = useState<{ followersCount: number; followingCount: number } | null>(null)

  // Reset overrides whenever a fresh view-model arrives.
  useEffect(() => {
    setFollowStatusOverride(null)
    setFollowStatsOverride(null)
  }, [viewModel])

  const followStatus = followStatusOverride ?? viewModel?.followStatus ?? 'not_following'
  const followStats = followStatsOverride ?? viewModel?.followStats ?? { followersCount: 0, followingCount: 0 }

  const loading = (queryLoading && !!userIdOrUsername && !authLoading) || authLoading || !!viewModel?.redirectToOwn
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load profile') : null

  // Unique country codes from albums — drives both the stat and the flag row.
  const countryCodes = useMemo(
    () => [
      ...new Set(
        albums
          .filter((album) => album.country_code)
          .map((album) => (album.country_code as string).toUpperCase())
      ),
    ],
    [albums]
  )
  const countriesCount = countryCodes.length

  // Geocoded albums → pins + journey links for the interactive globe teaser
  // (chronological, same data shape the main globe builds its arcs from).
  const footprint = useMemo<ProfileGlobeLocation[]>(
    () =>
      albums
        .filter((a) => typeof a.latitude === 'number' && typeof a.longitude === 'number')
        .map((a) => ({
          id: a.id,
          title: a.title,
          location: a.location_name || '',
          country_code: a.country_code || '',
          lat: a.latitude as number,
          lng: a.longitude as number,
          date: a.date_start || a.created_at || '',
          connectedFromAlbumId: a.connected_from_album_id ?? null,
        }))
        .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()),
    [albums]
  )

  useEffect(() => {
    if (queryError) {
      log.error('Error fetching user profile', { component: 'ProfilePage', userId: userIdOrUsername }, queryError instanceof Error ? queryError : new Error(String(queryError)))
    }
  }, [queryError, userIdOrUsername])

  const handleFollowToggle = async () => {
    if (!profile) return

    try {
      setFollowLoading(true)

      if (followStatus === 'following') {
        await unfollowUser(profile.id)
        setFollowStatusOverride('not_following')
      } else {
        await followUser(profile.id)

        // Determine new status based on privacy level
        const privacyLevel = profile.privacy_level || (profile.is_private ? 'private' : 'public')
        const newStatus = privacyLevel === 'public' ? 'following' : 'pending'
        setFollowStatusOverride(newStatus)
      }

      // Refresh follow stats after follow/unfollow
      setFollowStatsOverride(await fetchFollowStats(profile.id))

      // Invalidate so the privacy gating re-resolves (e.g. a now-accepted
      // follower should see albums on the next fetch).
      queryClient.invalidateQueries({ queryKey: ['profile', userIdOrUsername] })
    } catch (err) {
      log.error('Error toggling follow', { component: 'ProfilePage', userId: profile.id }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 pt-24 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="al-display text-2xl mb-2">User not found</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push('/feed')} className="cursor-pointer">
            Go to Feed
          </Button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const displayName = profile.display_name || profile.username || 'Anonymous User'
  const isFriendsOnly = profile.privacy_level === 'friends'

  const followButton = currentUser ? (
    <Button
      onClick={handleFollowToggle}
      disabled={followLoading}
      variant={followStatus === 'following' ? 'outline' : 'coral'}
      size="pill"
      className="cursor-pointer rounded-full"
    >
      {followLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : followStatus === 'following' ? (
        <UserMinus className="h-4 w-4 mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      {followStatus === 'following' ? 'Unfollow' : followStatus === 'pending' ? 'Requested' : 'Follow'}
    </Button>
  ) : null

  // Show private account message
  if (isPrivate) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 pt-10 pb-24 text-center">
          <Avatar className="h-24 w-24 mx-auto ring-2 ring-background">
            <AvatarImage src={getPhotoUrl(profile.avatar_url, 'avatars') || ''} alt={displayName} />
            <AvatarFallback className="bg-accent text-2xl text-accent-foreground">
              {getDisplayInitial(displayName, undefined)}
            </AvatarFallback>
          </Avatar>

          <h1 className="al-display text-2xl mt-4 break-words">{displayName}</h1>
          {profile.username && (
            <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 mt-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              {isFriendsOnly ? (
                <Users className="h-6 w-6" />
              ) : (
                <Lock className="h-6 w-6" />
              )}
            </div>
            <h2 className="font-heading font-semibold text-base text-foreground mb-1">
              {isFriendsOnly ? 'Friends-only account' : 'This account is private'}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Follow this account and wait for approval to see their adventures.
            </p>
            {followButton}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
        {/* ───────── Hero ───────── */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <Avatar className="h-24 w-24 shrink-0 ring-2 ring-background">
              <AvatarImage src={getPhotoUrl(profile.avatar_url, 'avatars') || ''} alt={displayName} />
              <AvatarFallback className="bg-accent text-2xl text-accent-foreground">
                {getDisplayInitial(displayName, undefined)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h1 className="al-display text-2xl sm:text-3xl break-words">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                @{profile.username || 'anonymous'}
              </p>
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-prose">
                  {profile.bio}
                </p>
              )}
              {followButton && <div className="mt-4">{followButton}</div>}
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-border">
            {[
              { value: albums.length, label: 'Albums' },
              { value: countriesCount, label: 'Countries' },
              { value: followStats.followersCount, label: 'Followers' },
              { value: followStats.followingCount, label: 'Following' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="al-stat-value text-xl sm:text-2xl">{s.value}</div>
                <div className="al-caption mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ───────── Footprint ───────── */}
        {(footprint.length > 0 || countryCodes.length > 0) && (
          <div>
            <p className="al-eyebrow mb-3">Footprint</p>

            {footprint.length > 0 && (
              <ProfileGlobe
                username={profile.username || ''}
                targetUserId={profile.id}
                locations={footprint}
              />
            )}

            {/* Country flags */}
            {countryCodes.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {countryCodes.slice(0, 24).map((code) => (
                  <span key={code} title={code} className="text-2xl leading-none">
                    {getFlagEmoji(code)}
                  </span>
                ))}
                {countryCodes.length > 24 && (
                  <span className="text-sm font-medium text-muted-foreground">
                    +{countryCodes.length - 24}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ───────── Albums ───────── */}
        <div>
          <p className="al-eyebrow mb-3">Adventures</p>
          {albums.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl block bg-muted border border-border cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {album.cover_photo_url || album.cover_image_url ? (
                    <Image
                      src={getPhotoUrl(album.cover_photo_url || album.cover_image_url) || ''}
                      alt={album.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-heading font-semibold text-white text-sm line-clamp-2 drop-shadow-sm">{album.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Camera className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">No public albums yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}