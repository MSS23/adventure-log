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
              <Globe2 className="h-6 w-6 md:h-8 md:w-8 text-olive-500" />
              <span className="hidden md:inline truncate max-w-[200px] lg:max-w-none">
                {exploreMode ? 'Explore Globe' : isOwnProfile ? 'Travel Globe' : `${profileUser?.display_name || profileUser?.username}'s Globe`}
              </span>
            </h1>

            {/* Mode Toggle: My Globe / Explore */}
            {isOwnProfile && (
              <div className="flex bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5 flex-shrink-0">
                <button
                  onClick={() => setExploreMode(false)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 min-h-[32px] cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500",
                    !exploreMode
                      ? "bg-white dark:bg-stone-700 shadow-sm text-olive-700 dark:text-olive-400"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                  )}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">My Globe</span>
                </button>
                <button
                  onClick={() => setExploreMode(true)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 min-h-[32px] cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500",
                    exploreMode
                      ? "bg-white dark:bg-stone-700 shadow-sm text-olive-700 dark:text-olive-400"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                  )}
                >
                  <Compass className="h-3.5 w-3.5" />
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
                  <span className="text-[11px] text-stone-500">adventures</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Globe2 className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{stats.totalCountries}</span>
                  <span className="text-[11px] text-stone-500">countries</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Route className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{formatDistance(totalDistance)}</span>
                  <span className="text-[11px] text-stone-500">traveled</span>
                </div>
              </div>
            )}

            {exploreMode && (
              <div className="hidden xl:flex items-center gap-1.5 ml-1">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Users className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{exploreStats.travelers}</span>
                  <span className="text-[11px] text-stone-500">travelers</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-olive-50 dark:bg-olive-900/30 rounded-md border border-olive-100 dark:border-olive-800/50">
                  <Compass className="h-3 w-3 text-olive-600 dark:text-olive-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{exploreStats.albums}</span>
                  <span className="text-[11px] text-stone-500">worldwide</span>
                </div>
              </div>
            )}

            {/* Year Filter Dropdown */}
            {availableYears.length > 0 && !exploreMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 min-h-[32px]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{selectedYear ? selectedYear : 'All'}</span>
                    <ChevronDown className="h-3 w-3" />
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
                    key={friend.id}
                    onClick={() => onViewFriendGlobe(friend.id)}
                    className="relative group cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 rounded-full"
                    title={friend.display_name}
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-[#111111] hover:ring-olive-400 transition-all hover:scale-110 hover:z-10">
                      <AvatarImage
                        src={getPhotoUrl(friend.avatar_url, 'avatars') || ''}
                        alt={friend.display_name}
                      />
                      <AvatarFallback className="text-xs bg-olive-500 text-white">
                        {friend.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ))}
                {friends.length > 4 && (
                  <Link
                    href="/followers?tab=following"
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-stone-200 ring-2 ring-white dark:ring-[#111111] text-[10px] font-semibold text-stone-600 hover:bg-stone-300 transition-all duration-200 cursor-pointer"
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
                className="gap-1 h-7 px-2 text-xs"
              >
                <Globe2 className="h-3 w-3" />
                <span className="hidden lg:inline">My Globe</span>
              </Button>
            )}

            {isOwnProfile && !exploreMode && (
              <button
                onClick={() => {
                  setShowWishlist(!showWishlist)
                  setWishlistPrompt(null)
                }}
                className={cn(
                  "relative flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500",
                  showWishlist
                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                )}
                title={showWishlist ? 'Hide Wishlist' : 'Show Wishlist'}
              >
                {showWishlist ? (
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                ) : (
                  <StarOff className="h-3.5 w-3.5" />
                )}
                {wishlistItemsCount > 0 && (
                  <span className={cn(
                    "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold px-1",
                    showWishlist
                      ? "bg-amber-500 text-white"
                      : "bg-stone-400 text-white"
                  )}>
                    {wishlistItemsCount}
                  </span>
                )}
              </button>
            )}


            {isOwnProfile && !exploreMode && (
              <Link href="/albums/new">
                <Button size="sm" className="gap-1 h-7 px-2 bg-olive-500 hover:bg-olive-600 text-white text-xs">
                  <Plus className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
