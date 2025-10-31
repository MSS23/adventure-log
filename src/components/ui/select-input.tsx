'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode
}

export const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ className, icon, children, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white cursor-pointer appearance-none transition-all',
            icon ? 'pl-10' : 'pl-4',
            'pr-10',
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
          }}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)

SelectInput.displayName = 'SelectInput'
