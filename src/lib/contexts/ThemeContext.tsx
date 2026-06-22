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
  // Identity is read directly from the Supabase session, NOT via useAuth().
  // ThemeProvider mounts ABOVE AuthProvider in the layout tree (theme must
  // apply to public/marketing pages too), so calling useAuth() here would
  // throw "must be used within an AuthProvider".
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setUserId(session?.user?.id ?? null)
        setAuthLoading(false)
      })
      .catch(() => {
        if (active) setAuthLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

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

  // Mark mounted as soon as we render on the client so children can hydrate
  // without waiting on auth. The Supabase preference load is gated on auth
  // separately below.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load preference from Supabase once auth has resolved the session. If the
  // user is signed out, we skip the network call entirely and rely on the
  // localStorage value already in `theme`.
  useEffect(() => {
    if (authLoading) return

    if (!userId) {
      setSupabaseSynced(true)
      return
    }

    let cancelled = false
    const loadSupabasePreference = async () => {
      try {
        const supabase = createClient()
        const { data, error: prefError } = await supabase
          .from('user_preferences')
          .select('value')
          .eq('user_id', userId)
          .eq('key', 'theme')
          .maybeSingle()

        if (cancelled) return

        // Table may not exist yet - silently ignore
        if (prefError) {
          setSupabaseSynced(true)
          return
        }

        if (data?.value) {
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
        if (!cancelled) setSupabaseSynced(true)
      }
    }

    loadSupabasePreference()
    return () => {
      cancelled = true
    }
  }, [authLoading, userId])

  // Sync preference to Supabase when theme changes (after initial load).
  // Captures the userId reactively so we always write against the
  // current session.
  const syncToSupabase = useCallback(async (newTheme: ThemeMode) => {
    if (!userId) return
    try {
      const supabase = createClient()
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: userId,
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
  }, [userId])

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
    const order: ThemeMode[] = ['light', 'dark']
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
