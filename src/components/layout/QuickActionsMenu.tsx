'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Camera,
  Globe,
  Search,
  Heart,
  MapPin,
  X,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface QuickAction {
  icon: React.ReactNode
  label: string
  href?: string
  onClick?: () => void
  color: string
}

export function QuickActionsMenu() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const quickActions: QuickAction[] = [
    {
      icon: <Camera className="h-5 w-5" />,
      label: 'New Album',
      href: '/albums/new',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      label: 'New Story',
      href: '/stories/new',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: <Globe className="h-5 w-5" />,
      label: 'Explore Globe',
      href: '/globe',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: <Search className="h-5 w-5" />,
      label: 'Search',
      onClick: () => {
        router.push('/search')
        setIsOpen(false)
      },
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      icon: <Heart className="h-5 w-5" />,
      label: 'Feed',
      href: '/feed',
      color: 'bg-pink-500 hover:bg-pink-600'
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      label: 'Wishlist',
      href: '/wishlist',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    }
  ]

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      router.push(action.href)
      setIsOpen(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-0 mb-4 space-y-3"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15, delay: index * 0.05 }}
              >
                <button
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-full text-white shadow-lg transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    action.color
                  )}
                >
                  {action.icon}
                  <span className="font-medium text-sm whitespace-nowrap">{action.label}</span>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300',
          isOpen
            ? 'bg-red-500 hover:bg-red-600 rotate-45'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        )}
      >
        <Plus className={cn('h-6 w-6 text-white transition-transform', isOpen && 'rotate-45')} />
      </motion.button>

      {/* Overlay backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
