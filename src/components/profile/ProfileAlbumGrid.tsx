'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Album } from '@/types/database'
import { ProfileAlbumCard } from './ProfileAlbumCard'
import { Button } from '@/components/ui/button'
import { Camera, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  if (albums.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'flex flex-col items-center justify-center py-16 px-4',
          'bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100',
          className
        )}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl" />
          <div className="relative p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isOwnProfile ? 'No albums yet' : 'No albums to show'}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            {isOwnProfile
              ? 'Start documenting your adventures by creating your first album.'
              : 'This user hasn\'t shared any albums yet.'}
          </p>
        </motion.div>

        {isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Link href="/albums/new">
              <Button className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" />
                Create Album
              </Button>
            </Link>
          </motion.div>
        )}
      </motion.div>
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
      {albums.map((album) => (
        <motion.div key={album.id} variants={itemVariants}>
          <ProfileAlbumCard album={album} />
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
                         hover:border-teal-400 bg-gray-50 hover:bg-teal-50/50
                         flex flex-col items-center justify-center gap-3
                         cursor-pointer transition-colors duration-300"
            >
              <div className="p-4 bg-gray-100 rounded-full group-hover:bg-teal-100 transition-colors">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
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
