'use client'

import { useTheme } from '@/lib/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sun, Moon, Monitor, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'compact'
  className?: string
  showLabel?: boolean
}

/**
 * Theme toggle component with smooth animations and multiple variants
 */
export function ThemeToggle({
  variant = 'icon',
  className = '',
  showLabel = false
}: ThemeToggleProps) {
  const { theme, currentTheme, setTheme, toggleTheme } = useTheme()

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Light mode'
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
      description: 'Dark mode'
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference'
    }
  ]

  const currentOption = themeOptions.find(option => option.value === theme)
  const CurrentIcon = currentOption?.icon || Sun

  // Simple toggle variant (just switches between light/dark)
  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn(
          'relative h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700',
          'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
          className
        )}
        title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTheme}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {currentTheme === 'light' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-blue-400" />
            )}
          </motion.div>
        </AnimatePresence>
      </Button>
    )
  }

  // Icon-only variant with dropdown
  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'relative h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700',
              'hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200',
              'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
              className
            )}
            title="Toggle theme"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
              >
                <CurrentIcon className={cn(
                  'h-4 w-4',
                  theme === 'light' && 'text-amber-500',
                  theme === 'dark' && 'text-blue-400',
                  theme === 'system' && 'text-gray-500 dark:text-gray-400'
                )} />
              </motion.div>
            </AnimatePresence>

            {/* Subtle glow effect */}
            <motion.div
              className="absolute inset-0 rounded-md"
              animate={{
                boxShadow: currentTheme === 'dark'
                  ? '0 0 10px rgba(59, 130, 246, 0.3)'
                  : '0 0 10px rgba(245, 158, 11, 0.3)'
              }}
              transition={{ duration: 0.3 }}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-48 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-xl"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isSelected = theme === option.value

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  isSelected && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                )}
              >
                <motion.div
                  animate={{
                    scale: isSelected ? 1.1 : 1,
                    rotate: isSelected ? 360 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className={cn(
                    'h-4 w-4',
                    option.value === 'light' && 'text-amber-500',
                    option.value === 'dark' && 'text-blue-400',
                    option.value === 'system' && 'text-gray-500 dark:text-gray-400',
                    isSelected && 'drop-shadow-sm'
                  )} />
                </motion.div>

                <div className="flex-1">
                  <div className={cn(
                    'font-medium text-sm',
                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-blue-500"
                  />
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full button variant with label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-2 transition-all duration-200 hover:shadow-md',
            className
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentIcon className="h-4 w-4" />
            </motion.div>
          </AnimatePresence>

          {showLabel && (
            <span className="text-sm font-medium">
              {currentOption?.label}
            </span>
          )}

          <Palette className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = theme === option.value

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex items-center gap-3',
                isSelected && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ThemeToggle