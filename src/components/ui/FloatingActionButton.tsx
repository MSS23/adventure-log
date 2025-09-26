'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Camera, Image as ImageIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import Link from 'next/link'

interface FloatingActionButtonProps {
  className?: string
  variant?: 'default' | 'instagram'
}

export function FloatingActionButton({
  className,
  variant = 'instagram'
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const actions = [
    {
      id: 'new-album',
      label: 'New Album',
      icon: Camera,
      href: '/albums/new',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'quick-upload',
      label: 'Quick Upload',
      icon: ImageIcon,
      href: '/albums/new?quick=true',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'upload-existing',
      label: 'Add to Album',
      icon: Upload,
      href: '/albums',
      color: 'from-green-500 to-green-600'
    }
  ]

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[40] lg:hidden"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Action Menu */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-4 z-[51] space-y-3 lg:hidden"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={action.href} onClick={() => setIsExpanded(false)}>
                  <div className="flex items-center gap-3 bg-white rounded-full shadow-lg border border-gray-200/50 pr-4 py-2 hover:shadow-xl transition-all duration-200">
                    <div className={cn(
                      "w-12 h-12 rounded-full bg-gradient-to-r flex items-center justify-center",
                      action.color
                    )}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 pr-2">
                      {action.label}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        className={cn(
          "fixed bottom-20 right-4 z-[51] lg:hidden",
          className
        )}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        <Button
          size="lg"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
            variant === 'instagram'
              ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
              : instagramStyles.button.primary,
            isExpanded && "rotate-45"
          )}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isExpanded ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Plus className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </Button>
      </motion.div>
    </>
  )
}