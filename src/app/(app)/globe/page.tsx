'use client'

import { Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Globe2, Plus, Camera, CircleHelp, House, CalendarRange, Route } from 'lucide-react'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ErrorRetryState } from '@/components/ui/error-retry-state'
import { WalkthroughTour, type TourStep } from '@/components/ui/walkthrough-tour'
import type { Profile } from '@/types/database'

// Extracted hook and sub-components
import { useGlobePageData, formatDistance } from './useGlobePageData'
import { GlobePageHeader } from '@/components/globe/GlobePageHeader'
import { GlobeStatsOverlay } from '@/components/globe/GlobeStatsOverlay'
import { GlobeExploreStrip, GlobeExploreStatsIndicator } from '@/components/globe/GlobeExploreMode'
import { GlobeSidePanel, GlobeAlbumFilmstrip } from '@/components/globe/GlobeSidebar'
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
    isDataError, refetchGlobeData,
    friends, handleViewFriendGlobe, handlePrefetchFriendGlobe,
    selectedYear, setSelectedYear, availableYears,
    hideEmptyCta, setHideEmptyCta,
    exploreMode, setExploreMode, explorePeriod, setExplorePeriod, exploreAlbums, exploreLoading, exploreStats,
    wishlistItems, showWishlist, setShowWishlist,
    wishlistPrompt, setWishlistPrompt,
    handleGlobeBackgroundClick, handleConfirmWishlist, handleWishlistItemClick,
    handleWishlistPinClick,
  } = data

  const globeTourSteps = useMemo<TourStep[]>(
    () => [
      {
        target: 'globe-journey-canvas',
        title: 'Every journey starts at home',
        description:
          'Your home base anchors each separate trip. London to Paris is one route; a later Belgium trip starts from London again instead of being joined to Paris.',
        icon: <House className="h-5 w-5" />,
        placement: 'auto',
        spotlightPadding: 8,
      },
      {
        target: 'globe-controls',
        title: 'Years stay separate',
        description:
          'Use the year filter to inspect one travel timeline. Paris in 2022 and Belgium in 2025 remain London → Paris and London → Belgium — never Paris → Belgium.',
        icon: <CalendarRange className="h-5 w-5" />,
        placement: 'bottom',
        spotlightPadding: 8,
      },
      {
        target: 'globe-filmstrip',
        title: 'Link stops from the same trip',
        description:
          'If Paris and Belgium belong to one trip, set Belgium to “Continues from Paris” when creating the album. The globe then shows London → Paris → Belgium as one journey.',
        icon: <Route className="h-5 w-5" />,
        placement: 'top',
        spotlightPadding: 10,
      },
    ],
    []
  )

  // Wishlist pins to render on the globe — only when toggled on, only items
  // that are still open (not yet completed). Drop any with missing coords.
  const wishlistGlobePins = (showWishlist && isOwnProfile)
    ? wishlistItems
        .filter(w => !w.completed_at && w.latitude != null && w.longitude != null)
        .map(w => ({
          id: w.id,
          latitude: w.latitude,
          longitude: w.longitude,
          location_name: w.location_name,
        }))
    : []

  const communityGlobePins = useMemo(() => {
    if (!exploreMode) return []
    const groups = new Map<string, typeof exploreAlbums>()
    for (const album of exploreAlbums) {
      if (album.latitude == null || album.longitude == null) continue
      const country = album.country_code || album.location_name?.split(',').at(-1)?.trim() || 'Worldwide'
      groups.set(country, [...(groups.get(country) || []), album])
    }
    return [...groups.entries()].map(([country, countryAlbums]) => ({
      id: country,
      albumId: countryAlbums[0].id,
      latitude: countryAlbums.reduce((sum, album) => sum + album.latitude!, 0) / countryAlbums.length,
      longitude: countryAlbums.reduce((sum, album) => sum + album.longitude!, 0) / countryAlbums.length,
      label: country,
      albumCount: countryAlbums.length,
    }))
  }, [exploreAlbums, exploreMode])

  // Load failed with nothing to show — offer a retry instead of an empty globe
  // with a "0 adventures" header that looks like the user has no travels.
  if (isDataError && albums.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-[color:var(--background)] p-4">
        <div className="w-full max-w-md">
          <ErrorRetryState
            variant="card"
            title="Couldn’t load your globe"
            description="We couldn’t reach the server. Your travels are safe — try again."
            onRetry={() => refetchGlobeData()}
          />
        </div>
      </div>
    )
  }

  // Show private account message if user doesn't have access
  if (isPrivateAccount && profileUser && followStatus !== 'following') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-[color:var(--background)] p-4">
        <div className="max-w-md w-full">
          <PrivateAccountMessage
            profile={profileUser as unknown as Profile}
            showFollowButton={true}
          />

          <p className="text-center text-sm text-stone-600 dark:text-stone-400 mt-4">
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
        onPrefetchFriendGlobe={handlePrefetchFriendGlobe}
        showWishlist={showWishlist}
        setShowWishlist={setShowWishlist}
        setWishlistPrompt={() => setWishlistPrompt(null)}
        wishlistItemsCount={wishlistItems.length}
        user={user}
        router={router}
      />

      {/* Main Content - Full-size Globe */}
      <div className="flex-1 bg-stone-900 relative overflow-hidden flex flex-row">
        <WalkthroughTour
          tourId="globe-flight-timeline-v2"
          steps={globeTourSteps}
          autoStart={isOwnProfile && albums.length > 0 && !exploreMode}
        >
          {(startTour) => (
            <button
              type="button"
              onClick={startTour}
              className="absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-stone-950/75 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 active:bg-stone-800"
              aria-label="Take a tour of flight timelines"
              title="Flight timeline tour"
            >
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </WalkthroughTour>
        {/* Globe Container — always full width; the preview card now docks
            to the bottom instead of reserving a right panel. */}
        <div className="relative flex-1 w-full" data-tour-step="globe-journey-canvas">
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
              isOwnProfile={isOwnProfile}
              onGlobeBackgroundClick={handleGlobeBackgroundClick}
              wishlistPins={wishlistGlobePins}
              onWishlistPinClick={handleWishlistPinClick}
              communityPins={communityGlobePins}
              showCommunityLayer={exploreMode}
              onCommunityPinClick={(albumId) => router.push(`/albums/${albumId}`)}
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

        {/* Floating Stats Overlay (desktop only, hidden in explore mode) */}
        {albums.length > 0 && !exploreMode && (
          <GlobeStatsOverlay
            stats={stats}
            totalDistance={totalDistance}
            formatDistance={formatDistance}
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
            period={explorePeriod}
            onPeriodChange={setExplorePeriod}
          />
        )}

        {/* My Globe mode: bottom dock filmstrip. The selected-album detail is
            shown by the single AlbumImageModal preview (rendered inside the
            globe), so the filmstrip stays visible on all breakpoints — no
            second stacked card on mobile. */}
        {!exploreMode && (albums.length > 0 || (showWishlist && wishlistItems.length > 0)) && (
          <GlobeAlbumFilmstrip
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            onAlbumClick={handleAlbumClick}
            showWishlist={showWishlist}
            wishlistItems={wishlistItems}
            onWishlistItemClick={handleWishlistItemClick}
          />
        )}
        </div>{/* end globe container */}

        {/* Desktop Side Panel -- shown when album selected, sits beside the globe */}
        {!exploreMode && selectedAlbumId && (() => {
          const featured = albums.find(a => a.id === selectedAlbumId)
          if (!featured) return null
          return (
            <GlobeSidePanel
              album={featured}
              isOwnProfile={isOwnProfile}
              onClose={() => setSelectedAlbumId(null)}
            />
          )
        })()}
      </div>

    </div>
  )
}

