'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/charts'
import {
  Trophy,
  MapPin,
  Camera,
  Globe,
  Star,
  Award,
  Target,
  Zap
} from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  progress: number
  requirement: number
  category: 'travel' | 'social' | 'milestone'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface TravelAchievementsProps {
  stats: {
    totalAlbums: number
    totalPhotos: number
    countriesVisited: number
    citiesExplored: number
  }
  className?: string
}

export function TravelAchievements({ stats, className }: TravelAchievementsProps) {
  const achievements: Achievement[] = [
    {
      id: 'first-adventure',
      title: 'First Adventure',
      description: 'Create your first travel album',
      icon: <Camera className="h-4 w-4" />,
      unlocked: (stats.totalAlbums || 0) >= 1,
      progress: Math.min(stats.totalAlbums || 0, 1),
      requirement: 1,
      category: 'milestone',
      rarity: 'common'
    },
    {
      id: 'photo-enthusiast',
      title: 'Photo Enthusiast',
      description: 'Upload 100 travel photos',
      icon: <Camera className="h-4 w-4" />,
      unlocked: (stats.totalPhotos || 0) >= 100,
      progress: Math.min(stats.totalPhotos || 0, 100),
      requirement: 100,
      category: 'social',
      rarity: 'rare'
    },
    {
      id: 'country-collector',
      title: 'Country Collector',
      description: 'Visit 10 different countries',
      icon: <Globe className="h-4 w-4" />,
      unlocked: (stats.countriesVisited || 0) >= 10,
      progress: Math.min(stats.countriesVisited || 0, 10),
      requirement: 10,
      category: 'travel',
      rarity: 'epic'
    },
    {
      id: 'city-explorer',
      title: 'City Explorer',
      description: 'Explore 25 different cities',
      icon: <MapPin className="h-4 w-4" />,
      unlocked: (stats.citiesExplored || 0) >= 25,
      progress: Math.min(stats.citiesExplored || 0, 25),
      requirement: 25,
      category: 'travel',
      rarity: 'epic'
    },
    {
      id: 'album-master',
      title: 'Album Master',
      description: 'Create 20 travel albums',
      icon: <Trophy className="h-4 w-4" />,
      unlocked: (stats.totalAlbums || 0) >= 20,
      progress: Math.min(stats.totalAlbums || 0, 20),
      requirement: 20,
      category: 'milestone',
      rarity: 'rare'
    },
    {
      id: 'globetrotter',
      title: 'Globetrotter',
      description: 'Visit 50 different cities',
      icon: <Star className="h-4 w-4" />,
      unlocked: stats.citiesExplored >= 50,
      progress: Math.min(stats.citiesExplored, 50),
      requirement: 50,
      category: 'travel',
      rarity: 'legendary'
    }
  ]

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-500'
      case 'rare': return 'from-blue-400 to-blue-500'
      case 'epic': return 'from-purple-400 to-purple-500'
      case 'legendary': return 'from-yellow-400 to-yellow-500'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  const getRarityBadgeColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-700'
      case 'rare': return 'bg-blue-100 text-blue-700'
      case 'epic': return 'bg-purple-100 text-purple-700'
      case 'legendary': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const totalProgress = achievements.reduce((sum, a) => sum + (a.progress / a.requirement), 0)
  const overallProgress = (totalProgress / achievements.length) * 100

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Travel Achievements
          </CardTitle>
          <Badge variant="secondary">
            {unlockedAchievements.length}/{achievements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="flex items-center gap-4">
            <ProgressRing
              progress={overallProgress}
              size={80}
              strokeWidth={6}
              color="#10B981"
            >
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(overallProgress)}%
                </div>
                <div className="text-sm text-gray-800">Complete</div>
              </div>
            </ProgressRing>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Achievement Progress</h3>
              <p className="text-sm text-gray-800">
                You&apos;ve unlocked {unlockedAchievements.length} out of {achievements.length} achievements.
                Keep exploring to unlock more!
              </p>
            </div>
          </div>

          {/* Achievement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  achievement.unlocked
                    ? 'border-green-200 bg-green-50 shadow-md'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getRarityColor(achievement.rarity)} text-white shadow-sm ${
                    achievement.unlocked ? 'scale-110' : 'opacity-60'
                  } transition-all duration-300`}>
                    {achievement.unlocked ? <Trophy className="h-4 w-4" /> : achievement.icon}
                  </div>
                  <div className="flex gap-1">
                    {achievement.unlocked && (
                      <Badge className="bg-green-100 text-green-700 text-sm">
                        <Zap className="h-3 w-3 mr-1" />
                        Unlocked
                      </Badge>
                    )}
                    <Badge className={`${getRarityBadgeColor(achievement.rarity)} text-sm`}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                </div>

                <h4 className={`font-semibold mb-1 ${
                  achievement.unlocked ? 'text-green-900' : 'text-gray-700'
                }`}>
                  {achievement.title}
                </h4>

                <p className={`text-sm mb-3 ${
                  achievement.unlocked ? 'text-green-700' : 'text-gray-800'
                }`}>
                  {achievement.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800">Progress</span>
                    <span className="font-medium">
                      {achievement.progress}/{achievement.requirement}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        achievement.unlocked
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(achievement.progress / achievement.requirement) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Next Achievement Hint */}
          {unlockedAchievements.length < achievements.length && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Next Achievement</h4>
              </div>
              {(() => {
                const nextAchievement = achievements.find(a => !a.unlocked)
                if (!nextAchievement) return null

                const remaining = nextAchievement.requirement - nextAchievement.progress
                return (
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">{nextAchievement.title}:</span>{' '}
                    {remaining > 1
                      ? `${remaining} more to go!`
                      : 'Almost there! Just 1 more!'}
                  </p>
                )
              })()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}