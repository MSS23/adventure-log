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
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4M5.2 8.1c4.5 2 9.1 2 13.6 0M5.2 15.9c4.5-2 9.1-2 13.6 0" />
          <path d="M12 3.5c-3 2.7-3 14.3 0 17M12 3.5c3 2.7 3 14.3 0 17" />
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
