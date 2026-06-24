'use client'

import * as React from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

/**
 * Password field with a built-in show/hide toggle. Drop-in replacement for
 * `<Input type="password" />` — same props, plus an eye button that switches
 * the input between masked and plain text.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        // Keep the toggle out of the tab order so Tab goes straight to the
        // next field; it's still reachable by click/touch.
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-xl"
      >
        {show ? (
          <EyeOff className="h-4 w-4" strokeWidth={1.8} />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={1.8} />
        )}
      </button>
    </div>
  )
}
