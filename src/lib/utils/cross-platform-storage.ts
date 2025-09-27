/**
 * Cross-platform storage utility for Adventure Log
 * Provides unified storage API for web localStorage and native Capacitor Preferences
 */

import { useState, useEffect, useCallback } from 'react'
import { Platform } from './platform'
import { log } from './logger'

export interface StorageOptions {
  fallback?: boolean // If true, fall back to memory storage if platform storage fails
  prefix?: string    // Optional prefix for keys
}

export class CrossPlatformStorage {
  private memoryStore: Map<string, string> = new Map()
  private options: StorageOptions

  constructor(options: StorageOptions = {}) {
    this.options = {
      fallback: true,
      prefix: 'adventure-log-',
      ...options
    }
  }

  private getKey(key: string): string {
    return this.options.prefix ? `${this.options.prefix}${key}` : key
  }

  /**
   * Get a value from storage
   */
  async get(key: string): Promise<string | null> {
    const fullKey = this.getKey(key)

    try {
      if (Platform.isWeb() && typeof localStorage !== 'undefined') {
        return localStorage.getItem(fullKey)
      } else {
        // Native platform - use Capacitor Preferences
        const { Preferences } = await import('@capacitor/preferences')
        const result = await Preferences.get({ key: fullKey })
        return result.value
      }
    } catch (error) {
      log.warn('Storage get failed', {
        component: 'CrossPlatformStorage',
        action: 'get',
        key: fullKey
      }, error)

      if (this.options.fallback) {
        return this.memoryStore.get(fullKey) || null
      }
      return null
    }
  }

  /**
   * Set a value in storage
   */
  async set(key: string, value: string): Promise<boolean> {
    const fullKey = this.getKey(key)

    try {
      if (Platform.isWeb() && typeof localStorage !== 'undefined') {
        localStorage.setItem(fullKey, value)
        return true
      } else {
        // Native platform - use Capacitor Preferences
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.set({ key: fullKey, value })
        return true
      }
    } catch (error) {
      log.warn('Storage set failed', {
        component: 'CrossPlatformStorage',
        action: 'set',
        key: fullKey
      }, error)

      if (this.options.fallback) {
        this.memoryStore.set(fullKey, value)
        return true
      }
      return false
    }
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<boolean> {
    const fullKey = this.getKey(key)

    try {
      if (Platform.isWeb() && typeof localStorage !== 'undefined') {
        localStorage.removeItem(fullKey)
        return true
      } else {
        // Native platform - use Capacitor Preferences
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.remove({ key: fullKey })
        return true
      }
    } catch (error) {
      log.warn('Storage remove failed', {
        component: 'CrossPlatformStorage',
        action: 'remove',
        key: fullKey
      }, error)

      if (this.options.fallback) {
        this.memoryStore.delete(fullKey)
        return true
      }
      return false
    }
  }

  /**
   * Get JSON value from storage
   */
  async getJSON<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      log.warn('Storage getJSON failed', {
        component: 'CrossPlatformStorage',
        action: 'getJSON',
        key
      }, error)
      return null
    }
  }

  /**
   * Set JSON value in storage
   */
  async setJSON(key: string, value: unknown): Promise<boolean> {
    try {
      return await this.set(key, JSON.stringify(value))
    } catch (error) {
      log.warn('Storage setJSON failed', {
        component: 'CrossPlatformStorage',
        action: 'setJSON',
        key
      }, error)
      return false
    }
  }
}

// Default storage instance
export const crossPlatformStorage = new CrossPlatformStorage()

// React hook for cross-platform storage
export function useCrossPlatformStorage(key: string, defaultValue?: string) {
  const [value, setValue] = useState<string | null>(defaultValue || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadValue = async () => {
      try {
        const stored = await crossPlatformStorage.get(key)
        if (mounted) {
          setValue(stored || defaultValue || null)
          setLoading(false)
        }
      } catch (error) {
        log.warn('useCrossPlatformStorage load failed', {
          component: 'useCrossPlatformStorage',
          action: 'load',
          key
        }, error)
        if (mounted) {
          setValue(defaultValue || null)
          setLoading(false)
        }
      }
    }

    loadValue()

    return () => {
      mounted = false
    }
  }, [key, defaultValue])

  const updateValue = useCallback(async (newValue: string | null) => {
    try {
      if (newValue === null) {
        await crossPlatformStorage.remove(key)
      } else {
        await crossPlatformStorage.set(key, newValue)
      }
      setValue(newValue)
      return true
    } catch (error) {
      log.warn('useCrossPlatformStorage update failed', {
        component: 'useCrossPlatformStorage',
        action: 'update',
        key
      }, error)
      return false
    }
  }, [key])

  return {
    value,
    setValue: updateValue,
    loading,
    isReady: !loading
  }
}