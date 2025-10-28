'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useFollows } from '@/lib/hooks/useFollows'
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  userId: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showText?: boolean
}

export function FollowButton({
  userId,
  className = '',
  size = 'default',
  variant = 'default',
  showText = true
}: FollowButtonProps) {
  const { user } = useAuth()
  const { followStatus, follow, unfollow, loading } = useFollows(userId)
  const [localLoading, setLocalLoading] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState(followStatus)

  // Update optimistic status when actual status changes
  useEffect(() => {
    setOptimisticStatus(followStatus)
  }, [followStatus])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if button is inside a link
    e.stopPropagation() // Prevent parent click handlers

    // Don't allow clicking if not logged in
    if (!user) {
      window.location.href = '/login'
      return
    }

    setLocalLoading(true)

    // Optimistic update for better UX
    if (optimisticStatus === 'following') {
      setOptimisticStatus('not_following')
    } else if (optimisticStatus === 'pending') {
      setOptimisticStatus('not_following')
    } else {
      setOptimisticStatus('pending')
    }

    try {
      if (followStatus === 'following') {
        await unfollow(userId)
      } else if (followStatus === 'pending') {
        await unfollow(userId) // Cancel request
      } else {
        await follow(userId)
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticStatus(followStatus)
    } finally {
      setLocalLoading(false)
    }
  }

  const isLoading = loading || localLoading

  const getButtonContent = () => {
    const currentStatus = isLoading ? optimisticStatus : followStatus

    switch (currentStatus) {
      case 'following':
        return {
          icon: <UserCheck className="h-4 w-4" />,
          text: 'Following',
          className: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200',
          showIcon: true
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'Requested',
          className: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200',
          showIcon: true
        }
      case 'blocked':
        return {
          icon: <UserX className="h-4 w-4" />,
          text: 'Blocked',
          className: 'bg-gray-100 text-gray-400 cursor-not-allowed',
          showIcon: true
        }
      default:
        return {
          icon: <UserPlus className="h-4 w-4" />,
          text: 'Follow',
          className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm hover:shadow-md transition-all',
          showIcon: false
        }
    }
  }

  const buttonContent = getButtonContent()

  if (followStatus === 'blocked') {
    return null // Don't show button for blocked users
  }

  // Don't show follow button for own profile
  if (user?.id === userId) {
    return null
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      variant="outline"
      className={cn(
        'rounded-lg font-medium transition-all duration-200',
        buttonContent.className,
        isLoading && 'opacity-60 cursor-wait',
        className
      )}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : buttonContent.showIcon ? (
        buttonContent.icon
      ) : null}
      {showText && (
        <span className={cn(
          isLoading || buttonContent.showIcon ? 'ml-2' : ''
        )}>
          {isLoading ? 'Loading...' : buttonContent.text}
        </span>
      )}
    </Button>
  )
}