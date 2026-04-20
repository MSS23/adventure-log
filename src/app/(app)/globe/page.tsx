'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Globe2, Plus, Camera } from 'lucide-react'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import type { Profile } from '@/types/database'

// Extracted hook and sub-components
import { useGlobePageData, formatDistance } from './useGlobePageData'
import type { EnhancedGlobeRef } from './useGlobePageData'
import { GlobePageHeader } from '@/components/globe/GlobePageHeader'
import { GlobeStatsOverlay } from '@/components/globe/GlobeStatsOverlay'
import { GlobeExploreStrip, GlobeExploreStatsIndicator } from '@/components/globe/GlobeExploreMode'
import { GlobeSidePanel, MobileFeaturedAlbum, GlobeAlbumFilmstrip } from '@/components/globe/GlobeSidebar'
import { GlobeWishlistPrompt } from '@/components/globe/GlobeWishlistPrompt'

const EnhancedGlobe = dynamic(() => import('@/components/globe/EnhancedGlobe').then(mod => ({ default: mod.EnhancedGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-stone-50 to-white dark:from-[#000000] dark:to-[#111111]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Globe2 className="h-12 w-12 text-olive-400 opacity-40" />
          </div>
          <Globe2 className="h-12 w-12 text-olive-500 animate-pulse" />
        </div>
        <p className="text-lg text-stone-700 dark:text-stone-300 font-medium">Loading your travel globe...</p>
      </div>
    </div>
  )
})

function GlobePageContent() {
  const data = useGlobePageData()

  const {
    globeRef,
    urlAlbumId, lat, lng, userId,
    user, router,
    albums, selectedAlbumId, setSelectedAlbumId, stats, totalDistance, handleAlbumClick,
    isOwnProfile, isPrivateAccount, profileUser, followStatus,
    friends, handleViewFriendGlobe,
    selectedYear, setSelectedYear, availableYears,
    showStatsOverlay, setShowStatsOverlay, hideEmptyCta, setHideEmptyCta,
    exploreMode, setExploreMode, exploreAlbums, exploreLoading, exploreStats,
    wishlistItems, showWishlist, setShowWishlist,
    wishlistPrompt, setWishlistPrompt,
    handleGlobeBackgroundClick, handleConfirmWishlist, handleWishlistItemClick,
  } = data

  // Show private account message if user doesn't have access
  if (isPrivateAccount && profileUser && followStatus !== 'following') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full">
          <PrivateAccountMessage
            profile={profileUser as unknown as Profile}
            showFollowButton={true}
          />

          <p className="text-center text-sm text-stone-600 mt-4">
            {profileUser.privacy_level === 'private'
              ? 'Follow this account to see their travel globe and albums'
              : 'Follow this account to see their adventures'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="full-bleed globe-height bg-stone-50 dark:bg-[#000000] flex flex-col overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 -mb-24 lg:-mb-8"
    >
      {/* Compact Header */}
      <GlobePageHeader
        exploreMode={exploreMode}
        setExploreMode={setExploreMode}
        isOwnProfile={isOwnProfile}
        profileUser={profileUser}
        stats={stats}
        totalDistance={totalDistance}
        formatDistance={formatDistance}
        exploreStats={exploreStats}
        availableYears={availableYears}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        friends={friends}
        onViewFriendGlobe={handleViewFriendGlobe}
        showWishlist={showWishlist}
        setShowWishlist={setShowWishlist}
        setWishlistPrompt={() => setWishlistPrompt(null)}
        wishlistItemsCount={wishlistItems.length}
        user={user}
        router={router}
      />

      {/* Main Content - Full-size Globe */}
      <div className="flex-1 bg-stone-900 relative overflow-hidden flex flex-row">
        {/* Globe Container */}
        <div className={cn(
          "relative flex-1 transition-all duration-300 ease-in-out",
          selectedAlbumId && !exploreMode ? "md:flex-[1_1_0%]" : "w-full"
        )}>
        <div className="absolute inset-0">
          <ErrorBoundary>
            <EnhancedGlobe
              key={userId || 'self'}
              ref={globeRef}
              className="w-full h-full"
              hideHeader={true}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              initialAlbumId={urlAlbumId || undefined}
              initialLat={lat ? parseFloat(lat) : undefined}
              initialLng={lng ? parseFloat(lng) : undefined}
              filterUserId={userId || undefined}
              onGlobeBackgroundClick={handleGlobeBackgroundClick}
            />
          </ErrorBoundary>
        </div>

        {/* Empty Globe CTA - show when user has no albums */}
        {albums.length === 0 && isOwnProfile && !exploreMode && !hideEmptyCta && (
          <GlobeEmptyCta
            onDismiss={() => setHideEmptyCta(true)}
            onExplore={() => setExploreMode(true)}
          />
        )}

        {/* Floating Stats Overlay (hidden in explore mode) */}
        {albums.length > 0 && !exploreMode && (
          <GlobeStatsOverlay
            stats={stats}
            totalDistance={totalDistance}
            formatDistance={formatDistance}
            showStatsOverlay={showStatsOverlay}
            setShowStatsOverlay={setShowStatsOverlay}
          />
        )}

        {/* Mobile explore stats indicator */}
        {exploreMode && exploreAlbums.length > 0 && (
          <GlobeExploreStatsIndicator exploreStats={exploreStats} />
        )}

        {/* Wishlist prompt overlay */}
        {wishlistPrompt && (
          <GlobeWishlistPrompt
            prompt={wishlistPrompt}
            onConfirm={handleConfirmWishlist}
            onDismiss={() => setWishlistPrompt(null)}
          />
        )}

        {/* Bottom Location Strip - Floating over globe */}
        {/* Explore mode strip */}
        {exploreMode && (
          <GlobeExploreStrip
            exploreAlbums={exploreAlbums}
            exploreLoading={exploreLoading}
            exploreStats={exploreStats}
          />
        )}

        {/* My Globe mode: filmstrip at bottom of globe */}
        {!exploreMode && (albums.length > 0 || (showWishlist && wishlistItems.length > 0)) && (
          <>
            {/* Mobile only: Featured Album Card overlay */}
            {selectedAlbumId && (() => {
              const featured = albums.find(a => a.id === selectedAlbumId)
              if (!featured) return null
              return (
                <MobileFeaturedAlbum
                  album={featured}
                  onClose={() => setSelectedAlbumId(null)}
                />
              )
            })()}

            {/* Album filmstrip */}
            <GlobeAlbumFilmstrip
              albums={albums}
              selectedAlbumId={selectedAlbumId}
              onAlbumClick={handleAlbumClick}
              showWishlist={showWishlist}
              wishlistItems={wishlistItems}
              onWishlistItemClick={handleWishlistItemClick}
            />
          </>
        )}
        </div>{/* end globe container */}

        {/* Desktop Side Panel -- shown when album selected, sits beside the globe */}
        {!exploreMode && selectedAlbumId && (() => {
          const featured = albums.find(a => a.id === selectedAlbumId)
          if (!featured) return null
          return (
            <GlobeSidePanel
              album={featured}
              onClose={() => setSelectedAlbumId(null)}
            />
          )
        })()}
      </div>

      {/* Mobile Bottom Navigation Hint */}
      {isOwnProfile && albums.length === 0 && (
        <GlobeMobileEmptyHint />
      )}

    </div>
  )
}

// --------------- Small inline sub-components ---------------

function GlobeEmptyCta({ onDismiss, onExplore }: { onDismiss: () => void; onExplore: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.1] p-6 sm:p-8 max-w-sm mx-4 text-center shadow-2xl relative">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Dismiss"
        >
          <span className="text-lg">&times;</span>
        </button>
        <div className="w-14 h-14 rounded-2xl bg-olive-900/40 flex items-center justify-center mx-auto mb-3">
          <Globe2 className="h-7 w-7 text-olive-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Your globe is empty</h3>
        <p className="text-sm text-white/60 mb-5 leading-relaxed">
          Create your first album to see it pinned here. Upload photos with GPS data and watch your travels come to life.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/albums/new">
            <Button className="w-full bg-olive-600 hover:bg-olive-700 text-white rounded-xl h-10 gap-2 cursor-pointer active:scale-[0.97] transition-all duration-200">
              <Plus className="h-4 w-4" />
              Create First Album
            </Button>
          </Link>
          <button
            onClick={onExplore}
            className="text-xs text-white/50 hover:text-white/80 transition-colors duration-200 py-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 rounded-lg"
          >
            or explore other travelers&apos; globes
          </button>
        </div>
      </div>
    </div>
  )
}

function GlobeMobileEmptyHint() {
  return (
    <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-stone-200 dark:border-white/[0.06] p-5 z-30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center flex-shrink-0">
          <Globe2 className="h-4.5 w-4.5 text-olive-600 dark:text-olive-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Light up your globe</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Add your first trip to see it pinned here</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/albums/import" className="flex-1">
          <Button className="w-full gap-1.5 bg-olive-500 hover:bg-olive-600 text-white text-xs h-9 cursor-pointer active:scale-[0.97] transition-all duration-200">
            <Camera className="h-3.5 w-3.5" />
            Import Photos
          </Button>
        </Link>
        <Link href="/albums/new" className="flex-1">
          <Button variant="outline" className="w-full gap-1.5 text-xs h-9 border-stone-300 dark:border-stone-700 cursor-pointer active:scale-[0.97] transition-all duration-200">
            <Plus className="h-3.5 w-3.5" />
            Create Album
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function GlobePage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center bg-gradient-to-b from-stone-50 to-white dark:from-[#000000] dark:to-[#111111] globe-height">
        <div className="flex flex-col items-center gap-4">
          <Globe2 className="h-12 w-12 text-olive-500 animate-pulse" />
          <p className="text-lg text-stone-700 font-medium">Loading your travel globe...</p>
        </div>
      </div>
    }>
      <GlobePageContent />
    </Suspense>
  )
}
