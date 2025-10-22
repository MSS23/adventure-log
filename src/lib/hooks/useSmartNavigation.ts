'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { log } from '@/lib/utils/logger'

interface NavigationState {
  scrollPosition: number
  timestamp: number
  path: string
}

const SCROLL_POSITIONS = new Map<string, NavigationState>()
const SESSION_KEY = 'nav_history'

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
  const saveScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY
    const state: NavigationState = {
      scrollPosition: scrollY,
      timestamp: Date.now(),
      path: pathname
    }

    SCROLL_POSITIONS.set(pathname, state)
    scrollPositionSaved.current = true

    log.info('Scroll position saved', {
      component: 'useSmartNavigation',
      path: pathname,
      scrollY
    })
  }, [pathname])

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') return

    const state = SCROLL_POSITIONS.get(pathname)
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
          scrollY: state.scrollPosition
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
      // Use native back to preserve scroll
      window.history.back()
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
    const state = SCROLL_POSITIONS.get(pathname)
    if (state && !scrollPositionSaved.current) {
      // Small delay to ensure content is loaded
      const timeout = setTimeout(restoreScrollPosition, 100)
      return () => clearTimeout(timeout)
    }

    // Reset flag
    scrollPositionSaved.current = false
  }, [pathname, restoreScrollPosition])

  return {
    goBack,
    saveScrollPosition,
    restoreScrollPosition
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
