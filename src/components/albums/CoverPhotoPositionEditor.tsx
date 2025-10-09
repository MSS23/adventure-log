'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Move, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoverPhotoPositionEditorProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  currentPosition?: {
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset?: number
    yOffset?: number
  }
  onSave: (position: {
    position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom'
    xOffset: number
    yOffset: number
  }) => void
}

export function CoverPhotoPositionEditor({
  isOpen,
  onClose,
  imageUrl,
  currentPosition = { position: 'center', xOffset: 50, yOffset: 50 },
  onSave
}: CoverPhotoPositionEditorProps) {
  const [position, setPosition] = useState(currentPosition.position || 'center')
  const [xOffset, setXOffset] = useState(currentPosition.xOffset || 50)
  const [yOffset, setYOffset] = useState(currentPosition.yOffset || 50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Apply preset positions
  const applyPreset = (preset: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
    setPosition(preset)
    switch (preset) {
      case 'center':
        setXOffset(50)
        setYOffset(50)
        break
      case 'top':
        setXOffset(50)
        setYOffset(25)
        break
      case 'bottom':
        setXOffset(50)
        setYOffset(75)
        break
      case 'left':
        setXOffset(25)
        setYOffset(50)
        break
      case 'right':
        setXOffset(75)
        setYOffset(50)
        break
    }
  }

  // Handle mouse/touch drag
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setPosition('custom')
    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    updatePosition(e)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const updatePosition = (e: React.PointerEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setXOffset(Math.max(0, Math.min(100, x)))
    setYOffset(Math.max(0, Math.min(100, y)))
  }

  const handleSave = () => {
    onSave({
      position: position as 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom',
      xOffset: Math.round(xOffset),
      yOffset: Math.round(yOffset)
    })
    onClose()
  }

  const handleReset = () => {
    setPosition('center')
    setXOffset(50)
    setYOffset(50)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Adjust Cover Photo Position
          </DialogTitle>
          <DialogDescription>
            Click and drag on the image to reposition it, or use the preset buttons below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Container */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Preview (Feed View)</div>
            <div
              ref={containerRef}
              className={cn(
                "relative w-full aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden cursor-crosshair",
                isDragging && "cursor-grabbing"
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <div
                className="absolute"
                style={{
                  width: '200%',
                  height: '200%',
                  left: `${50 - xOffset}%`,
                  top: `${50 - yOffset}%`,
                }}
              >
                <Image
                  src={imageUrl}
                  alt="Cover photo"
                  fill
                  className="object-cover"
                  draggable={false}
                  priority
                />
              </div>

              {/* Crosshair indicator */}
              <div
                className="absolute w-8 h-8 pointer-events-none z-10"
                style={{
                  left: `calc(${xOffset}% - 1rem)`,
                  top: `calc(${yOffset}% - 1rem)`,
                }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping" />
                <div className="absolute left-1/2 top-1/2 w-0.5 h-full bg-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute left-1/2 top-1/2 h-0.5 w-full bg-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
              </div>

              {/* Instruction overlay */}
              {!isDragging && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="text-white text-center px-4">
                    <Move className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">Click and drag to adjust position</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preset Position Buttons */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Quick Presets</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={position === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('center')}
              >
                Center
              </Button>
              <Button
                type="button"
                variant={position === 'top' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('top')}
              >
                Top
              </Button>
              <Button
                type="button"
                variant={position === 'bottom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('bottom')}
              >
                Bottom
              </Button>
              <Button
                type="button"
                variant={position === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('left')}
              >
                Left
              </Button>
              <Button
                type="button"
                variant={position === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('right')}
              >
                Right
              </Button>
              {position === 'custom' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                >
                  Custom
                </Button>
              )}
            </div>
          </div>

          {/* Position Values */}
          <div className="text-xs text-gray-500 flex items-center gap-4">
            <span>X: {Math.round(xOffset)}%</span>
            <span>Y: {Math.round(yOffset)}%</span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Position
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
