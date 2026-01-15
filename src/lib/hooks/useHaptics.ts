'use client'

import { useCallback, useRef } from 'react'

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

interface HapticOptions {
  pattern?: HapticPattern
  duration?: number
}

// Check if we're on a mobile device that supports haptics
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Check if the Vibration API is supported
const supportsVibration = () => {
  if (typeof window === 'undefined') return false
  return 'vibrate' in navigator
}

// Vibration patterns for different feedback types (in milliseconds)
const vibrationPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],    // Short buzz, pause, short buzz
  warning: [25, 50, 25],    // Medium buzz, pause, medium buzz
  error: [50, 30, 50, 30, 50], // Three heavy buzzes
  selection: 5,
}

/**
 * Custom hook for haptic feedback on mobile devices
 *
 * Uses the Vibration API for web, with fallback for non-supporting browsers.
 * Automatically detects mobile devices and only triggers on supported platforms.
 *
 * @example
 * const { trigger, triggerLight, triggerSuccess } = useHaptics()
 *
 * // Trigger on button press
 * <button onClick={() => { triggerLight(); handleClick() }}>
 *   Click me
 * </button>
 */
export function useHaptics() {
  const lastTriggerRef = useRef<number>(0)
  const minInterval = 50 // Minimum ms between haptic triggers to prevent spam

  const isSupported = useCallback(() => {
    return isMobileDevice() && supportsVibration()
  }, [])

  const trigger = useCallback((options: HapticOptions = {}) => {
    const { pattern = 'light' } = options

    // Throttle haptic triggers
    const now = Date.now()
    if (now - lastTriggerRef.current < minInterval) return
    lastTriggerRef.current = now

    if (!isSupported()) return

    try {
      const vibrationPattern = vibrationPatterns[pattern]
      navigator.vibrate(vibrationPattern)
    } catch {
      // Silently fail if vibration is not available
    }
  }, [isSupported])

  // Convenience methods for common patterns
  const triggerLight = useCallback(() => trigger({ pattern: 'light' }), [trigger])
  const triggerMedium = useCallback(() => trigger({ pattern: 'medium' }), [trigger])
  const triggerHeavy = useCallback(() => trigger({ pattern: 'heavy' }), [trigger])
  const triggerSuccess = useCallback(() => trigger({ pattern: 'success' }), [trigger])
  const triggerWarning = useCallback(() => trigger({ pattern: 'warning' }), [trigger])
  const triggerError = useCallback(() => trigger({ pattern: 'error' }), [trigger])
  const triggerSelection = useCallback(() => trigger({ pattern: 'selection' }), [trigger])

  return {
    trigger,
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSuccess,
    triggerWarning,
    triggerError,
    triggerSelection,
    isSupported: isSupported(),
  }
}

export type { HapticPattern, HapticOptions }
