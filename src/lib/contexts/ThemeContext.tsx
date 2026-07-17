'use client'

import { createContext, useContext, useEffect } from 'react'

// Adventure Log is light-only. The theme surface below is kept so existing
// consumers (useTheme) keep compiling, but every value is pinned to 'light'
// and the setters are no-ops. This removes the old behavior where a saved
// 'dark'/'system' preference in Supabase flipped the app to dark right after
// sign-in. If dark mode is ever reintroduced, restore the preference-loading
// logic from git history (pre "force light" commit).
type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  systemTheme: ResolvedTheme
  currentTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'adventure-log-theme'

const LIGHT_ONLY: ThemeContextType = {
  theme: 'light',
  systemTheme: 'light',
  currentTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
}

const ThemeContext = createContext<ThemeContextType>(LIGHT_ONLY)

function forceLightDom() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('dark')
  root.classList.add('light')
  root.setAttribute('data-theme', 'light')
}

export function useTheme() {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Enforce light on the client and normalize any stale stored preference so a
  // previously-saved 'dark'/'system' value can't be read back anywhere.
  useEffect(() => {
    forceLightDom()
    try {
      localStorage.setItem(STORAGE_KEY, 'light')
    } catch {
      // localStorage may be unavailable — the DOM is already forced light.
    }
  }, [])

  return <ThemeContext.Provider value={LIGHT_ONLY}>{children}</ThemeContext.Provider>
}
