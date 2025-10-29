/**
 * Cross-platform preferences storage utility
 * Works on both web (localStorage) and PWA (Capacitor Preferences)
 */

import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const isNativePlatform = () => {
  return Capacitor.isNativePlatform()
}

export const preferences = {
  /**
   * Set a value in storage
   */
  async set(key: string, value: string): Promise<void> {
    try {
      if (isNativePlatform()) {
        await Preferences.set({ key, value })
      } else {
        localStorage.setItem(key, value)
      }
    } catch (error) {
      console.error('Error setting preference:', error)
    }
  },

  /**
   * Get a value from storage
   */
  async get(key: string): Promise<string | null> {
    try {
      if (isNativePlatform()) {
        const { value } = await Preferences.get({ key })
        return value
      } else {
        return localStorage.getItem(key)
      }
    } catch (error) {
      console.error('Error getting preference:', error)
      return null
    }
  },

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      if (isNativePlatform()) {
        await Preferences.remove({ key })
      } else {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Error removing preference:', error)
    }
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      if (isNativePlatform()) {
        await Preferences.clear()
      } else {
        localStorage.clear()
      }
    } catch (error) {
      console.error('Error clearing preferences:', error)
    }
  },

  /**
   * Set a JSON value
   */
  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value))
  },

  /**
   * Get a JSON value
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
}

// Storage keys
export const PREFERENCE_KEYS = {
  REMEMBER_ME: 'adventure_log_remember_me',
  REMEMBERED_EMAIL: 'adventure_log_remembered_email',
} as const