// --------------- Small inline sub-components ---------------

function GlobeEmptyCta({ onDismiss, onExplore }: { onDismiss: () => void; onExplore: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto bg-card/90 backdrop-blur-xl rounded-2xl border border-border p-6 sm:p-8 max-w-sm mx-4 text-center shadow-2xl relative">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Dismiss"
        >
          <span className="text-lg">&times;</span>
        </button>
        <div className="w-14 h-14 rounded-2xl bg-olive-900/40 flex items-center justify-center mx-auto mb-3">
          <Globe2 className="h-7 w-7 text-olive-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Keep a trip — watch your world light up</h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Choose a batch of trip photos and we&apos;ll suggest private memories by date and place for you to review.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/albums/import">
            <Button className="w-full bg-olive-600 hover:bg-olive-700 text-white rounded-xl h-10 gap-2 cursor-pointer active:scale-[0.97] transition-all duration-200">
              <Camera className="h-4 w-4" />
              Import Camera Roll
            </Button>
          </Link>
          <Link href="/albums/new">
            <Button variant="outline" className="w-full rounded-xl h-10 gap-2 cursor-pointer active:scale-[0.97] transition-all duration-200">
              <Plus className="h-4 w-4" />
              Create From Scratch
            </Button>
          </Link>
          <button
            type="button"
            onClick={onExplore}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 rounded-lg"
          >
            or explore other travelers&apos; globes
          </button>
        </div>
      </div>
    </div>
  )
}

// NOTE: the old GlobeMobileEmptyHint (a second bottom card duplicating the
// centered CTA's actions with slightly different styling) was removed — on an
// empty mobile globe two near-identical dialogs stacked at once.

export default function GlobePage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center bg-gradient-to-b from-stone-50 to-white dark:from-[#000000] dark:to-[#111111] globe-height">
        <div className="flex flex-col items-center gap-4">
          <Globe2 className="h-12 w-12 text-olive-500 animate-pulse" />
          <p className="text-lg text-stone-700 dark:text-stone-300 font-medium">Loading your travel globe...</p>
        </div>
      </div>
    }>
      <GlobePageContent />
    </Suspense>
  )
}
