'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// Theme is now locked to 'light' mode only
type Theme = 'light'

interface ThemeContextType {
  theme: Theme
  systemTheme: 'light'
  currentTheme: 'light'
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
}

// ThemeProvider now only provides light theme - no dark mode support
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  // Force light theme on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement

      // Remove any dark theme class
      root.classList.remove('dark')

      // Force light theme
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
    }

    setMounted(true)
  }, [])

  const value: ThemeContextType = {
    theme: 'light',
    systemTheme: 'light',
    currentTheme: 'light',
    setTheme: () => {}, // No-op - theme is locked
    toggleTheme: () => {}, // No-op - theme is locked
  }

  // Prevent flash during mount
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