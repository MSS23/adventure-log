'use client'

import { ArrowUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface JumpToPresentProps {
  show: boolean
  onJump: () => void
  newItemsCount?: number
  className?: string
}

export function JumpToPresent({
  show,
  onJump,
  newItemsCount,
  className
}: JumpToPresentProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed top-20 left-1/2 -translate-x-1/2 z-40',
            className
          )}
        >
          <Button
            onClick={onJump}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            size="sm"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="hidden sm:inline">
              {newItemsCount && newItemsCount > 0
                ? `${newItemsCount} new ${newItemsCount === 1 ? 'post' : 'posts'}`
                : 'Jump to present'}
            </span>
            <span className="sm:hidden">New</span>
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Floating action button variant for mobile
 */
export function JumpToPresentFAB({
  show,
  onJump,
  newItemsCount,
  className
}: JumpToPresentProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40',
            className
          )}
        >
          <button
            onClick={onJump}
            className="relative flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
            aria-label="Jump to present"
          >
            <ArrowUp className="h-6 w-6" />
            {newItemsCount && newItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {newItemsCount > 99 ? '99+' : newItemsCount}
              </span>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
