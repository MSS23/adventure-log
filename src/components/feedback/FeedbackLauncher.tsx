'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackDialog } from './FeedbackDialog'
import { cn } from '@/lib/utils'

interface FeedbackLauncherProps {
  /** Visual style of the trigger. `inline` is a normal button; `fab` is a floating pill. */
  variant?: 'inline' | 'fab'
  className?: string
  label?: string
}

/**
 * Self-contained "Send feedback" trigger + dialog. Drop it anywhere (server
 * pages included, since it's a client island) without wiring up open state.
 */
export function FeedbackLauncher({ variant = 'inline', className, label = 'Send feedback' }: FeedbackLauncherProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {variant === 'fab' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={cn(
            'fixed bottom-24 right-4 lg:bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 min-h-[44px] text-sm font-medium text-foreground transition-all duration-200 cursor-pointer hover:border-primary/30 hover:bg-muted/60 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          {label}
        </button>
      )}
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
