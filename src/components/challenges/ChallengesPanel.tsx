'use client'

import { motion } from 'framer-motion'
import { Trophy, Check, Lock } from 'lucide-react'
import { useChallenges, ChallengeWithProgress } from '@/lib/hooks/useChallenges'

function ChallengeCard({ challenge }: { challenge: ChallengeWithProgress }) {
  const isCompleted = !!challenge.completed_at

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-gray-100 hover:border-gray-200 transition-colors"
      whileHover={{ scale: 1.01 }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{
          background: isCompleted
            ? `linear-gradient(135deg, ${challenge.badge_color}20, ${challenge.badge_color}40)`
            : 'rgba(0,0,0,0.03)',
        }}
      >
        {isCompleted ? (
          <span>{challenge.icon}</span>
        ) : (
          <span className="opacity-40">{challenge.icon}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${isCompleted ? 'text-gray-900' : 'text-gray-700'}`}>
            {challenge.title}
          </p>
          {isCompleted && (
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{challenge.description}</p>

        {/* Progress bar */}
        {!isCompleted && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: challenge.badge_color }}
                initial={{ width: 0 }}
                animate={{ width: `${challenge.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">
              {challenge.progress}/{challenge.target_count}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface ChallengesPanelProps {
  userId: string
  showAll?: boolean
}

export function ChallengesPanel({ userId, showAll = false }: ChallengesPanelProps) {
  const { challenges, loading, completedCount, totalCount } = useChallenges(userId)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-8">
        <Lock className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Challenges coming soon!</p>
      </div>
    )
  }

  // Sort: in-progress first, then not started, then completed
  const sorted = [...challenges].sort((a, b) => {
    if (a.completed_at && !b.completed_at) return 1
    if (!a.completed_at && b.completed_at) return -1
    if (a.progress > 0 && b.progress === 0) return -1
    if (a.progress === 0 && b.progress > 0) return 1
    return a.sort_order - b.sort_order
  })

  const displayed = showAll ? sorted : sorted.slice(0, 6)

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900">Challenges</span>
        </div>
        <span className="text-xs text-gray-500">
          {completedCount}/{totalCount} completed
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Challenge list */}
      <div className="space-y-2">
        {displayed.map(challenge => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </div>
  )
}
