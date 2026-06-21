'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { FilterTab } from './constants'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High Priority' },
  { key: 'completed', label: 'Completed' },
]

interface FilterTabsProps {
  active: FilterTab
  counts: Record<FilterTab, number>
  onChange: (tab: FilterTab) => void
}

export function FilterTabs({ active, counts, onChange }: FilterTabsProps) {
  return (
    <motion.div
      data-tour-step="filter-tabs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex gap-2 flex-wrap"
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={active === key}
          onClick={() => onChange(key)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            active === key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {label}
          <span
            className={cn(
              'ml-2 px-1.5 py-0.5 text-xs rounded-full inline-block',
              active === key
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {counts[key]}
          </span>
        </button>
      ))}
    </motion.div>
  )
}
