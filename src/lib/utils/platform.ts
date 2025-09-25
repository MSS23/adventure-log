import { Capacitor } from '@capacitor/core'

export interface PlatformInfo {
  isWeb: boolean
  isNative: boolean
  isAndroid: boolean
  isIOS: boolean
  platform: 'web' | 'android' | 'ios'
}

/**
 * Platform detection utility for cross-platform functionality
 * Provides runtime detection of web, iOS, and Android environments
 */
export class Platform {
  private static info: PlatformInfo | null = null

  /**
   * Get comprehensive platform information
   */
  static getInfo(): PlatformInfo {
    if (!this.info) {
      const platform = Capacitor.getPlatform()

      this.info = {
        isWeb: platform === 'web',
        isNative: platform !== 'web',
        isAndroid: platform === 'android',
        isIOS: platform === 'ios',
        platform: platform as 'web' | 'android' | 'ios'
      }
    }

    return this.info
  }

  /**
   * Check if running on web platform
   */
  static isWeb(): boolean {
    return this.getInfo().isWeb
  }

  /**
   * Check if running on native platform (iOS or Android)
   */
  static isNative(): boolean {
    return this.getInfo().isNative
  }

  /**
   * Check if running on Android
   */
  static isAndroid(): boolean {
    return this.getInfo().isAndroid
  }

  /**
   * Check if running on iOS
   */
  static isIOS(): boolean {
    return this.getInfo().isIOS
  }

  /**
   * Get the platform name
   */
  static getPlatform(): 'web' | 'android' | 'ios' {
    return this.getInfo().platform
  }

  /**
   * Check if a specific capability is available
   */
  static isCapabilityAvailable(capability: 'camera' | 'geolocation' | 'filesystem' | 'share' | 'toast'): boolean {
    const { isNative, isWeb } = this.getInfo()

    switch (capability) {
      case 'camera':
        // Native camera API on mobile, file input on web
        return isNative || (isWeb && 'MediaDevices' in window && 'getUserMedia' in navigator.mediaDevices)

      case 'geolocation':
        // Native geolocation on mobile, browser geolocation on web
        return isNative || (isWeb && 'geolocation' in navigator)

      case 'filesystem':
        // Native filesystem on mobile, limited on web
        return isNative || (isWeb && 'File' in window)

      case 'share':
        // Native sharing on mobile, Web Share API on supported browsers
        return isNative || (isWeb && 'share' in navigator)

      case 'toast':
        // Native toast on mobile, fallback alert on web
        return true // Always available with fallbacks

      default:
        return false
    }
  }

  /**
   * Get user agent information (useful for additional detection)
   */
  static getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : ''
  }

  /**
   * Check if running in development mode
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  /**
   * Check if the app is running in a standalone mode (PWA or native)
   */
  static isStandalone(): boolean {
    const { isNative } = this.getInfo()

    if (isNative) return true

    // Check for PWA standalone mode
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator && (navigator as unknown as Record<string, unknown>).standalone === true)
      )
    }

    return false
  }

  /**
   * Get device information
   */
  static getDeviceInfo() {
    const info = this.getInfo()
    const userAgent = this.getUserAgent()

    return {
      ...info,
      userAgent,
      isStandalone: this.isStandalone(),
      isDevelopment: this.isDevelopment(),
      hasTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
      screen: typeof window !== 'undefined' ? {
        width: window.screen.width,
        height: window.screen.height,
        orientation: window.screen.orientation?.type
      } : null
    }
  }
}

/**
 * Hook for React components to use platform detection
 */
export const usePlatform = () => {
  return Platform.getInfo()
}

/**
 * Utility function to conditionally execute code based on platform
 */
export const withPlatform = <T>(handlers: {
  web?: () => T
  android?: () => T
  ios?: () => T
  native?: () => T
  default?: () => T
}): T | undefined => {
  const { platform, isNative } = Platform.getInfo()

  // Try platform-specific handler first
  if (handlers[platform]) {
    return handlers[platform]!()
  }

  // Try native handler for mobile platforms
  if (isNative && handlers.native) {
    return handlers.native()
  }

  // Fall back to default handler
  if (handlers.default) {
    return handlers.default()
  }

  return undefined
}