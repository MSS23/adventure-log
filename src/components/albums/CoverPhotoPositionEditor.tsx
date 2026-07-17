'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Move, RotateCcw, Check, Maximize2, Grip } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getCoverCropFrame,
  getCoverPositionFromFrameCenter,
} from '@/lib/utils/cover-position'

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
  const [xOffset, setXOffset] = useState(currentPosition.xOffset ?? 50)
  const [yOffset, setYOffset] = useState(currentPosition.yOffset ?? 50)
  const [isDragging, setIsDragging] = useState(false)
  const [capturedPointerId, setCapturedPointerId] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 4, height: 3 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const cropFrame = useMemo(
    () => getCoverCropFrame(
      imageDimensions.width,
      imageDimensions.height,
      xOffset,
      yOffset,
    ),
    [imageDimensions, xOffset, yOffset],
  )
  const hasHorizontalCrop = cropFrame.widthPercent < 99.99
  const hasVerticalCrop = cropFrame.heightPercent < 99.99

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPosition(currentPosition.position || 'center')
      setXOffset(currentPosition.xOffset ?? 50)
      setYOffset(currentPosition.yOffset ?? 50)
      setImageLoaded(false)
      setImageDimensions({ width: 4, height: 3 })
    }
  }, [isOpen, imageUrl, currentPosition])

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
        setYOffset(0)
        break
      case 'bottom':
        setXOffset(50)
        setYOffset(100)
        break
      case 'left':
        setXOffset(0)
        setYOffset(50)
        break
      case 'right':
        setXOffset(100)
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
        } catch {
          // Ignore error if pointer was already released
        }
      }
    }
  }, [capturedPointerId])

  const updatePosition = (e: React.PointerEvent) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()

    const centerXPercent = ((e.clientX - rect.left) / rect.width) * 100
    const centerYPercent = ((e.clientY - rect.top) / rect.height) * 100
    const nextPosition = getCoverPositionFromFrameCenter(
      imageDimensions.width,
      imageDimensions.height,
      centerXPercent,
      centerYPercent,
    )

    setXOffset(nextPosition.xOffset)
    setYOffset(nextPosition.yOffset)
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      {/* sm: prefix preserves the base mobile gutter; dvh (not vh) so mobile
          browser chrome can't clip the bottom of the editor. */}
      <DialogContent className="sm:max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
            <Maximize2 className="h-5 w-5 sm:h-6 sm:w-6 text-olive-600" />
            Adjust Cover Photo Position
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Drag the blue crop box across the full photo. The preview below exactly matches the 4:3 cover shown in your feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pt-2">
          {/* Full Image with Preview Frame Overlay */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between bg-gradient-to-r from-olive-50 to-olive-50 dark:bg-olive-950/20 p-2 sm:p-3 rounded-lg border border-olive-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Grip className="h-3 w-3 sm:h-4 sm:w-4 text-olive-600" />
                <div className="text-xs sm:text-sm font-semibold text-olive-900 dark:text-stone-100">Full Image with Preview Frame</div>
              </div>
              <div className="text-[10px] sm:text-xs text-olive-700 font-medium hidden sm:block">Click & drag to reposition</div>
            </div>

            <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-lg border-2 border-stone-300 bg-stone-100 p-2 shadow-lg dark:border-white/[0.14] dark:bg-white/[0.06] sm:rounded-xl sm:p-3">
              <div
                ref={imageContainerRef}
                className={cn(
                  'relative inline-block max-w-full overflow-hidden rounded-md select-none touch-none transition-shadow duration-200',
                  isDragging
                    ? 'cursor-grabbing shadow-2xl ring-2 ring-sky-400'
                    : 'cursor-grab shadow-md hover:ring-2 hover:ring-sky-300',
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* The editor needs the source image's real intrinsic dimensions
                    to draw an exact crop box; the final feed preview below still
                    uses Next Image for delivery parity. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Full cover photo"
                  className={cn(
                    'block max-h-[min(56dvh,580px)] h-auto w-auto max-w-full object-contain transition-opacity duration-200',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  draggable={false}
                  fetchPriority="high"
                  onLoad={(event) => {
                    const image = event.currentTarget
                    setImageDimensions({
                      width: image.naturalWidth || 4,
                      height: image.naturalHeight || 3,
                    })
                    setImageLoaded(true)
                  }}
                />

                {!imageLoaded && (
                  <div className="absolute inset-0 flex min-h-[300px] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-sky-600" />
                  </div>
                )}

                {imageLoaded && (
                  <div
                    className={cn(
                      'absolute z-10 overflow-hidden rounded-md border-[3px] pointer-events-none transition-[left,top,box-shadow] duration-150',
                      isDragging
                        ? 'border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]'
                        : 'border-sky-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]',
                    )}
                    style={{
                      left: `${cropFrame.leftPercent}%`,
                      top: `${cropFrame.topPercent}%`,
                      width: `${cropFrame.widthPercent}%`,
                      height: `${cropFrame.heightPercent}%`,
                    }}
                  >
                    <div className="absolute left-2 top-2 rounded-full bg-sky-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
                      Feed crop · 4:3
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-500 bg-white/95 shadow-xl transition-transform dark:bg-[#1B170E]/95',
                        isDragging && 'scale-110',
                      )}>
                        <Move className="h-5 w-5 text-sky-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Final Preview - What will actually appear */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-2 sm:p-3 rounded-lg border border-green-200 dark:border-green-900/40">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <div className="text-xs sm:text-sm font-semibold text-green-900 dark:text-stone-100">Final Feed Preview · 4:3</div>
              </div>
              <div className="text-[10px] sm:text-xs text-green-700 font-medium">How it will appear</div>
            </div>
            <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 dark:from-white/[0.06] dark:to-white/[0.08] rounded-lg sm:rounded-xl overflow-hidden border-2 border-green-500 shadow-xl">
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
          <div className="space-y-2 sm:space-y-3 bg-stone-50 dark:bg-white/[0.04] p-3 sm:p-4 rounded-lg sm:rounded-xl border border-stone-200 dark:border-white/[0.10]">
            <div className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">Quick Presets</div>
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
                disabled={!hasVerticalCrop}
                className="transition-all duration-200"
              >
                Top
              </Button>
              <Button
                type="button"
                variant={position === 'bottom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('bottom')}
                disabled={!hasVerticalCrop}
                className="transition-all duration-200"
              >
                Bottom
              </Button>
              <Button
                type="button"
                variant={position === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('left')}
                disabled={!hasHorizontalCrop}
                className="transition-all duration-200"
              >
                Left
              </Button>
              <Button
                type="button"
                variant={position === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('right')}
                disabled={!hasHorizontalCrop}
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
                  className="bg-olive-100 text-olive-700 border-olive-200"
                >
                  Custom
                </Button>
              )}
            </div>
            {/* Position Values */}
            <div className="text-[10px] sm:text-xs text-stone-600 dark:text-stone-400 flex items-center gap-3 sm:gap-4 pt-2 border-t border-stone-200 dark:border-white/[0.10]">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-semibold">X:</span>
                <span className="font-mono bg-white dark:bg-[#1B170E] px-1.5 sm:px-2 py-0.5 rounded border border-stone-300 dark:border-white/[0.14] text-[10px] sm:text-xs">{Math.round(xOffset)}%</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-semibold">Y:</span>
                <span className="font-mono bg-white dark:bg-[#1B170E] px-1.5 sm:px-2 py-0.5 rounded border border-stone-300 dark:border-white/[0.14] text-[10px] sm:text-xs">{Math.round(yOffset)}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 pt-4 sm:pt-6 border-t-2 border-stone-200 dark:border-white/[0.10]">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="transition-all duration-200 hover:bg-stone-100 dark:hover:bg-white/[0.06]"
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
                className="flex-1 sm:flex-none transition-all duration-200 hover:bg-stone-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none bg-olive-600 hover:bg-olive-700 transition-all duration-200"
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
