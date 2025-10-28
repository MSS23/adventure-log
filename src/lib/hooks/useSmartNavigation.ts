'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { log } from '@/lib/utils/logger'

interface NavigationState {
  scrollPosition: number
  timestamp: number
  path: string
  tabState?: string // Track active tab for feed page
  customState?: Record<string, unknown> // Allow custom state data
}

const SCROLL_POSITIONS = new Map<string, NavigationState>()
const SESSION_KEY = 'nav_history'
const TAB_STATE_KEY = 'nav_tab_state'

/**
 * Save navigation state to session storage
 */
function saveToSessionStorage(path: string, state: NavigationState) {
  if (typeof window === 'undefined') return

  try {
    const storedStates = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) || '{}'
    ) as Record<string, NavigationState>

    storedStates[path] = state
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(storedStates))
  } catch (e) {
    log.error('Failed to save navigation state to session storage', {
      component: 'useSmartNavigation',
      action: 'saveToSessionStorage',
      error: e
    })
  }
}

/**
 * Load navigation state from session storage
 */
function loadFromSessionStorage(path: string): NavigationState | null {
  if (typeof window === 'undefined') return null

  try {
    const storedStates = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) || '{}'
    ) as Record<string, NavigationState>

    return storedStates[path] || null
  } catch (e) {
    log.error('Failed to load navigation state from session storage', {
      component: 'useSmartNavigation',
      action: 'loadFromSessionStorage',
      error: e
    })
    return null
  }
}

/**
 * Save tab state specifically for feed page
 */
export function saveTabState(tab: string) {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(TAB_STATE_KEY, tab)

    // Also update the navigation state for /feed path
    const feedState = SCROLL_POSITIONS.get('/feed') || loadFromSessionStorage('/feed')
    if (feedState) {
      feedState.tabState = tab
      SCROLL_POSITIONS.set('/feed', feedState)
      saveToSessionStorage('/feed', feedState)
    }

    log.info('Tab state saved', {
      component: 'useSmartNavigation',
      action: 'saveTabState',
      tab
    })
  } catch (e) {
    log.error('Failed to save tab state', {
      component: 'useSmartNavigation',
      action: 'saveTabState',
      error: e
    })
  }
}

/**
 * Get saved tab state for feed page
 */
export function getTabState(): string | null {
  if (typeof window === 'undefined') return null

  try {
    return sessionStorage.getItem(TAB_STATE_KEY)
  } catch (e) {
    return null
  }
}

/**
 * Reset all navigation state - called on logout
 */
export function resetNavigationState() {
  if (typeof window === 'undefined') return

  SCROLL_POSITIONS.clear()

  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(TAB_STATE_KEY)
  } catch (e) {
    // Ignore session storage errors
  }

  log.info('Navigation state cleared', {
    component: 'useSmartNavigation',
    action: 'reset'
  })
}

/**
 * Smart navigation hook that handles:
 * - Back navigation with scroll restoration
 * - History management
 * - Default fallback routes
 */
export function useSmartNavigation(fallbackRoute: string = '/feed') {
  const router = useRouter()
  const pathname = usePathname()
  const scrollPositionSaved = useRef(false)

  // Save scroll position before navigation
  const saveScrollPosition = useCallback((customState?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY
    const state: NavigationState = {
      scrollPosition: scrollY,
      timestamp: Date.now(),
      path: pathname,
      customState
    }

    // Special handling for feed page - save tab state
    if (pathname === '/feed') {
      const tabState = getTabState()
      if (tabState) {
        state.tabState = tabState
      }
    }

    SCROLL_POSITIONS.set(pathname, state)
    scrollPositionSaved.current = true

    // Also save to session storage for persistence
    saveToSessionStorage(pathname, state)

    log.info('Scroll position saved', {
      component: 'useSmartNavigation',
      path: pathname,
      scrollY,
      hasTabState: !!state.tabState,
      hasCustomState: !!customState
    })
  }, [pathname])

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') return

    // Try to get state from memory first, then session storage
    let state: NavigationState | undefined = SCROLL_POSITIONS.get(pathname)
    if (!state) {
      const sessionState = loadFromSessionStorage(pathname)
      if (sessionState) {
        state = sessionState
        SCROLL_POSITIONS.set(pathname, sessionState)
      }
    }

    if (state) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: state.scrollPosition,
          behavior: 'instant' as ScrollBehavior
        })

        log.info('Scroll position restored', {
          component: 'useSmartNavigation',
          path: pathname,
          scrollY: state.scrollPosition,
          hasTabState: !!state.tabState
        })
      })
    }
  }, [pathname])

  // Smart back navigation
  const goBack = useCallback(() => {
    if (typeof window === 'undefined') return

    // Save current scroll before going back
    saveScrollPosition()

    // Check if there's history to go back to
    const hasHistory = window.history.length > 1

    // Check if we came from the same domain
    const hasSameDomainReferrer = document.referrer &&
      document.referrer.includes(window.location.host)

    if (hasHistory && hasSameDomainReferrer) {
      // Use Next.js router.back() for proper client-side navigation
      router.back()
    } else {
      // Fallback to default route
      router.push(fallbackRoute)
    }
  }, [saveScrollPosition, fallbackRoute, router])

  // Save scroll on unmount or before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScrollPosition()
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && link.href && !link.target) {
        saveScrollPosition()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [saveScrollPosition])

  // Restore scroll on page load
  useEffect(() => {
    // Only restore if we have a saved position
    let state: NavigationState | undefined = SCROLL_POSITIONS.get(pathname)
    if (!state) {
      const sessionState = loadFromSessionStorage(pathname)
      if (sessionState) {
        state = sessionState
      }
    }

    if (state && !scrollPositionSaved.current) {
      // Small delay to ensure content is loaded
      const timeout = setTimeout(restoreScrollPosition, 100)
      return () => clearTimeout(timeout)
    }

    // Reset flag
    scrollPositionSaved.current = false
  }, [pathname, restoreScrollPosition])

  // Get navigation state for the current path
  const getNavigationState = useCallback(() => {
    let state: NavigationState | undefined = SCROLL_POSITIONS.get(pathname)
    if (!state) {
      const sessionState = loadFromSessionStorage(pathname)
      if (sessionState) {
        state = sessionState
      }
    }
    return state
  }, [pathname])

  return {
    goBack,
    saveScrollPosition,
    restoreScrollPosition,
    resetNavigationState,
    getNavigationState
  }
}

/**
 * Hook to detect if new content is available (for "jump to present" feature)
 */
export function useNewContentDetector(
  currentItemId: string | null,
  checkInterval: number = 30000 // 30 seconds
) {
  const [hasNewContent, setHasNewContent] = useState(false)
  const initialItemRef = useRef<string | null>(null)

  useEffect(() => {
    // Store the initial item when component mounts
    if (currentItemId && !initialItemRef.current) {
      initialItemRef.current = currentItemId
    }

    // Set up interval to check for new content
    const interval = setInterval(() => {
      if (initialItemRef.current && currentItemId !== initialItemRef.current) {
        setHasNewContent(true)
      }
    }, checkInterval)

    return () => clearInterval(interval)
  }, [currentItemId, checkInterval])

  const resetNewContent = useCallback(() => {
    setHasNewContent(false)
    initialItemRef.current = currentItemId
  }, [currentItemId])

  return {
    hasNewContent,
    resetNewContent
  }
}
