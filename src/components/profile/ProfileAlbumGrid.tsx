'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Album } from '@/types/database'
import { ProfileAlbumCard } from './ProfileAlbumCard'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoAlbumsEmptyState } from '@/components/ui/enhanced-empty-state'

interface ProfileAlbumGridProps {
  albums: Album[]
  isOwnProfile?: boolean
  className?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24
    }
  }
}

export function ProfileAlbumGrid({ albums, isOwnProfile = false, className }: ProfileAlbumGridProps) {
  const router = useRouter()

  if (albums.length === 0) {
    return (
      <div className={cn('rounded-2xl overflow-hidden', className)}>
        <NoAlbumsEmptyState
          onCreateAlbum={isOwnProfile ? () => router.push('/albums/new') : undefined}
        />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
        className
      )}
    >
      {albums.map((album, index) => (
        <motion.div key={album.id} variants={itemVariants}>
          <ProfileAlbumCard album={album} index={index} />
        </motion.div>
      ))}

      {/* Add album card for own profile */}
      {isOwnProfile && (
        <motion.div variants={itemVariants}>
          <Link
            href="/albums/new"
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="group/add aspect-[4/3] rounded-2xl border border-dashed border-border bg-muted/30
                         flex flex-col items-center justify-center gap-3
                         cursor-pointer transition-colors duration-200
                         hover:border-primary/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover/add:text-primary transition-colors">
                Add Album
              </span>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}
