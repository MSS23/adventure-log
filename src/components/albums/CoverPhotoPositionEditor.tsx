'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Move, RotateCcw, Check, Maximize2 } from 'lucide-react'
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
  const imageContainerRef = useRef<HTMLDivElement>(null)

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

  // Handle dragging the preview frame
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setPosition('custom')
    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()
    updatePosition(e)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const updatePosition = (e: React.PointerEvent) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Adjust Cover Photo Position
          </DialogTitle>
          <DialogDescription>
            Click or drag on the image to position the preview frame. The blue frame shows what will appear on the feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Full Image with Preview Frame Overlay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Full Image with Preview Frame</div>
              <div className="text-xs text-gray-500">Click to reposition the preview frame</div>
            </div>

            <div
              ref={imageContainerRef}
              className={cn(
                "relative w-full bg-gray-100 rounded-lg overflow-hidden select-none",
                isDragging ? "cursor-grabbing" : "cursor-crosshair"
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ minHeight: '400px' }}
            >
              {/* Original Full Image */}
              <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
                <Image
                  src={imageUrl}
                  alt="Original photo"
                  fill
                  className="object-contain"
                  draggable={false}
                  priority
                />
              </div>

              {/* Preview Frame Overlay - Shows feed crop area */}
              <div
                className="absolute border-4 border-blue-500 shadow-2xl pointer-events-none rounded-lg"
                style={{
                  width: '50%',
                  aspectRatio: '16/10',
                  left: `${xOffset}%`,
                  top: `${yOffset}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px]" />

                {/* Corner indicators */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg" />

                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute left-1/2 top-1/2 w-0.5 h-6 bg-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute left-1/2 top-1/2 h-0.5 w-6 bg-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Label */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                  Feed Preview Area
                </div>
              </div>

              {/* Dimmed overlay outside preview area */}
              <div className="absolute inset-0 pointer-events-none">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <mask id="preview-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={`${xOffset}%`}
                        y={`${yOffset}%`}
                        width="50%"
                        height={`${(50 * 10) / 16}%`}
                        rx="8"
                        fill="black"
                        style={{ transform: 'translate(-50%, -50%)', transformOrigin: 'top left' }}
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="black" opacity="0.4" mask="url(#preview-mask)" />
                </svg>
              </div>

              {/* Instruction overlay */}
              {!isDragging && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="text-white text-center px-4 bg-black/60 backdrop-blur-sm rounded-xl p-6">
                    <Move className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-base font-bold mb-1">Click & Drag to Reposition</p>
                    <p className="text-sm opacity-90">The blue frame shows what appears in the feed</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Final Preview - What will actually appear */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Final Feed Preview</div>
            <div className="relative w-full aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
              <Image
                src={imageUrl}
                alt="Feed preview"
                fill
                className="object-cover"
                draggable={false}
                style={{
                  objectPosition: `${xOffset}% ${yOffset}%`
                }}
              />
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
