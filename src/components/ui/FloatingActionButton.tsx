'use client'

import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { Plus, Camera, Images, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface FloatingActionButtonProps {
  className?: string
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

// Two clear choices only. The old menu had four — two of which pointed at the
// same composer, and "Add to album" dead-ended on the album list. "New post"
// is the everyday Instagram-style single-album composer; "Import many" is the
// bulk multi-trip importer.
const actions = [
  { id: 'new-post', label: 'Create a memory', icon: Camera, href: '/albums/new' },
  { id: 'import-photos', label: 'Import camera roll', icon: Images, href: '/albums/import' },
]

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <MotionConfig reducedMotion="user">
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[color:var(--color-ink)]/30 backdrop-blur-[2px] z-[40]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Action menu */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: EDITORIAL_EASE }}
            className="fixed right-4 md:right-6 z-[51] space-y-2.5 fab-menu-position"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 16, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.96 }}
                transition={{
                  delay: index * 0.04,
                  duration: 0.28,
                  ease: EDITORIAL_EASE,
                }}
              >
                <Link href={action.href} onClick={() => setIsExpanded(false)}>
                  <motion.div
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 bg-[color:var(--card)] rounded-full shadow-[0_8px_24px_rgba(26,20,14,0.12)] border border-[color:var(--color-line-warm)] pr-5 py-2 hover:shadow-[0_12px_32px_rgba(26,20,14,0.16)]"
                  >
                    <div className="w-11 h-11 rounded-full bg-[color:var(--color-coral-tint)] flex items-center justify-center text-[color:var(--color-coral)]">
                      <action.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </div>
                    <span className="text-[13px] font-semibold text-[color:var(--color-ink)] pr-1 whitespace-nowrap">
                      {action.label}
                    </span>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB — coral circle */}
      <motion.button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        aria-label={isExpanded ? 'Close capture menu' : 'Add a travel memory'}
        aria-expanded={isExpanded}
        className={cn(
          'fixed right-4 md:right-6 z-[52] fab-position',
          'h-14 w-14 rounded-full flex items-center justify-center',
          'bg-[color:var(--color-coral)] text-white',
          'shadow-[0_10px_28px_rgba(226,85,58,0.45)] hover:shadow-[0_14px_36px_rgba(226,85,58,0.55)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)]',
          className,
        )}
      >
        <motion.span
          key={isExpanded ? 'x' : 'plus'}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
          className="flex"
        >
          {isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.span>
      </motion.button>
    </MotionConfig>
  )
}
