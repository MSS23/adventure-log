/**
 * Cross-platform storage utility for Adventure Log
 * Provides unified storage API for web localStorage and native Capacitor Preferences
 */

import { useState, useEffect, useCallback } from 'react'
import { Platform } from './platform'

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
      console.warn('Storage get failed:', error)

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
      console.warn('Storage set failed:', error)

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
      console.warn('Storage remove failed:', error)

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
      console.warn('Storage getJSON failed:', error)
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
      console.warn('Storage setJSON failed:', error)
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
        console.warn('useCrossPlatformStorage load failed:', error)
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
      console.warn('useCrossPlatformStorage update failed:', error)
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