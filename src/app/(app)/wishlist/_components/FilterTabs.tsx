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
      className="grid grid-cols-3 rounded-2xl border border-border bg-muted/55 p-1"
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={active === key}
          onClick={() => onChange(key)}
          className={cn(
            'min-h-11 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm',
            active === key
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
          )}
        >
          {label}
          <span
            className={cn(
              'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full inline-block sm:ml-2 sm:text-xs',
              active === key
                ? 'bg-primary/10 text-primary'
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
