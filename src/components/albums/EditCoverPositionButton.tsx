'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Move } from 'lucide-react'
import { CoverPhotoPositionEditor } from './CoverPhotoPositionEditor'
import { useRouter } from 'next/navigation'

interface EditCoverPositionButtonProps {
  albumId: string
  coverImageUrl: string
  currentPosition?: {
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset?: number
    yOffset?: number
  }
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function EditCoverPositionButton({
  albumId,
  coverImageUrl,
  currentPosition,
  variant = 'outline',
  size = 'sm',
  className
}: EditCoverPositionButtonProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  const handleSave = async (position: {
    position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset: number
    yOffset: number
  }) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/albums/${albumId}/cover-position`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(position)
      })

      if (!response.ok) {
        throw new Error('Failed to update cover position')
      }

      // Refresh the page to show updated position
      router.refresh()
      setIsEditorOpen(false)
    } catch (error) {
      console.error('Error updating cover position:', error)
      alert('Failed to update cover position. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsEditorOpen(true)}
        disabled={isSaving}
        className={className}
      >
        <Move className="h-4 w-4 mr-2" />
        Adjust Cover
      </Button>

      <CoverPhotoPositionEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        imageUrl={coverImageUrl}
        currentPosition={currentPosition}
        onSave={handleSave}
      />
    </>
  )
}
