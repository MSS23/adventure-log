'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Upload,
  Globe,
  Camera,
  Share2,
  Download,
  Search,
  Settings,
  Map,
  Zap,
  Sparkles,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  gradient: string
  category: 'create' | 'explore' | 'share' | 'manage'
  isNew?: boolean
  badge?: string
}

interface QuickActionsProps {
  className?: string
  onUploadClick?: () => void
  onSearchClick?: () => void
}

export function QuickActions({ className, onUploadClick, onSearchClick }: QuickActionsProps) {
  const actions: ActionCard[] = [
    {
      id: 'create-album',
      title: 'Create Album',
      description: 'Start a new travel album',
      icon: <Plus className="h-5 w-5" />,
      href: '/albums/new',
      gradient: 'from-blue-500 to-indigo-600',
      category: 'create'
    },
    {
      id: 'upload-photos',
      title: 'Upload Photos',
      description: 'Add photos to existing album',
      icon: <Upload className="h-5 w-5" />,
      onClick: onUploadClick,
      gradient: 'from-green-500 to-emerald-600',
      category: 'create',
      isNew: true
    },
    {
      id: 'explore-globe',
      title: 'Explore Globe',
      description: 'View your travels on 3D globe',
      icon: <Globe className="h-5 w-5" />,
      href: '/globe',
      gradient: 'from-purple-500 to-violet-600',
      category: 'explore'
    },
    {
      id: 'quick-capture',
      title: 'Quick Capture',
      description: 'Instantly create album from photos',
      icon: <Camera className="h-5 w-5" />,
      gradient: 'from-orange-500 to-red-500',
      category: 'create',
      badge: 'Beta'
    },
    {
      id: 'share-journey',
      title: 'Share Journey',
      description: 'Share your travel story',
      icon: <Share2 className="h-5 w-5" />,
      gradient: 'from-pink-500 to-rose-600',
      category: 'share'
    },
    {
      id: 'export-album',
      title: 'Export Album',
      description: 'Download as PDF or slideshow',
      icon: <Download className="h-5 w-5" />,
      gradient: 'from-teal-500 to-cyan-600',
      category: 'share',
      isNew: true
    },
    {
      id: 'discover',
      title: 'Discover',
      description: 'Find inspiration from community',
      icon: <Search className="h-5 w-5" />,
      onClick: onSearchClick,
      gradient: 'from-yellow-500 to-amber-600',
      category: 'explore'
    },
    {
      id: 'map-view',
      title: 'Map View',
      description: 'See travels on interactive map',
      icon: <Map className="h-5 w-5" />,
      href: '/map',
      gradient: 'from-indigo-500 to-blue-600',
      category: 'explore',
      badge: 'New'
    }
  ]

  const categoryIcons = {
    create: <Zap className="h-4 w-4" />,
    explore: <Globe className="h-4 w-4" />,
    share: <Share2 className="h-4 w-4" />,
    manage: <Settings className="h-4 w-4" />
  }

  const categoryColors = {
    create: 'text-green-600 bg-green-100',
    explore: 'text-blue-600 bg-blue-100',
    share: 'text-purple-600 bg-purple-100',
    manage: 'text-gray-600 bg-gray-100'
  }

  const groupedActions = actions.reduce((groups, action) => {
    const category = action.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(action)
    return groups
  }, {} as Record<string, ActionCard[]>)

  const ActionButton = ({ action, index }: { action: ActionCard; index: number }) => {
    const cardContent = (
      <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm group cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {action.icon}
            </div>
            <div className="flex flex-col gap-1">
              {action.isNew && (
                <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
                  <Sparkles className="h-2 w-2 mr-1" />
                  New
                </Badge>
              )}
              {action.badge && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {action.badge}
                </Badge>
              )}
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
            {action.title}
          </h3>

          <p className="text-sm text-gray-600 mb-3">
            {action.description}
          </p>

          <div className="flex items-center justify-between">
            <div className={cn(
              "p-1.5 rounded-lg text-xs font-medium flex items-center gap-1",
              categoryColors[action.category]
            )}>
              {categoryIcons[action.category]}
              {action.category}
            </div>
            <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </div>
          </div>
        </CardContent>
      </Card>
    )

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {action.href ? (
          <Link href={action.href}>
            {cardContent}
          </Link>
        ) : (
          <button onClick={action.onClick} type="button">
            {cardContent}
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Quick Actions
          <Badge variant="secondary" className="ml-auto">
            {actions.length} actions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Featured Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-gray-900">Most Used</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.slice(0, 3).map((action, index) => (
                <ActionButton key={action.id} action={action} index={index} />
              ))}
            </div>
          </div>

          {/* All Actions by Category */}
          <div className="space-y-4">
            {Object.entries(groupedActions).map(([category, categoryActions]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "p-1.5 rounded-lg flex items-center gap-1",
                    categoryColors[category as keyof typeof categoryColors]
                  )}>
                    {categoryIcons[category as keyof typeof categoryIcons]}
                    <span className="text-sm font-medium capitalize">{category}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {categoryActions.map((action, index) => (
                    <ActionButton key={action.id} action={action} index={index} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pro Tip */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Pro Tip</h4>
                <p className="text-sm text-blue-700">
                  Use keyboard shortcuts for faster access:
                  <kbd className="ml-1 px-1.5 py-0.5 bg-white rounded text-xs">Ctrl+N</kbd> for new album,
                  <kbd className="ml-1 px-1.5 py-0.5 bg-white rounded text-xs">Ctrl+U</kbd> for upload photos
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}