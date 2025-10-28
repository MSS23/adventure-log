'use client'

import { useCallback, useRef } from 'react'

interface UseDoubleTapOptions {
  onDoubleTap: () => void
  onSingleTap?: () => void
  delay?: number // Time window for double tap in ms
  enabled?: boolean
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = 300,
  enabled = true
}: UseDoubleTapOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tapCountRef = useRef(0)
  const lastTapRef = useRef<number>(0)

  const handleTap = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return

    // Prevent default to avoid any unintended behavior
    if ('touches' in event) {
      // For touch events, we don't want to prevent default as it might break scrolling
    } else {
      // For mouse events, prevent text selection on double-click
      event.preventDefault()
    }

    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current

    if (timeSinceLastTap < delay) {
      // This is a double tap
      tapCountRef.current = 0
      lastTapRef.current = 0

      // Clear any pending single tap timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      onDoubleTap()
    } else {
      // This might be the first tap of a double tap or a single tap
      tapCountRef.current = 1
      lastTapRef.current = now

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set timeout to execute single tap if no second tap comes
      if (onSingleTap) {
        timeoutRef.current = setTimeout(() => {
          if (tapCountRef.current === 1) {
            onSingleTap()
          }
          tapCountRef.current = 0
          lastTapRef.current = 0
        }, delay)
      }
    }
  }, [delay, enabled, onDoubleTap, onSingleTap])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return {
    handleTap,
    cleanup
  }
}

// Touch-specific double tap hook with better mobile support
export function useDoubleTapTouch({
  onDoubleTap,
  onSingleTap,
  delay = 300,
  enabled = true
}: UseDoubleTapOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!enabled || event.touches.length !== 1) return

    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [enabled])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return

    // Check if touch ended near where it started (to avoid counting swipes as taps)
    const touch = event.changedTouches[0]
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

    // If finger moved more than 10 pixels, don't count as tap
    if (deltaX > 10 || deltaY > 10) {
      touchStartRef.current = null
      return
    }

    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current

    if (timeSinceLastTap < delay) {
      // Double tap detected
      lastTapRef.current = 0

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      onDoubleTap()
    } else {
      // First tap or single tap
      lastTapRef.current = now

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (onSingleTap) {
        timeoutRef.current = setTimeout(() => {
          onSingleTap()
          lastTapRef.current = 0
        }, delay)
      }
    }

    touchStartRef.current = null
  }, [delay, enabled, onDoubleTap, onSingleTap])

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return {
    handleTouchStart,
    handleTouchEnd,
    cleanup
  }
}