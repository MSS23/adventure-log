'use client'

import { Globe, Users, Lock, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PrivacyLevel } from '@/types/database'
import { cn } from '@/lib/utils'

interface PrivacySelectorProps {
  value: PrivacyLevel
  onChange: (privacy: PrivacyLevel) => void
  disabled?: boolean
  showTooltips?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'buttons' | 'cards' | 'segmented'
}

interface PrivacyOption {
  value: PrivacyLevel
  label: string
  icon: React.ReactNode
  description: string
  badge?: string
  color: string
}

const privacyOptions: PrivacyOption[] = [
  {
    value: 'public',
    label: 'Public',
    icon: <Globe className="w-4 h-4" />,
    description: 'Anyone can see this content',
    color: 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
  },
  {
    value: 'friends',
    label: 'Friends',
    icon: <Users className="w-4 h-4" />,
    description: 'Only your friends can see this content',
    color: 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
  },
  {
    value: 'private',
    label: 'Private',
    icon: <Lock className="w-4 h-4" />,
    description: 'Only you can see this content',
    badge: 'Default',
    color: 'text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100'
  }
]

export function PrivacySelector({
  value,
  onChange,
  disabled = false,
  showTooltips = true,
  className = "",
  size = 'md',
  variant = 'buttons'
}: PrivacySelectorProps) {

  const getSizeClasses = (variant: string) => {
    switch (size) {
      case 'sm':
        return variant === 'cards'
          ? 'p-2 text-sm'
          : 'px-2 py-1 text-sm'
      case 'lg':
        return variant === 'cards'
          ? 'p-4 text-base'
          : 'px-4 py-2 text-base'
      default:
        return variant === 'cards'
          ? 'p-3 text-sm'
          : 'px-3 py-2 text-sm'
    }
  }

  if (variant === 'cards') {
    return (
      <div className={`space-y-3 ${className}`}>
        {privacyOptions.map((option) => {
          const isSelected = value === option.value
          return (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? `ring-2 ring-primary border-primary ${option.color}`
                  : 'hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onChange(option.value)}
            >
              <CardContent className={getSizeClasses('cards')}>
                <div className="flex items-center gap-3">
                  <div className={`${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {option.label}
                      </span>
                      {option.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex rounded-lg border bg-muted p-1 ${className}`}>
        {privacyOptions.map((option) => {
          const isSelected = value === option.value
          return (
            <Button
              key={option.value}
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={getSizeClasses('buttons')}
            >
              <span className="mr-2">{option.icon}</span>
              {option.label}
            </Button>
          )
        })}
      </div>
    )
  }

  // Default button variant
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {privacyOptions.map((option) => {
        const isSelected = value === option.value
        const ButtonContent = () => (
          <Button
            key={option.value}
            variant={isSelected ? 'default' : 'outline'}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              getSizeClasses('buttons'),
              !isSelected && option.color
            )}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
            {option.badge && isSelected && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {option.badge}
              </Badge>
            )}
          </Button>
        )

        if (showTooltips) {
          return (
            <TooltipProvider key={option.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ButtonContent />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2 max-w-xs">
                    {option.icon}
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs opacity-80">{option.description}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }

        return <ButtonContent key={option.value} />
      })}
    </div>
  )
}

/**
 * Compact privacy indicator for display-only contexts
 */
export function PrivacyIndicator({
  privacy,
  className = "",
  showLabel = true,
  size = 'sm'
}: {
  privacy: PrivacyLevel
  className?: string
  showLabel?: boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  const option = privacyOptions.find(opt => opt.value === privacy)
  if (!option) return null

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5'
  }

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  }

  return (
    <Badge
      variant="secondary"
      className={`${sizeClasses[size]} ${className} inline-flex items-center gap-1`}
    >
      <span className={iconSizes[size]}>
        {option.icon}
      </span>
      {showLabel && option.label}
    </Badge>
  )
}

/**
 * Privacy info helper component
 */
export function PrivacyInfo({ className = "" }: { className?: string }) {
  return (
    <div className={cn("space-y-2 text-sm text-muted-foreground", className)}>
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 text-blue-500" />
        <div>
          <p className="font-medium text-foreground mb-1">Privacy Settings</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-green-600" />
              <span><strong>Public:</strong> Visible to everyone on Adventure Log</span>
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-3 h-3 text-blue-600" />
              <span><strong>Friends:</strong> Only visible to your accepted friends</span>
            </li>
            <li className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span><strong>Private:</strong> Only visible to you</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}