'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useFollows } from '@/lib/hooks/useFollows'
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react'

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
  const { followStatus, follow, unfollow, loading } = useFollows(userId)
  const [localLoading, setLocalLoading] = useState(false)

  const handleClick = async () => {
    setLocalLoading(true)
    try {
      if (followStatus === 'following') {
        await unfollow(userId)
      } else if (followStatus === 'pending') {
        await unfollow(userId) // Cancel request
      } else {
        await follow(userId)
      }
    } finally {
      setLocalLoading(false)
    }
  }

  const isLoading = loading || localLoading

  const getButtonContent = () => {
    switch (followStatus) {
      case 'following':
        return {
          icon: <UserCheck className="h-4 w-4" />,
          text: 'Following',
          variant: 'outline' as const
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'Pending',
          variant: 'secondary' as const
        }
      case 'blocked':
        return {
          icon: <UserX className="h-4 w-4" />,
          text: 'Blocked',
          variant: 'secondary' as const
        }
      default:
        return {
          icon: <UserPlus className="h-4 w-4" />,
          text: 'Follow',
          variant: variant
        }
    }
  }

  const buttonContent = getButtonContent()

  if (followStatus === 'blocked') {
    return null // Don't show button for blocked users
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      variant={buttonContent.variant}
      className={className}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        buttonContent.icon
      )}
      {showText && (
        <span className="ml-2">
          {isLoading ? 'Loading...' : buttonContent.text}
        </span>
      )}
    </Button>
  )
}