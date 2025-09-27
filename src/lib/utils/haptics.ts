import { Platform } from './platform'

/**
 * Haptic feedback utility for mobile devices
 * Provides tactile feedback for user interactions on mobile platforms
 */
export class Haptics {
  /**
   * Light haptic feedback for subtle interactions
   * Used for: Button taps, navigation, selection
   */
  static light(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Light vibration pattern for mobile
      navigator.vibrate(10)
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Very light vibration for web on mobile devices
      navigator.vibrate(5)
    }
  }

  /**
   * Medium haptic feedback for standard interactions
   * Used for: Form submissions, confirmations, successful actions
   */
  static medium(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Medium vibration pattern
      navigator.vibrate(20)
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Medium vibration for web
      navigator.vibrate(15)
    }
  }

  /**
   * Heavy haptic feedback for important interactions
   * Used for: Errors, warnings, important confirmations
   */
  static heavy(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Heavy vibration pattern
      navigator.vibrate([30, 10, 30])
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Heavy vibration for web
      navigator.vibrate([25, 10, 25])
    }
  }

  /**
   * Success haptic feedback for positive actions
   * Used for: Successful uploads, completions, achievements
   */
  static success(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Success pattern: short-short-long
      navigator.vibrate([10, 5, 10, 5, 30])
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Success pattern for web
      navigator.vibrate([8, 5, 8, 5, 25])
    }
  }

  /**
   * Error haptic feedback for negative actions
   * Used for: Errors, failures, rejected actions
   */
  static error(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Error pattern: long-short-long
      navigator.vibrate([40, 20, 15, 20, 40])
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Error pattern for web
      navigator.vibrate([35, 15, 12, 15, 35])
    }
  }

  /**
   * Selection haptic feedback for item selection
   * Used for: List item selection, checkbox toggles, radio buttons
   */
  static selection(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Quick double tap pattern
      navigator.vibrate([8, 5, 8])
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Selection pattern for web
      navigator.vibrate([6, 4, 6])
    }
  }

  /**
   * Impact haptic feedback for impactful interactions
   * Used for: Like button, bookmark, favorite actions
   */
  static impact(): void {
    if (Platform.isNative() && 'vibrate' in navigator) {
      // Single impact vibration
      navigator.vibrate(15)
    } else if (Platform.isWeb() && 'vibrate' in navigator) {
      // Impact for web
      navigator.vibrate(12)
    }
  }

  /**
   * Check if haptic feedback is available on the current device
   */
  static isAvailable(): boolean {
    return 'vibrate' in navigator && (Platform.isNative() || Platform.isWeb())
  }

  /**
   * Trigger haptic feedback based on interaction type
   */
  static trigger(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection' | 'impact'): void {
    if (!this.isAvailable()) return

    switch (type) {
      case 'light':
        this.light()
        break
      case 'medium':
        this.medium()
        break
      case 'heavy':
        this.heavy()
        break
      case 'success':
        this.success()
        break
      case 'error':
        this.error()
        break
      case 'selection':
        this.selection()
        break
      case 'impact':
        this.impact()
        break
    }
  }
}

/**
 * React hook for haptic feedback
 */
export const useHaptics = () => {
  return {
    light: Haptics.light,
    medium: Haptics.medium,
    heavy: Haptics.heavy,
    success: Haptics.success,
    error: Haptics.error,
    selection: Haptics.selection,
    impact: Haptics.impact,
    trigger: Haptics.trigger,
    isAvailable: Haptics.isAvailable()
  }
}