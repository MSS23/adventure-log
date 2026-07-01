'use client'

import { MapPin, Plus, Globe2, Calendar, ChevronDown, Route, Star, StarOff, Compass, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getDisplayInitial } from '@/lib/utils/display-name'
import { cn } from '@/lib/utils'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

interface GlobePageHeaderProps {
  // Mode
  exploreMode: boolean
  setExploreMode: (mode: boolean) => void
  isOwnProfile: boolean
  profileUser: { display_name: string; username: string } | null

  // Stats
  stats: { totalAlbums: number; totalCountries: number; totalPhotos: number }
  totalDistance: number
  formatDistance: (km: number) => string
  exploreStats: { travelers: number; albums: number }

  // Year filter
  availableYears: number[]
  selectedYear: number | null
  setSelectedYear: (year: number | null) => void

  // Friends
  friends: Array<{ id: string; username: string; display_name: string; avatar_url?: string }>
  onViewFriendGlobe: (friendId: string) => void

  // Wishlist
  showWishlist: boolean
  setShowWishlist: (show: boolean) => void
  setWishlistPrompt: (prompt: null) => void
  wishlistItemsCount: number

  // Navigation
  user: { id: string } | null
  router: AppRouterInstance
}

export function GlobePageHeader({
  exploreMode,
  setExploreMode,
  isOwnProfile,
  profileUser,
  stats,
  totalDistance,
  formatDistance,
  exploreStats,
  availableYears,
  selectedYear,
  setSelectedYear,
  friends,
  onViewFriendGlobe,
  showWishlist,
  setShowWishlist,
  setWishlistPrompt,
  wishlistItemsCount,
  user,
  router,
}: GlobePageHeaderProps) {
  return (
    <div className="bg-white dark:bg-[#111111] border-b border-stone-200 dark:border-white/[0.08] shadow-sm flex-shrink-0">
      <div className="w-full px-2 md:px-3 py-1.5 md:py-2">
        <div className="flex items-center justify-between gap-1 md:gap-2">
          {/* Left: Title + Mode Toggle */}
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-shrink">
            <h1 className="text-base md:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 flex-shrink-0">
              <Globe2 className="h-6 w-6 md:h-8 md:w-8 text-olive-700 dark:text-olive-400" />
              <span className="hidden md:inline truncate max-w-[200px] lg:max-w-none">
                {exploreMode ? 'Explore Globe' : isOwnProfile ? 'Travel Globe' : `${profileUser?.display_name || profileUser?.username}'s Globe`}
              </span>
            </h1>

            {/* Mode Toggle: My Globe / Explore */}
            {isOwnProfile && (
              <div role="group" aria-label="Globe mode" className="flex bg-stone-100 dark:bg-white/[0.06] rounded-lg p-0.5 flex-shrink-0">
                <button
                  type="button"
                  aria-label="My Globe"
                  aria-pressed={!exploreMode}
                  onClick={() => setExploreMode(false)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-olive-500 active:scale-[0.97]",
                    !exploreMode
                      ? "bg-white dark:bg-white/[0.12] shadow-sm text-olive-700 dark:text-olive-300"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                  <span className="hidden lg:inline">My Globe</span>
                </button>
                <button
                  type="button"
                  aria-label="Explore"
                  aria-pressed={exploreMode}
                  onClick={() => setExploreMode(true)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-olive-500 active:scale-[0.97]",
                    exploreMode
                      ? "bg-white dark:bg-white/[0.12] shadow-sm text-olive-700 dark:text-olive-300"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  )}
                >
                  <Compass className="h-4 w-4" />
                  <span className="hidden lg:inline">Explore</span>
                </button>
              </div>
            )}

            {/* Stats badges - only on wide screens */}
            {!exploreMode && (
              <div className="hidden xl:flex items-center gap-1.5 ml-1">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <MapPin className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{stats.totalAlbums}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">adventures</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Globe2 className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{stats.totalCountries}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">countries</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Route className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{formatDistance(totalDistance)}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">traveled</span>
                </div>
              </div>
            )}

            {exploreMode && (
              <div className="hidden xl:flex items-center gap-1.5 ml-1">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Users className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{exploreStats.travelers}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">travelers</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Compass className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{exploreStats.albums}</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">worldwide</span>
                </div>
              </div>
            )}

            {/* Year Filter Dropdown */}
            {availableYears.length > 0 && !exploreMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Filter albums by year" className="hidden lg:inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-white/[0.06] hover:bg-stone-200 dark:hover:bg-white/[0.1] text-stone-700 dark:text-stone-300 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-olive-500 active:scale-[0.97]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{selectedYear ? selectedYear : 'All years'}</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[140px]">
                  <DropdownMenuRadioGroup
                    value={selectedYear?.toString() || 'all'}
                    onValueChange={(value) => setSelectedYear(value === 'all' ? null : parseInt(value))}
                  >
                    <DropdownMenuRadioItem value="all" className="font-medium">
                      All Years
                    </DropdownMenuRadioItem>
                    {availableYears.map((year) => (
                      <DropdownMenuRadioItem key={year} value={year.toString()}>
                        {year}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {/* Friends Avatars - wide desktop only */}
            {isOwnProfile && friends.length > 0 && (
              <div className="hidden xl:flex items-center -space-x-2 mr-1">
                {friends.slice(0, 4).map((friend) => (
                  <button
                    type="button"
                    key={friend.id}
                    onClick={() => onViewFriendGlobe(friend.id)}
                    className="relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-olive-500 rounded-full active:scale-[0.97]"
                    title={friend.display_name}
                    aria-label={`View ${friend.display_name}'s globe`}
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-[#111111] hover:ring-olive-400 transition-all hover:scale-110 hover:z-10">
                      <AvatarImage
                        src={getPhotoUrl(friend.avatar_url, 'avatars') || ''}
                        alt={friend.display_name}
                      />
                      <AvatarFallback className="text-xs bg-olive-500 text-white">
                        {getDisplayInitial(friend.display_name, friend.username)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ))}
                {friends.length > 4 && (
                  <Link
                    href="/followers?tab=following"
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-stone-200 dark:bg-white/[0.08] ring-2 ring-white dark:ring-[#111111] text-[10px] font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-white/[0.12] transition-all duration-200 cursor-pointer"
                  >
                    +{friends.length - 4}
                  </Link>
                )}
              </div>
            )}

            {!isOwnProfile && user && (
              <Button
                onClick={() => router.push('/globe')}
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
              >
                <Globe2 className="h-4 w-4" />
                <span className="hidden lg:inline">My Globe</span>
              </Button>
            )}

            {isOwnProfile && !exploreMode && (
              <button
                type="button"
                aria-pressed={showWishlist}
                onClick={() => {
                  setShowWishlist(!showWishlist)
                  setWishlistPrompt(null)
                }}
                className={cn(
                  "relative inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]",
                  showWishlist
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-400/40"
                    : "bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/[0.1]"
                )}
                title={showWishlist ? 'Hide wishlist pins on globe' : 'Show wishlist pins on globe'}
                aria-label={showWishlist ? 'Hide wishlist' : 'Show wishlist'}
              >
                {showWishlist ? (
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Wishlist</span>
                {wishlistItemsCount > 0 && (
                  <span className={cn(
                    "ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 tabular-nums",
                    showWishlist
                      ? "bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-900"
                      : "bg-stone-300 text-stone-700 dark:bg-white/[0.12] dark:text-stone-200"
                  )}>
                    {wishlistItemsCount}
                  </span>
                )}
              </button>
            )}

            {isOwnProfile && !exploreMode && (
              <Link href="/albums/new" aria-label="Create new album">
                <Button
                  size="sm"
                  className="gap-1.5 h-9 bg-olive-600 hover:bg-olive-700 text-white"
                  title="Create new album"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New album</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
