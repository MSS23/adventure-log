'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Camera,
  Users,
  Compass,
  Search,
  MapPin,
  Globe,
  Bookmark,
  Plus,
  MessageCircle,
  Bell,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { transitions } from '@/lib/animations/spring-configs'

interface EnhancedEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  variant?: 'default' | 'minimal' | 'card' | 'centered'
  className?: string
  /** Kept for API compatibility — decorative particles were retired in the calm redesign. */
  showParticles?: boolean
}

export function EnhancedEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EnhancedEmptyStateProps) {
  const iconElement = icon || <Compass className="h-6 w-6" />

  if (variant === 'minimal') {
    return (
      <motion.div
        className={cn('flex flex-col items-center py-8 text-center', className)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.natural}
      >
        <div className="mb-3 text-muted-foreground/60">{iconElement}</div>
        <p className="text-sm text-muted-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {action && (
          <Button variant="link" className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </motion.div>
    )
  }

  if (variant === 'card') {
    return (
      <motion.div
        className={cn(
          'rounded-2xl border border-border bg-card p-8',
          className
        )}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transitions.natural}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            {iconElement}
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
          )}
          {action && (
            <Button onClick={action.onClick} className="mt-5">
              {action.label}
            </Button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center',
        variant === 'centered' && 'min-h-[400px]',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {iconElement}
      </div>

      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button onClick={action.onClick}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ==========================================
// PRE-BUILT EMPTY STATE VARIANTS
// ==========================================

export function NoAlbumsEmptyState({
  onCreateAlbum,
}: {
  onCreateAlbum?: () => void
}) {
  return (
    <EnhancedEmptyState
      icon={<Camera className="h-6 w-6" />}
      title="No albums yet"
      description="Start documenting your travels by creating your first album."
      action={{ label: 'Create Album', onClick: onCreateAlbum }}
    />
  )
}

export function NoPhotosEmptyState({
  onUploadPhotos,
}: {
  onUploadPhotos?: () => void
}) {
  return (
    <EnhancedEmptyState
      icon={<ImageIcon className="h-6 w-6" />}
      title="No Photos Yet"
      description="Upload some photos to bring your adventure to life."
      action={{ label: 'Upload Photos', onClick: onUploadPhotos }}
      variant="card"
    />
  )
}

export function NoSearchResultsEmptyState({
  query,
  onClear,
}: {
  query?: string
  onClear?: () => void
}) {
  return (
    <EnhancedEmptyState
      icon={<Search className="h-6 w-6" />}
      title="No Results Found"
      description={query ? `We couldn't find anything matching "${query}"` : 'Try adjusting your search or filters'}
      action={{ label: 'Clear Search', onClick: onClear }}
      showParticles={false}
    />
  )
}

export function NoFollowersEmptyState() {
  return (
    <EnhancedEmptyState
      icon={<Users className="h-6 w-6" />}
      title="No Followers Yet"
      description="Share your adventures to attract followers!"
      variant="minimal"
    />
  )
}

export function NoFeedEmptyState({
  onExplore,
}: {
  onExplore?: () => void
}) {
  return (
    <EnhancedEmptyState
      icon={<Compass className="h-6 w-6" />}
      title="Your Feed is Empty"
      description="Follow other travelers to see their adventures here."
      action={{ label: 'Explore', onClick: onExplore }}
      secondaryAction={{ label: 'Find Friends', onClick: () => {} }}
    />
  )
}

export function NoNotificationsEmptyState() {
  return (
    <EnhancedEmptyState
      icon={<Bell className="h-6 w-6" />}
      title="All Caught Up!"
      description="You have no new notifications."
      variant="minimal"
      showParticles={false}
    />
  )
}

export function NoCommentsEmptyState() {
  return (
    <EnhancedEmptyState
      icon={<MessageCircle className="h-6 w-6" />}
      title="No Comments Yet"
      description="Be the first to leave a comment!"
      variant="minimal"
      showParticles={false}
    />
  )
}

export function NoSavedEmptyState({
  onExplore,
}: {
  onExplore?: () => void
}) {
  return (
    <EnhancedEmptyState
      icon={<Bookmark className="h-6 w-6" />}
      title="Nothing Saved"
      description="Save albums you want to revisit later."
      action={{ label: 'Explore Albums', onClick: onExplore }}
    />
  )
}

export function NoLocationEmptyState({
  onEnableLocation,
}: {
  onEnableLocation?: () => void
}) {
  return (
    <EnhancedEmptyState
      icon={<MapPin className="h-6 w-6" />}
      title="Location Not Available"
      description="Enable location to see nearby adventures."
      action={{ label: 'Enable Location', onClick: onEnableLocation }}
      variant="card"
    />
  )
}

export function GlobeEmptyState() {
  return (
    <EnhancedEmptyState
      icon={<Globe className="h-7 w-7" />}
      title="Your World Awaits"
      description="Create albums with locations to see them on your personal globe."
      variant="centered"
    />
  )
}
