'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  systemTheme: ResolvedTheme
  currentTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'adventure-log-theme'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  if (mode === 'system') return systemTheme
  return mode
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }
  root.setAttribute('data-theme', resolved)
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }
  return null
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return getStoredTheme() || 'light'
  })
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme())
  const [mounted, setMounted] = useState(false)
  const [supabaseSynced, setSupabaseSynced] = useState(false)

  const currentTheme = resolveTheme(theme, systemTheme)

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyTheme(currentTheme)
  }, [currentTheme])

  // On mount, try to load preference from Supabase (overrides localStorage if found)
  useEffect(() => {
    setMounted(true)

    const loadSupabasePreference = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setSupabaseSynced(true)
          return
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'theme')
          .single()

        if (!error && data?.value) {
          const pref = data.value as string
          if (pref === 'light' || pref === 'dark' || pref === 'system') {
            setThemeState(pref)
            try {
              localStorage.setItem(STORAGE_KEY, pref)
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // Supabase not available or table doesn't exist - use localStorage value
        log.info('Theme: Supabase preference not available, using localStorage', {
          component: 'ThemeProvider',
          action: 'load-preference',
        })
      } finally {
        setSupabaseSynced(true)
      }
    }

    loadSupabasePreference()
  }, [])

  // Sync preference to Supabase when theme changes (after initial load)
  const syncToSupabase = useCallback(async (newTheme: ThemeMode) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            key: 'theme',
            value: newTheme,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,key' }
        )
    } catch {
      // Supabase sync failed - preference is still saved in localStorage
      log.info('Theme: Failed to sync to Supabase', {
        component: 'ThemeProvider',
        action: 'sync-preference',
      })
    }
  }, [])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // ignore
    }
    if (supabaseSynced) {
      syncToSupabase(newTheme)
    }
  }, [supabaseSynced, syncToSupabase])

  const toggleTheme = useCallback(() => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = order.indexOf(theme)
    const nextTheme = order[(currentIndex + 1) % order.length]
    setTheme(nextTheme)
  }, [theme, setTheme])

  const value: ThemeContextType = {
    theme,
    systemTheme,
    currentTheme,
    setTheme,
    toggleTheme,
  }

  // Prevent flash of wrong theme during hydration
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
