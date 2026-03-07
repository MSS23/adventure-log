'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, Users, Flame, Clock, MapPin, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

export type FeedFilter = 'all' | 'following' | 'popular' | 'recent' | 'nearby'
export type FeedSort = 'recent' | 'popular' | 'comments'

interface FilterOption {
  id: FeedFilter
  label: string
  icon: typeof Globe
  description: string
}

interface SortOption {
  id: FeedSort
  label: string
}

const filterOptions: FilterOption[] = [
  { id: 'all', label: 'All', icon: Globe, description: 'All adventures' },
  { id: 'following', label: 'Following', icon: Users, description: 'From people you follow' },
  { id: 'popular', label: 'Popular', icon: Flame, description: 'Most liked adventures' },
  { id: 'recent', label: 'Recent', icon: Clock, description: 'Latest uploads' },
  { id: 'nearby', label: 'Nearby', icon: MapPin, description: 'Adventures near you' },
]

const sortOptions: SortOption[] = [
  { id: 'recent', label: 'Most Recent' },
  { id: 'popular', label: 'Most Liked' },
  { id: 'comments', label: 'Most Discussed' },
]

interface FeedFiltersProps {
  activeFilter: FeedFilter
  activeSort: FeedSort
  onFilterChange: (filter: FeedFilter) => void
  onSortChange: (sort: FeedSort) => void
  className?: string
  showSort?: boolean
}

export function FeedFilters({
  activeFilter,
  activeSort,
  onFilterChange,
  onSortChange,
  className,
  showSort = false,
}: FeedFiltersProps) {
  const { triggerSelection } = useHaptics()
  const prefersReducedMotion = useReducedMotion()
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Persist filter preference
  useEffect(() => {
    try {
      localStorage.setItem('feed-filter', activeFilter)
    } catch {
      // Ignore localStorage errors
    }
  }, [activeFilter])

  const handleFilterClick = (filter: FeedFilter) => {
    if (filter !== activeFilter) {
      triggerSelection()
      onFilterChange(filter)
    }
  }

  const handleSortClick = (sort: FeedSort) => {
    if (sort !== activeSort) {
      triggerSelection()
      onSortChange(sort)
    }
    setShowSortMenu(false)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.id
          const Icon = option.icon

          return (
            <motion.button
              key={option.id}
              onClick={() => handleFilterClick(option.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                'border shadow-sm',
                isActive
                  ? 'bg-teal-500 text-white border-teal-500 shadow-teal-500/25'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
              )}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-pressed={isActive}
              title={option.description}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-gray-500')} />
              <span>{option.label}</span>
            </motion.button>
          )
        })}

        {/* Sort button */}
        {showSort && (
          <div className="relative ml-auto">
            <motion.button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium',
                'border border-gray-200 bg-white hover:bg-gray-50 text-gray-600',
                showSortMenu && 'bg-gray-100'
              )}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Sort</span>
            </motion.button>

            {/* Sort dropdown */}
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <motion.div
                  className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[160px]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSortClick(option.id)}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm transition-colors',
                        activeSort === option.id
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active filter indicator with description */}
      {activeFilter !== 'all' && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-3 py-2 bg-teal-50 rounded-lg border border-teal-100"
        >
          <span className="text-sm text-teal-700">
            {filterOptions.find((f) => f.id === activeFilter)?.description}
          </span>
          <button
            onClick={() => onFilterChange('all')}
            className="p-1 hover:bg-teal-100 rounded-full transition-colors"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4 text-teal-600" />
          </button>
        </motion.div>
      )}
    </div>
  )
}

// Compact version for mobile
export function FeedFiltersMobile({
  activeFilter,
  onFilterChange,
  className,
}: {
  activeFilter: FeedFilter
  onFilterChange: (filter: FeedFilter) => void
  className?: string
}) {
  const { triggerSelection } = useHaptics()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {filterOptions.slice(0, 4).map((option) => {
        const isActive = activeFilter === option.id
        const Icon = option.icon

        return (
          <motion.button
            key={option.id}
            onClick={() => {
              triggerSelection()
              onFilterChange(option.id)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap',
              isActive
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

// Hook for managing filter state with localStorage persistence
export function useFeedFilters() {
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [sort, setSort] = useState<FeedSort>('recent')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedFilter = localStorage.getItem('feed-filter') as FeedFilter
      const savedSort = localStorage.getItem('feed-sort') as FeedSort

      if (savedFilter && filterOptions.some((f) => f.id === savedFilter)) {
        setFilter(savedFilter)
      }
      if (savedSort && sortOptions.some((s) => s.id === savedSort)) {
        setSort(savedSort)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Persist sort preference
  useEffect(() => {
    try {
      localStorage.setItem('feed-sort', sort)
    } catch {
      // Ignore localStorage errors
    }
  }, [sort])

  return {
    filter,
    sort,
    setFilter,
    setSort,
  }
}
