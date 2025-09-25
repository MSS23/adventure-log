'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from '@/lib/utils/platform'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  systemTheme: 'light' | 'dark'
  currentTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Detect system theme preference (cross-platform)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? 'dark' : 'light')
    }

    if (Platform.isWeb()) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        updateSystemTheme(e.matches)
      }

      updateSystemTheme(mediaQuery.matches)
      mediaQuery.addEventListener('change', handleChange)

      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // For native apps, default to light theme initially
      // Native theme detection can be added later if needed
      updateSystemTheme(false)
    }
  }, [])

  // Load theme from storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    let savedTheme: string | null = null

    if (Platform.isWeb()) {
      savedTheme = localStorage.getItem('adventure-log-theme')
    } else {
      // For native apps, use Capacitor Preferences
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.get({ key: 'adventure-log-theme' }).then(({ value }) => {
          if (value && ['light', 'dark', 'system'].includes(value)) {
            setTheme(value as Theme)
          }
        }).catch(() => {
          // Fallback to default theme
        })
      }).catch(() => {
        // Preferences not available, use default
      })
    }

    if (Platform.isWeb() && savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme as Theme)
    }

    setMounted(true)
  }, [])

  // Apply theme to document and save preference
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    const currentTheme = theme === 'system' ? systemTheme : theme

    // Apply theme to document (web and native webview)
    if (typeof document !== 'undefined') {
      const root = document.documentElement

      // Remove existing theme classes
      root.classList.remove('light', 'dark')

      // Add current theme class
      root.classList.add(currentTheme)

      // Update data-theme attribute for additional styling if needed
      root.setAttribute('data-theme', currentTheme)
    }

    // Save theme preference (platform-specific)
    if (Platform.isWeb()) {
      localStorage.setItem('adventure-log-theme', theme)
    } else {
      // For native apps, use Capacitor Preferences
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.set({
          key: 'adventure-log-theme',
          value: theme
        }).catch(() => {
          // Storage not available, continue silently
        })
      }).catch(() => {
        // Preferences not available
      })
    }
  }, [theme, systemTheme, mounted])

  const currentTheme = theme === 'system' ? systemTheme : theme

  const toggleTheme = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light')
  }

  const value: ThemeContextType = {
    theme,
    systemTheme,
    currentTheme,
    setTheme,
    toggleTheme,
  }

  // Prevent flash of wrong theme on SSR
  if (!mounted) {
    return (
      <ThemeContext.Provider value={value}>
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}