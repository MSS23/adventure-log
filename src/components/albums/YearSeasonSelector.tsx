'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/animations/spring-configs'
import { ChevronDown } from 'lucide-react'

export type Season = 'spring' | 'summer' | 'fall' | 'winter'

interface YearSeasonSelectorProps {
  year: number | null
  season: Season | null
  onYearChange: (year: number | null) => void
  onSeasonChange: (season: Season | null) => void
  error?: string
  minYear?: number
  maxYear?: number
  className?: string
}

const seasons: { id: Season; name: string; icon: string; months: string; gradient: string }[] = [
  { id: 'spring', name: 'Spring', icon: '🌸', months: 'Mar - May', gradient: 'from-green-50 to-emerald-100' },
  { id: 'summer', name: 'Summer', icon: '☀️', months: 'Jun - Aug', gradient: 'from-amber-50 to-yellow-100' },
  { id: 'fall', name: 'Fall', icon: '🍂', months: 'Sep - Nov', gradient: 'from-orange-50 to-amber-100' },
  { id: 'winter', name: 'Winter', icon: '❄️', months: 'Dec - Feb', gradient: 'from-blue-50 to-cyan-100' },
]

/**
 * Converts year and season to a date range for database storage
 */
export function convertYearSeasonToDateRange(
  year: number,
  season: Season
): { start: string; end: string } {
  const seasonRanges: Record<Season, { startMonth: number; endMonth: number }> = {
    spring: { startMonth: 3, endMonth: 5 },
    summer: { startMonth: 6, endMonth: 8 },
    fall: { startMonth: 9, endMonth: 11 },
    winter: { startMonth: 12, endMonth: 2 },
  }

  const range = seasonRanges[season]

  // Handle winter spanning two years
  if (season === 'winter') {
    const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
    const febLastDay = isLeapYear(year + 1) ? 29 : 28
    return {
      start: `${year}-12-01`,
      end: `${year + 1}-02-${febLastDay}`,
    }
  }

  const lastDay = new Date(year, range.endMonth, 0).getDate()
  return {
    start: `${year}-${String(range.startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(range.endMonth).padStart(2, '0')}-${lastDay}`,
  }
}

export function YearSeasonSelector({
  year,
  season,
  onYearChange,
  onSeasonChange,
  error,
  minYear = 2000,
  maxYear = new Date().getFullYear(),
  className,
}: YearSeasonSelectorProps) {
  const [isYearOpen, setIsYearOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Generate years array (descending)
  const years = React.useMemo(() => {
    const arr: number[] = []
    for (let y = maxYear; y >= minYear; y--) {
      arr.push(y)
    }
    return arr
  }, [minYear, maxYear])

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsYearOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Year Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Year</label>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsYearOpen(!isYearOpen)}
            className={cn(
              'w-full h-12 px-4 text-left bg-white border rounded-lg transition-all duration-200',
              'flex items-center justify-between',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
              error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400',
              isYearOpen && 'border-teal-500 ring-2 ring-teal-500/20'
            )}
          >
            <span className={year ? 'text-gray-900' : 'text-gray-500'}>
              {year || 'Select year'}
            </span>
            <motion.div
              animate={{ rotate: isYearOpen ? 180 : 0 }}
              transition={transitions.snap}
            >
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {isYearOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={transitions.snap}
                className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                <div className="py-1">
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        onYearChange(y)
                        setIsYearOpen(false)
                      }}
                      className={cn(
                        'w-full px-4 py-2.5 text-left transition-colors',
                        'hover:bg-teal-50',
                        year === y ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Season Cards */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Season</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {seasons.map((s) => {
            const isSelected = season === s.id
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => onSeasonChange(isSelected ? null : s.id)}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-colors overflow-hidden',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                  'min-h-[80px] flex flex-col items-center justify-center gap-1',
                  isSelected
                    ? 'border-teal-500 bg-gradient-to-br ' + s.gradient
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={transitions.snap}
              >
                {/* Selection background animation */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={transitions.natural}
                    />
                  )}
                </AnimatePresence>

                <span className="text-2xl relative z-10">{s.icon}</span>
                <span
                  className={cn(
                    'text-sm font-medium relative z-10',
                    isSelected ? 'text-teal-700' : 'text-gray-700'
                  )}
                >
                  {s.name}
                </span>
                <span
                  className={cn(
                    'text-xs relative z-10',
                    isSelected ? 'text-teal-600' : 'text-gray-400'
                  )}
                >
                  {s.months}
                </span>

                {/* Check indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={transitions.snap}
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-sm text-red-500"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
