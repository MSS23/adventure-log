'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Camera,
  Map,
  Users,
  Compass,
  Search,
  Heart,
  MapPin,
  Plane,
  Globe,
  Bookmark,
  Plus,
  MessageCircle,
  Bell,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { transitions } from '@/lib/animations/spring-configs'

// Floating particle animation
function FloatingParticles({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-teal-400/30"
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, `${Math.random() * 40 - 20}%`],
            x: [null, `${Math.random() * 20 - 10}%`],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )
}

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
  showParticles = true,
}: EnhancedEmptyStateProps) {
  const iconElement = icon || <Compass className="h-12 w-12" />

  if (variant === 'minimal') {
    return (
      <motion.div
        className={cn('flex flex-col items-center py-8 text-center', className)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.natural}
      >
        <div className="text-gray-300 mb-3">{iconElement}</div>
        <p className="text-gray-500 text-sm">{title}</p>
        {action && (
          <Button
            variant="link"
            className="mt-2 text-teal-600"
            onClick={action.onClick}
          >
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
          'bg-white rounded-2xl border border-gray-100 shadow-sm p-8',
          className
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transitions.natural}
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-full flex items-center justify-center text-teal-500 mb-4"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {iconElement}
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {description && (
            <p className="text-gray-500 text-sm max-w-xs mb-4">{description}</p>
          )}
          {action && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={action.onClick} className="bg-teal-600 hover:bg-teal-700">
                {action.label}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(
        'relative flex flex-col items-center justify-center py-16 px-6',
        variant === 'centered' && 'min-h-[400px]',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {showParticles && <FloatingParticles />}

      {/* Main icon with animation */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, ...transitions.natural }}
      >
        <div className="w-24 h-24 bg-gradient-to-br from-teal-100 via-cyan-50 to-teal-100 rounded-full flex items-center justify-center">
          <motion.div
            className="text-teal-500"
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {iconElement}
          </motion.div>
        </div>

        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-full border border-teal-200/50 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute -inset-2 rounded-full border border-teal-100/30" />
      </motion.div>

      {/* Text content */}
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-500 mb-6">{description}</p>
        )}
      </motion.div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {action && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={action.onClick}
                className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            </motion.div>
          )}
          {secondaryAction && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            </motion.div>
          )}
        </motion.div>
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
      icon={<Camera className="h-12 w-12" />}
      title="No Adventures Yet"
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
      icon={<ImageIcon className="h-12 w-12" />}
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
      icon={<Search className="h-12 w-12" />}
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
      icon={<Users className="h-12 w-12" />}
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
      icon={<Compass className="h-12 w-12" />}
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
      icon={<Bell className="h-12 w-12" />}
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
      icon={<MessageCircle className="h-10 w-10" />}
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
      icon={<Bookmark className="h-12 w-12" />}
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
      icon={<MapPin className="h-12 w-12" />}
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
      icon={<Globe className="h-16 w-16" />}
      title="Your World Awaits"
      description="Create albums with locations to see them on your personal globe."
      variant="centered"
    />
  )
}
