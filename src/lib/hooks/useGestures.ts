'use client'

import { useRef, useCallback, useState } from 'react'
import { useDrag, usePinch, useWheel, useGesture } from '@use-gesture/react'
import { useSpring, animated, config } from '@react-spring/web'
import { gestureConfig } from '@/lib/animations/spring-configs'

// ==========================================
// PINCH TO ZOOM HOOK
// ==========================================
interface UsePinchZoomOptions {
  minScale?: number
  maxScale?: number
  onZoomChange?: (scale: number) => void
}

export function usePinchZoom({
  minScale = 1,
  maxScale = 4,
  onZoomChange,
}: UsePinchZoomOptions = {}) {
  const [{ scale, x, y }, api] = useSpring(() => ({
    scale: 1,
    x: 0,
    y: 0,
    config: config.default,
  }))

  const bind = useGesture(
    {
      onPinch: ({ offset: [s], memo }) => {
        const newScale = Math.min(Math.max(s, minScale), maxScale)
        api.start({ scale: newScale })
        onZoomChange?.(newScale)
        return memo
      },
      onPinchEnd: () => {
        // Reset to bounds if zoomed out
        if (scale.get() <= 1) {
          api.start({ scale: 1, x: 0, y: 0 })
        }
      },
      onDrag: ({ offset: [ox, oy], pinching }) => {
        // Only allow drag when zoomed in
        if (scale.get() > 1 && !pinching) {
          api.start({ x: ox, y: oy })
        }
      },
      onDoubleClick: () => {
        // Toggle between 1x and 2x zoom
        const currentScale = scale.get()
        if (currentScale > 1) {
          api.start({ scale: 1, x: 0, y: 0 })
          onZoomChange?.(1)
        } else {
          api.start({ scale: 2 })
          onZoomChange?.(2)
        }
      },
    },
    {
      pinch: {
        scaleBounds: { min: minScale, max: maxScale },
        rubberband: true,
      },
      drag: {
        from: () => [x.get(), y.get()],
      },
    }
  )

  const resetZoom = useCallback(() => {
    api.start({ scale: 1, x: 0, y: 0 })
    onZoomChange?.(1)
  }, [api, onZoomChange])

  return {
    bind,
    style: { scale, x, y },
    resetZoom,
    AnimatedDiv: animated.div,
  }
}

// ==========================================
// SWIPE GESTURE HOOK
// ==========================================
interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  velocityThreshold?: number
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = gestureConfig.dragDistance,
  velocityThreshold = gestureConfig.swipeVelocity,
}: UseSwipeOptions = {}) {
  const [{ x, y }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: config.stiff,
  }))

  const bind = useDrag(
    ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], cancel, canceled }) => {
      if (canceled) return

      // Horizontal swipe
      if (Math.abs(mx) > threshold || vx > velocityThreshold) {
        if (dx > 0 && onSwipeRight) {
          onSwipeRight()
          cancel()
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft()
          cancel()
        }
      }

      // Vertical swipe
      if (Math.abs(my) > threshold || vy > velocityThreshold) {
        if (dy > 0 && onSwipeDown) {
          onSwipeDown()
          cancel()
        } else if (dy < 0 && onSwipeUp) {
          onSwipeUp()
          cancel()
        }
      }

      // Spring back if not swiped
      api.start({ x: 0, y: 0 })
    },
    {
      axis: 'lock',
      rubberband: true,
    }
  )

  return {
    bind,
    style: { x, y },
    AnimatedDiv: animated.div,
  }
}

// ==========================================
// DRAG TO DISMISS HOOK
// ==========================================
interface UseDragToDismissOptions {
  onDismiss: () => void
  direction?: 'down' | 'up' | 'left' | 'right' | 'any'
  threshold?: number
}

