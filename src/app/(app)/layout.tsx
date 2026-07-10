'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AgeGate } from '@/components/auth/AgeGate'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts'
import { LegalFooter } from '@/components/layout/LegalFooter'
import { PageTransition } from '@/components/animations/PageTransition'
import { PWAProvider } from '@/components/pwa'
import { UnreadCountProvider } from '@/components/activity/UnreadCountProvider'
import { PassportConnectListener } from '@/components/passport/PassportConnectListener'
import { APP_SCROLL_ID } from '@/lib/utils/app-scroll'

const FloatingActionButton = dynamic(
  () => import('@/components/ui/FloatingActionButton').then(m => ({ default: m.FloatingActionButton })),
  { ssr: false }
)

const OfflineQueueIndicator = dynamic(
  () => import('@/components/pwa/OfflineQueueIndicator').then(m => ({ default: m.OfflineQueueIndicator })),
  { ssr: false }
)

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // Hide the global "+" FAB where it would duplicate or collide with a page's
  // own bottom-docked controls:
  //  - /globe: has its own header "+" and a bottom album filmstrip.
  //  - /albums/[id]: has its own upload "+" and a mobile bottom action bar
  //    (favourite/save/comment) that the FAB was overlapping and clipping.
  const hideFab =
    pathname?.startsWith('/globe') ||
    /^\/albums\/[^/]+$/.test(pathname ?? '')

  // Locked app shell: the scroll region is an inner element, not the window.
  // On every route change, reset it to the top so each page opens at its start
  // (the browser only resets window scroll, which this shell no longer uses).
  const scrollRef = useRef<HTMLElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <ProtectedRoute>
      <PWAProvider>
        <UnreadCountProvider>
        {/* App shell — locked to the viewport height (dynamic vh so mobile
            browser chrome is accounted for). Header + bottom tab bar stay
            pinned to the screen edges; only the middle region scrolls. */}
        <div className="h-[100dvh] overflow-hidden flex flex-col bg-[color:var(--background)] transition-colors duration-300">
          {/* Left Sidebar - Desktop only (>1024px), position:fixed */}
          <Sidebar />

          {/* Top navigation for mobile and tablet - pinned, never scrolls */}
          <div className="lg:hidden shrink-0">
            <TopNavigation />
          </div>

          {/* The single scroll region. Everything page-level scrolls here so
              the shell chrome stays put. `overscroll-contain` kills the
              rubber-band bounce that makes a PWA feel unanchored. */}
          <main
            id={APP_SCROLL_ID}
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain lg:ml-[240px] xl:ml-[260px] main-content-area transition-[margin] duration-300 ease-in-out"
          >
            <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-8 max-w-7xl">
              <PageTransition>
                {children}
              </PageTransition>
              <LegalFooter />
            </div>
          </main>

          {/* Bottom navigation for mobile - pinned to the viewport bottom */}
          <BottomNavigation />

          {/* Floating action button - mobile only (hidden on the globe page,
              which has its own add button + bottom filmstrip) */}
          {!hideFab && (
            <div className="lg:hidden">
              <FloatingActionButton />
            </div>
          )}

          {/* Offline queue status */}
          <OfflineQueueIndicator />

          {/* Keyboard shortcuts */}
          <KeyboardShortcuts />

          {/* Pulls the passport OWNER into the Travel Blend the instant their
              QR is scanned (mirrors the scanner's experience). */}
          <PassportConnectListener />

          {/* 18+ backstop for OAuth accounts, which sign up without a DOB */}
          <AgeGate />
        </div>
        </UnreadCountProvider>
      </PWAProvider>
    </ProtectedRoute>
  )
}
