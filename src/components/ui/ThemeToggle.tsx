'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/lib/contexts/ThemeContext'

const themeConfig = {
  light: {
    icon: Sun,
    label: 'Light mode',
    nextLabel: 'Switch to dark mode',
  },
  dark: {
    icon: Moon,
    label: 'Dark mode',
    nextLabel: 'Switch to system mode',
  },
  system: {
    icon: Monitor,
    label: 'System mode',
    nextLabel: 'Switch to light mode',
  },
} as const

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const config = themeConfig[theme]
  const Icon = config.icon

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl
        bg-stone-100 dark:bg-white/10
        hover:bg-stone-200 dark:hover:bg-white/20
        text-stone-600 dark:text-stone-300
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-stone-900"
      title={config.nextLabel}
      aria-label={config.nextLabel}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </motion.div>
      </AnimatePresence>
    </button>
  )
}

/**
 * A larger variant with a label, suitable for settings pages or dropdowns.
 */
export function ThemeToggleWithLabel() {
  const { theme, setTheme } = useTheme()

  const options: Array<{ value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }> = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-white/10">
      {options.map(({ value, icon: OptionIcon, label }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${isActive
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }
            `}
            aria-label={`Use ${label.toLowerCase()} theme`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-toggle-active"
                className="absolute inset-0 bg-white dark:bg-white/15 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <OptionIcon className="w-4 h-4" strokeWidth={1.8} />
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
