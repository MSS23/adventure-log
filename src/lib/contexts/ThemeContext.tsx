'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateSystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    updateSystemTheme(mediaQuery)
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => mediaQuery.removeEventListener('change', updateSystemTheme)
  }, [])

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('adventure-log-theme') as Theme
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
    setMounted(true)
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const currentTheme = theme === 'system' ? systemTheme : theme
    const root = document.documentElement

    // Remove existing theme classes
    root.classList.remove('light', 'dark')

    // Add current theme class
    root.classList.add(currentTheme)

    // Update data-theme attribute for additional styling if needed
    root.setAttribute('data-theme', currentTheme)

    // Save to localStorage
    localStorage.setItem('adventure-log-theme', theme)
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