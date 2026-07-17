export const FEED_COVER_ASPECT_RATIO = 4 / 3

export interface CoverCropFrame {
  leftPercent: number
  topPercent: number
  widthPercent: number
  heightPercent: number
}

export interface CoverObjectPosition {
  xOffset: number
  yOffset: number
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

/**
 * Returns the part of a source image that CSS `object-fit: cover` will show.
 * The result is expressed against the full source image, so it can be drawn as
 * an accurate crop box over an uncropped preview.
 */
export function getCoverCropFrame(
  imageWidth: number,
  imageHeight: number,
  xOffset: number,
  yOffset: number,
  targetAspectRatio = FEED_COVER_ASPECT_RATIO,
): CoverCropFrame {
  if (imageWidth <= 0 || imageHeight <= 0 || targetAspectRatio <= 0) {
    return { leftPercent: 0, topPercent: 0, widthPercent: 100, heightPercent: 100 }
  }

  const imageAspectRatio = imageWidth / imageHeight
  const safeX = clampPercent(xOffset)
  const safeY = clampPercent(yOffset)

  if (imageAspectRatio > targetAspectRatio) {
    const widthPercent = (targetAspectRatio / imageAspectRatio) * 100
    return {
      leftPercent: ((100 - widthPercent) * safeX) / 100,
      topPercent: 0,
      widthPercent,
      heightPercent: 100,
    }
  }

  if (imageAspectRatio < targetAspectRatio) {
    const heightPercent = (imageAspectRatio / targetAspectRatio) * 100
    return {
      leftPercent: 0,
      topPercent: ((100 - heightPercent) * safeY) / 100,
      widthPercent: 100,
      heightPercent,
    }
  }

  return { leftPercent: 0, topPercent: 0, widthPercent: 100, heightPercent: 100 }
}

/** Converts a dragged crop-box centre back into CSS object-position values. */
export function getCoverPositionFromFrameCenter(
  imageWidth: number,
  imageHeight: number,
  centerXPercent: number,
  centerYPercent: number,
  targetAspectRatio = FEED_COVER_ASPECT_RATIO,
): CoverObjectPosition {
  const frame = getCoverCropFrame(
    imageWidth,
    imageHeight,
    50,
    50,
    targetAspectRatio,
  )

  if (frame.widthPercent < 100) {
    const availableWidth = 100 - frame.widthPercent
    return {
      xOffset: clampPercent(
        ((centerXPercent - frame.widthPercent / 2) / availableWidth) * 100,
      ),
      yOffset: 50,
    }
  }

  if (frame.heightPercent < 100) {
    const availableHeight = 100 - frame.heightPercent
    return {
      xOffset: 50,
      yOffset: clampPercent(
        ((centerYPercent - frame.heightPercent / 2) / availableHeight) * 100,
      ),
    }
  }

  return { xOffset: 50, yOffset: 50 }
}