export function useDragToDismiss({
  onDismiss,
  direction = 'down',
  threshold = 150,
}: UseDragToDismissOptions) {
  const [{ y, x, opacity }, api] = useSpring(() => ({
    y: 0,
    x: 0,
    opacity: 1,
    config: config.stiff,
  }))

  const bind = useDrag(
    ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], last, cancel }) => {
      const isCorrectDirection =
        direction === 'any' ||
        (direction === 'down' && dy > 0) ||
        (direction === 'up' && dy < 0) ||
        (direction === 'left' && dx < 0) ||
        (direction === 'right' && dx > 0)

      if (!isCorrectDirection) {
        api.start({ x: 0, y: 0, opacity: 1 })
        return
      }

      const movement = direction === 'left' || direction === 'right' ? mx : my
      const velocity = direction === 'left' || direction === 'right' ? vx : vy

      if (last) {
        if (Math.abs(movement) > threshold || velocity > 1) {
          // Dismiss animation
          const exitY = direction === 'down' ? 500 : direction === 'up' ? -500 : 0
          const exitX = direction === 'right' ? 500 : direction === 'left' ? -500 : 0

          api.start({
            y: exitY,
            x: exitX,
            opacity: 0,
            onRest: onDismiss,
          })
        } else {
          // Spring back
          api.start({ x: 0, y: 0, opacity: 1 })
        }
      } else {
        // Follow finger
        const progress = Math.min(Math.abs(movement) / threshold, 1)
        api.start({
          y: direction === 'down' || direction === 'up' ? my : 0,
          x: direction === 'left' || direction === 'right' ? mx : 0,
          opacity: 1 - progress * 0.5,
          immediate: true,
        })
      }
    },
    {
      filterTaps: true,
      rubberband: true,
    }
  )

  return {
    bind,
    style: { y, x, opacity },
    AnimatedDiv: animated.div,
  }
}

// ==========================================
// PULL TO REFRESH HOOK
// ==========================================
interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [{ y, rotate }, api] = useSpring(() => ({
    y: 0,
    rotate: 0,
    config: config.stiff,
  }))

  const bind = useDrag(
    async ({ movement: [, my], last, cancel, direction: [, dy] }) => {
      // Only allow pull down
      if (dy < 0 || isRefreshing) {
        cancel()
        return
      }

      const pull = Math.min(my, maxPull)

      if (last) {
        if (pull >= threshold) {
          setIsRefreshing(true)
          api.start({ y: 60, rotate: 0 })

          try {
            await onRefresh()
          } finally {
            setIsRefreshing(false)
            api.start({ y: 0, rotate: 0 })
          }
        } else {
          api.start({ y: 0, rotate: 0 })
        }
      } else {
        const progress = pull / threshold
        api.start({
          y: pull * 0.5,
          rotate: progress * 360,
          immediate: true,
        })
      }
    },
    {
      axis: 'y',
      bounds: { top: 0 },
      rubberband: true,
      filterTaps: true,
    }
  )

  return {
    bind,
    style: { y },
    spinnerStyle: { rotate },
    isRefreshing,
    AnimatedDiv: animated.div,
  }
}

// ==========================================
// DOUBLE TAP HOOK
// ==========================================
interface UseDoubleTapOptions {
  onDoubleTap: (event: React.MouseEvent | React.TouchEvent) => void
  onSingleTap?: (event: React.MouseEvent | React.TouchEvent) => void
  delay?: number
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = gestureConfig.doubleTapWindow,
}: UseDoubleTapOptions) {
  const lastTap = useRef<number>(0)
  const tapTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleTap = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now()
      const timeDiff = now - lastTap.current

      if (timeDiff < delay && timeDiff > 0) {
        // Double tap detected
        if (tapTimeout.current) {
          clearTimeout(tapTimeout.current)
          tapTimeout.current = null
        }
        onDoubleTap(event)
      } else {
        // Potential single tap - wait to see if double tap follows
        if (onSingleTap) {
          tapTimeout.current = setTimeout(() => {
            onSingleTap(event)
          }, delay)
        }
      }

      lastTap.current = now
    },
    [delay, onDoubleTap, onSingleTap]
  )

  return {
    onClick: handleTap,
    onTouchEnd: handleTap,
  }
}

// ==========================================
// LONG PRESS HOOK
// ==========================================
interface UseLongPressOptions {
  onLongPress: (event: React.MouseEvent | React.TouchEvent) => void
  onPress?: (event: React.MouseEvent | React.TouchEvent) => void
  delay?: number
}

export function useLongPress({
  onLongPress,
  onPress,
  delay = gestureConfig.longPressDelay,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      isLongPress.current = false
      timerRef.current = setTimeout(() => {
        isLongPress.current = true
        onLongPress(event)
      }, delay)
    },
    [delay, onLongPress]
  )

  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      if (shouldTriggerClick && !isLongPress.current && onPress) {
        onPress(event)
      }
    },
    [onPress]
  )

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchStart: start,
    onTouchEnd: clear,
  }
}

// Re-export animated from react-spring for convenience
export { animated, useSpring, config } from '@react-spring/web'
