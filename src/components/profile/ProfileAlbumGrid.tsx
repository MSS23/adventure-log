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
          <Link href="/albums/new">
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="aspect-[4/5] rounded-2xl border-2 border-dashed border-gray-300
                         hover:border-teal-400 bg-gradient-to-br from-gray-50 to-white
                         hover:from-teal-50/50 hover:to-cyan-50/30
                         flex flex-col items-center justify-center gap-3
                         cursor-pointer transition-all duration-300
                         shadow-sm hover:shadow-lg hover:shadow-teal-500/10"
            >
              <motion.div
                className="p-4 bg-gray-100 rounded-full transition-colors"
                whileHover={{ scale: 1.1, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Plus className="h-8 w-8 text-gray-400" />
              </motion.div>
              <span className="text-sm font-medium text-gray-500">
                Add Album
              </span>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}
