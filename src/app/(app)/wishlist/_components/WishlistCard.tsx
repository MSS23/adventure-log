'use client'

import { motion } from 'framer-motion'
import { Calendar, Check, Pencil, Trash2, ArrowUpRight, ListChecks, ExternalLink, Luggage } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countryCodeToFlag } from '@/lib/countries'
import { safeHttpUrl } from '@/lib/utils/input-validation'
import type { WishlistItem } from '@/lib/hooks/useWishlist'
import { priorityOf } from './constants'
import { categoryConfig, platformLabel } from './savedPlacesConfig'

interface WishlistCardProps {
  item: WishlistItem
  index: number
  onMarkCompleted: (id: string) => void
  onEdit: (item: WishlistItem) => void
  onRemove: (id: string) => void
  onAddToTrip?: (item: WishlistItem) => void
}

export function WishlistCard({ item, index, onMarkCompleted, onEdit, onRemove, onAddToTrip }: WishlistCardProps) {
  const priority = priorityOf(item.priority)
  const completed = Boolean(item.completed_at)
  const checklist = item.checklist ?? []
  const checklistDone = checklist.filter((c) => c.done).length
  // Link-import extras (ex-saved_places) — render only when present.
  const category = item.category ? categoryConfig[item.category] : null
  const sourceHref = safeHttpUrl(item.source_url ?? undefined)

  return (
    <motion.div
      layout
      className="h-full"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.06,
      }}
    >
      <div
        className={cn(
          'group relative h-full overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-resting)] transition-all duration-200 ease-out',
          completed
            ? 'opacity-60'
            : 'hover:border-primary/30 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5'
        )}
      >
        {item.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element -- external TikTok CDN host, avoid next/image domain config
          <img
            src={item.thumbnail_url}
            alt=""
            referrerPolicy="no-referrer"
            className="h-36 w-full object-cover"
          />
        )}
        <div className="p-5 sm:p-5">
          {/* Top row: location + priority */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {item.country_code && (
                  <span className="text-lg leading-none">
                    {countryCodeToFlag(item.country_code)}
                  </span>
                )}
                <h3
                  className={cn(
                    'font-heading text-[17px] font-semibold leading-tight text-foreground truncate',
                    completed && 'line-through text-muted-foreground'
                  )}
                >
                  {item.location_name}
                </h3>
              </div>
              {item.notes && (
                <p
                  className={cn(
                    'text-sm text-muted-foreground line-clamp-2 mt-1',
                    completed && 'line-through'
                  )}
                >
                  {item.notes}
                </p>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                priority.color
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
              {priority.label}
            </span>
          </div>

          {/* Badges: category, link source, partner attribution */}
          {(category || sourceHref || (item.source === 'shared' && item.shared_by?.username)) && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {category && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', category.badge)}>
                  <category.icon className="h-3 w-3" />
                  {category.label}
                </span>
              )}
              {sourceHref && item.source_platform && (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {platformLabel[item.source_platform]}
                </a>
              )}
              {item.source === 'shared' && item.shared_by?.username && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <ArrowUpRight className="h-3 w-3" />
                  Suggested by @{item.shared_by.username}
                </span>
              )}
            </div>
          )}

          {/* Checklist progress */}
          {checklist.length > 0 && (
            <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
              <span>
                {checklistDone}/{checklist.length} to do
              </span>
            </div>
          )}

          {/* Bottom: date + actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono tracking-wide">
              <Calendar className="h-3 w-3" />
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <div className="flex items-center gap-1">
              {onAddToTrip && !completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddToTrip(item)}
                  className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                  title="Add to a trip"
                  aria-label={`Add ${item.location_name} to a trip`}
                >
                  <Luggage className="h-4 w-4" />
                </Button>
              )}
              {!completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkCompleted(item.id)}
                  className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl text-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
                  title="Mark as visited (creates an album)"
                  aria-label={`Mark ${item.location_name} as visited`}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                title="Edit"
                aria-label={`Edit ${item.location_name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Remove"
                aria-label={`Remove ${item.location_name} from wishlist`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
