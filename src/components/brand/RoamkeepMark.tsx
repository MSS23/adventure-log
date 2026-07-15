import { cn } from '@/lib/utils'

interface RoamkeepMarkProps {
  className?: string
  markClassName?: string
  showWordmark?: boolean
  showTagline?: boolean
  inverted?: boolean
}

export function RoamkeepMark({
  className,
  markClassName,
  showWordmark = true,
  showTagline = false,
  inverted = false,
}: RoamkeepMarkProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-sm',
          markClassName,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[18px] w-[18px]"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
          <path d="M9.2 10.3c1.5-1.9 4.1-1.9 5.6 0" />
          <path d="M10.3 12.5c1-.9 2.4-.9 3.4 0" />
          <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>

      {showWordmark && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              'block truncate font-heading text-[18px] font-semibold tracking-[-0.025em]',
              inverted ? 'text-white' : 'text-foreground',
            )}
          >
            Roamkeep
          </span>
          {showTagline && (
            <span
              className={cn(
                'mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.11em]',
                inverted ? 'text-white/55' : 'text-muted-foreground',
              )}
            >
              Keep the places that made you
            </span>
          )}
        </span>
      )}
    </span>
  )
}
