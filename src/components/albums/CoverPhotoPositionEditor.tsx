'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Move, RotateCcw, Check, Maximize2, Grip } from 'lucide-react'
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
  isSaving?: boolean
}

export function CoverPhotoPositionEditor({
  isOpen,
  onClose,
  imageUrl,
  currentPosition = { position: 'center', xOffset: 50, yOffset: 50 },
  onSave,
  isSaving = false
}: CoverPhotoPositionEditorProps) {
  const [position, setPosition] = useState(currentPosition.position || 'center')
  const [xOffset, setXOffset] = useState(currentPosition.xOffset || 50)
  const [yOffset, setYOffset] = useState(currentPosition.yOffset || 50)
  const [isDragging, setIsDragging] = useState(false)
  const [capturedPointerId, setCapturedPointerId] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPosition(currentPosition.position || 'center')
      setXOffset(currentPosition.xOffset || 50)
      setYOffset(currentPosition.yOffset || 50)
      setImageLoaded(false)
    }
  }, [isOpen, currentPosition])

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
    e.stopPropagation()
    setIsDragging(true)
    setPosition('custom')

    // Capture pointer to ensure we get all move events
    if (e.currentTarget) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      setCapturedPointerId(e.pointerId)
    }

    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()
    updatePosition(e)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)

    // Release pointer capture
    if (e.currentTarget) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      setCapturedPointerId(null)
    }
  }

  // Cleanup pointer capture on unmount
  useEffect(() => {
    // Store ref value before cleanup
    const containerElement = imageContainerRef.current
    return () => {
      if (capturedPointerId !== null && containerElement) {
        try {
          containerElement.releasePointerCapture(capturedPointerId)
        } catch (error) {
          // Ignore error if pointer was already released
        }
      }
    }
  }, [capturedPointerId])

  const updatePosition = (e: React.PointerEvent) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()

    // Calculate position as percentage, ensuring it stays within bounds
    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp values between 0 and 100
    x = Math.max(0, Math.min(100, x))
    y = Math.max(0, Math.min(100, y))

    setXOffset(x)
    setYOffset(y)
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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
            <Maximize2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Adjust Cover Photo Position
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Click and drag on the image to reposition the preview frame. The blue frame shows what will appear in your feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pt-2">
          {/* Full Image with Preview Frame Overlay */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-2 sm:p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Grip className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <div className="text-xs sm:text-sm font-semibold text-blue-900">Full Image with Preview Frame</div>
              </div>
              <div className="text-[10px] sm:text-xs text-blue-700 font-medium hidden sm:block">Click & drag to reposition</div>
            </div>

            <div
              ref={imageContainerRef}
              className={cn(
                "relative w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl overflow-hidden select-none touch-none shadow-lg border-2 transition-all duration-200",
                isDragging ? "cursor-grabbing border-blue-500 shadow-2xl scale-[0.99]" : "cursor-grab border-gray-300 hover:border-blue-400"
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ minHeight: '300px' }}
            >
              {/* Original Full Image */}
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <Image
                  src={imageUrl}
                  alt="Original photo"
                  fill
                  className={cn(
                    "object-cover transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  draggable={false}
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Dimmed overlay outside preview area */}
              <div className={cn(
                "absolute inset-0 pointer-events-none transition-opacity duration-200",
                isDragging ? "bg-black/50" : "bg-black/40"
              )}>
                {/* Clear area for the preview frame */}
                <div
                  className={cn(
                    "absolute bg-white transition-all duration-200",
                    isDragging && "ring-4 ring-blue-400"
                  )}
                  style={{
                    width: '50%',
                    aspectRatio: '16/10',
                    left: `${xOffset}%`,
                    top: `${yOffset}%`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '12px'
                  }}
                />
              </div>

              {/* Preview Frame Overlay - Shows feed crop area */}
              <div
                className={cn(
                  "absolute border-4 shadow-2xl pointer-events-none rounded-xl z-10 transition-all duration-200",
                  isDragging ? "border-blue-400 shadow-blue-500/50" : "border-blue-500"
                )}
                style={{
                  width: '50%',
                  aspectRatio: '16/10',
                  left: `${xOffset}%`,
                  top: `${yOffset}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]" />

                {/* Corner indicators with pulse animation */}
                <div className={cn(
                  "absolute -top-2 -left-2 w-5 h-5 bg-blue-500 rounded-full shadow-lg transition-transform",
                  isDragging && "scale-125"
                )} />
                <div className={cn(
                  "absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full shadow-lg transition-transform",
                  isDragging && "scale-125"
                )} />
                <div className={cn(
                  "absolute -bottom-2 -left-2 w-5 h-5 bg-blue-500 rounded-full shadow-lg transition-transform",
                  isDragging && "scale-125"
                )} />
                <div className={cn(
                  "absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 rounded-full shadow-lg transition-transform",
                  isDragging && "scale-125"
                )} />

                {/* Center drag handle */}
                <div className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
                  isDragging ? "scale-110" : "scale-100"
                )}>
                  <div className="relative w-10 h-10 bg-white rounded-full border-2 border-blue-500 shadow-xl flex items-center justify-center">
                    <Move className="h-5 w-5 text-blue-600" />
                  </div>
                </div>

                {/* Label */}
                <div className={cn(
                  "absolute -top-11 left-1/2 -translate-x-1/2 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap transition-all duration-200",
                  isDragging ? "bg-blue-400" : "bg-blue-500"
                )}>
                  Feed Preview Area
                </div>
              </div>

              {/* Instruction overlay - shows when not dragging */}
              {!isDragging && imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 z-20" style={{ pointerEvents: 'none' }}>
                  <div className="text-white text-center px-6 bg-black/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
                    <div className="relative mb-4">
                      <Move className="h-12 w-12 mx-auto animate-pulse" />
                    </div>
                    <p className="text-lg font-bold mb-2">Click & Drag to Reposition</p>
                    <p className="text-sm opacity-90">Move the blue frame to adjust what appears in your feed</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Final Preview - What will actually appear */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-2 sm:p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <div className="text-xs sm:text-sm font-semibold text-green-900">Final Feed Preview</div>
              </div>
              <div className="text-[10px] sm:text-xs text-green-700 font-medium">How it will appear</div>
            </div>
            <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl overflow-hidden border-2 border-green-500 shadow-xl">
              {/* Container that simulates the crop from the blue frame */}
              <div className="absolute inset-0">
                {/* Use object-position to simulate the crop without complex transforms */}
                <div className="relative w-full h-full">
                  <Image
                    src={imageUrl}
                    alt="Feed preview"
                    fill
                    className="object-cover"
                    style={{
                      objectPosition: `${xOffset}% ${yOffset}%`
                    }}
                    draggable={false}
                  />
                </div>
              </div>
              {/* Green checkmark indicator */}
              <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                <Check className="h-4 w-4" />
                Preview
              </div>
            </div>
          </div>

          {/* Preset Position Buttons */}
          <div className="space-y-2 sm:space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200">
            <div className="text-xs sm:text-sm font-semibold text-gray-800">Quick Presets</div>
            <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-2">
              <Button
                type="button"
                variant={position === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('center')}
                className="transition-all duration-200"
              >
                Center
              </Button>
              <Button
                type="button"
                variant={position === 'top' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('top')}
                className="transition-all duration-200"
              >
                Top
              </Button>
              <Button
                type="button"
                variant={position === 'bottom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('bottom')}
                className="transition-all duration-200"
              >
                Bottom
              </Button>
              <Button
                type="button"
                variant={position === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('left')}
                className="transition-all duration-200"
              >
                Left
              </Button>
              <Button
                type="button"
                variant={position === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('right')}
                className="transition-all duration-200"
              >
                Right
              </Button>
              {position === 'custom' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  className="bg-purple-100 text-purple-700 border-purple-200"
                >
                  Custom
                </Button>
              )}
            </div>
            {/* Position Values */}
            <div className="text-[10px] sm:text-xs text-gray-600 flex items-center gap-3 sm:gap-4 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-semibold">X:</span>
                <span className="font-mono bg-white px-1.5 sm:px-2 py-0.5 rounded border border-gray-300 text-[10px] sm:text-xs">{Math.round(xOffset)}%</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-semibold">Y:</span>
                <span className="font-mono bg-white px-1.5 sm:px-2 py-0.5 rounded border border-gray-300 text-[10px] sm:text-xs">{Math.round(yOffset)}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 pt-4 sm:pt-6 border-t-2 border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="transition-all duration-200 hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Center
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 sm:flex-none transition-all duration-200 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 transition-all duration-200"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Position
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
